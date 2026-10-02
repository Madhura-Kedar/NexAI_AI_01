from flask import Flask, request, jsonify
from flask_cors import CORS
import json, re
from db import get_db, init_db
from parser import (
    parse_order, detect_cancel, detect_off_topic, get_off_topic_reply,
    generate_clarification, resolve_reply, generate_delivery_note,
)
from transliterate import transliterate_hindi_to_roman
from matcher import run_matching
from billing import generate_bill

app = Flask(__name__)
CORS(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_HINGLISH_SYNONYMS = {
    "doodh": "milk", "tel": "oil", "chawal": "rice", "cheeni": "sugar",
    "chini": "sugar", "namak": "salt", "haldi": "turmeric", "mirch": "chilli",
    "dhaniya": "coriander", "jeera": "cumin", "makhan": "butter", "dahi": "curd",
    "chai": "tea", "patti": "tea", "biscuit": "biscuits", "sabun": "soap"
}

_STOCK_STOP_WORDS = {
    "how", "much", "many", "is", "are", "there", "any", "left", "remaining",
    "in", "stock", "quantity", "qty", "inventory", "available", "availability",
    "kitna", "kitni", "kitne", "bacha", "bachi", "bache", "baki", "hai", "hain",
    "hoga", "pada", "kya", "or", "of", "the", "a", "an", "do", "you", "have",
    "aapke", "apke", "paas", "batao", "bataiye", "check", "karo", "kuch", "koi",
    "mil", "jayega", "milega", "please", "bhi", "sirf", "mujhe", "chahiye",
    "ka", "ki", "ke", "ko", "se", "me", "mein", "par", "pe", "packet", "packets",
    "pack", "kg", "g", "gm", "gram", "l", "ltr", "litre", "ml", "items", "item"
}

_STOCK_EXPLICIT_KW = [
    "stock", "inventory", "available", "availability",
    "mil jayega", "milega kya", "kya milega", "kya available", "maal bacha",
]

_STOCK_QUESTION_PATTERNS = [
    r"how\s+(much|many)\b.*?\b(left|there|available|remaining|in\s+stock|have)",
    r"\b(quantity|qty)\b.*?\b(left|available|hai|bacha|bachi|bache|baki|there|batao|check|kitna|kitni|kitne|or\s+there)",
    r"\b(kitna|kitni|kitne)\b.*?\b(bacha|bachi|bache|baki|hai|pada|stock|quantity|left|available)",
    r"\b(is|are)\s+there\b.*?\b(any|left|available)",
    r"\b(do\s+you\s+have|kya\s+apke\s+paas|kya\s+aapke\s+paas)\b",
    r"\b(kuch|koi)\b.*?\b(bacha|bachi|bache|baki|available)\b",
    r"\b(left|remaining)\s+(hai|kya|or\s+there)\b",
    r"\b(bacha|bachi|bache|baki)\s+(hai|kya|hoga)\b",
    r"\bstock\s+(batao|dikhao|check|karo|bataiye|hai|kya|kitna|left)\b",
    r"\b(batao|check)\s+stock\b",
]

def _is_stock_query(message):
    msg = message.lower().strip()
    if any(kw in msg for kw in _STOCK_EXPLICIT_KW):
        return True
    for pat in _STOCK_QUESTION_PATTERNS:
        if re.search(pat, msg):
            return True
    return False


def _extract_stock_keywords(message):
    words = re.findall(r'[a-zA-Z0-9]+', message.lower())
    meaningful = []
    for w in words:
        if w in _HINGLISH_SYNONYMS:
            meaningful.append(_HINGLISH_SYNONYMS[w])
        elif w not in _STOCK_STOP_WORDS and len(w) > 1:
            meaningful.append(w)
    return meaningful


def _handle_stock_query(conn, message, conversation_id):
    """Return stock info for the item mentioned in the query.
    Preserves existing conversation state (confirmed/pending) if present."""
    # Load existing conversation state if it exists
    existing_confirmed = []
    existing_pending = []
    existing_bill = None
    existing_state = "active"
    if conversation_id:
        conv_row = conn.execute(
            "SELECT confirmed_items, pending_items FROM conversations WHERE id=?",
            (conversation_id,)
        ).fetchone()
        if conv_row:
            existing_confirmed = json.loads(conv_row["confirmed_items"] or "[]")
            existing_pending = json.loads(conv_row["pending_items"] or "[]")
            if existing_confirmed:
                existing_bill = generate_bill(existing_confirmed)
            existing_state = "awaiting_clarification" if existing_pending else (
                "confirmed" if existing_confirmed else "active"
            )

    keywords = _extract_stock_keywords(message)
    products = conn.execute(
        "SELECT id, name, category, brand, stock, unit, price FROM products ORDER BY name"
    ).fetchall()

    scored_matches = []
    if keywords:
        for p in products:
            p = dict(p)
            text = f"{p['name']} {p['category']} {p.get('brand') or ''}".lower()
            text_words = set(re.findall(r'[a-zA-Z0-9]+', text))
            
            # Count exact word matches
            match_count = sum(1 for kw in keywords if kw in text_words or any(kw in tw for tw in text_words))
            if match_count > 0:
                scored_matches.append((match_count, p))
        
        # Sort by match count descending
        scored_matches.sort(key=lambda x: x[0], reverse=True)

    if scored_matches:
        top_matches = [p for _, p in scored_matches[:6]]
        lines = ["📦 **Stock Availability:**"]
        for p in top_matches:
            if p["stock"] == 0:
                lines.append(f"❌ **{p['name']}**: Out of stock (0 available)")
            elif p["stock"] <= 5:
                lines.append(f"⚠️ **{p['name']}**: Sirf {p['stock']} packet bacha hai (Low Stock)")
            else:
                lines.append(f"✅ **{p['name']}**: {p['stock']} packet(s) available (Rs{p['price']})")
        
        if existing_confirmed:
            lines.append(f"\n💡 *Current order mein {len(existing_confirmed)} item(s) confirmed hain.*")
        reply = "\n".join(lines)
    else:
        # General stock overview
        out_of_stock = [dict(p) for p in products if dict(p)["stock"] == 0]
        low_stock = [dict(p) for p in products if 0 < dict(p)["stock"] <= 5]
        
        lines = ["📊 **Store Inventory Status:**"]
        if out_of_stock:
            lines.append("❌ **Out of stock:** " + ", ".join(p['name'] for p in out_of_stock[:4]))
        if low_stock:
            lines.append("⚠️ **Low stock:** " + ", ".join(f"{p['name']} ({p['stock']} left)" for p in low_stock[:4]))
        
        lines.append("\n✅ Baaki sabhi grocery items (Atta, Rice, Dal, Oil, Dairy, Spices, Snacks) fresh stock mein available hain!")
        lines.append("💡 *Kisi item ka stock janne ke liye puchiye, jaise: 'Atta kitna bacha hai?' ya 'Fortune Oil available hai?'*")
        if existing_confirmed:
            lines.append(f"\n💡 *Current order mein {len(existing_confirmed)} item(s) confirmed hain.*")
        reply = "\n".join(lines)

    conn.close()
    return jsonify({
        "conversation_id": conversation_id,
        "confirmed": existing_confirmed,
        "pending": existing_pending,
        "bill_preview": existing_bill,
        "state": existing_state,
        "bot_reply": reply,
    })


def _sync_order_items_and_stock(conn, order_id, confirmed_items):
    """Synchronize confirmed items with order_items table and accurately update product stock."""
    recorded_rows = conn.execute(
        "SELECT product_id, qty FROM order_items WHERE order_id=?", (order_id,)
    ).fetchall()
    recorded_map = {row["product_id"]: row["qty"] for row in recorded_rows}
    
    current_map = {}
    for item in confirmed_items:
        pid = item["product_id"]
        current_map[pid] = current_map.get(pid, 0) + item.get("qty", 1)
        
    for item in confirmed_items:
        pid = item["product_id"]
        qty = item.get("qty", 1)
        prev_qty = recorded_map.get(pid, 0)
        
        if pid not in recorded_map:
            conn.execute(
                "INSERT INTO order_items "
                "(order_id, product_id, product_name, qty, unit, price_snapshot, subtotal) "
                "VALUES (?,?,?,?,?,?,?)",
                (
                    order_id, pid, item["product_name"],
                    qty, item.get("unit", "packet(s)"), item["price_snapshot"],
                    qty * item["price_snapshot"]
                )
            )
            conn.execute("UPDATE products SET stock = MAX(0, stock - ?) WHERE id=?", (qty, pid))
            recorded_map[pid] = qty
        elif qty != prev_qty:
            diff = qty - prev_qty
            conn.execute(
                "UPDATE order_items SET qty=?, subtotal=? WHERE order_id=? AND product_id=?",
                (qty, qty * item["price_snapshot"], order_id, pid)
            )
            conn.execute("UPDATE products SET stock = MAX(0, stock - ?) WHERE id=?", (diff, pid))
            recorded_map[pid] = qty

    for pid, prev_qty in list(recorded_map.items()):
        if pid not in current_map:
            conn.execute("DELETE FROM order_items WHERE order_id=? AND product_id=?", (order_id, pid))
            conn.execute("UPDATE products SET stock = stock + ? WHERE id=?", (prev_qty, pid))


def _extract_pack_size(product_name):
    """Extract (qty, unit) from product name like 'Aashirvaad Atta 5kg' → (5.0, 'kg')."""
    import re as _re
    m = _re.search(r"(\d+(?:\.\d+)?)\s*(kg|g|ml|L)\b", product_name, _re.IGNORECASE)
    if m:
        qty = float(m.group(1))
        raw_unit = m.group(2)
        unit = "L" if raw_unit.upper() == "L" else raw_unit.lower()
        return qty, unit
    return None, None


def extract_timing(message):
    patterns = [
        "kal subah", "aaj shaam", "abhi", "jaldi", "kal tak",
        "subah tak", "shaam tak", "tonight", "tomorrow",
    ]
    for p in patterns:
        if p in message.lower():
            return p
    return None


def _make_pending_entry(result):
    """Normalise any non-matched result into a pending-item dict."""
    status = result["status"]
    item   = result["item"]
    reason = result.get("reason", "")

    entry = {
        "item":       item["item"],
        "raw":        item["raw"],
        "candidates": [
            {"name": c["name"], "id": c["id"], "price": c["price"]}
            for c in result.get("candidates", [])
        ],
        "reason": reason,
    }

    if status == "out_of_stock":
        p = result.get("product") or {}
        entry["out_of_stock"]  = True
        entry["product"]       = p.get("name", "Unknown")
        entry["alternatives"]  = result.get("alternatives", [])

    return entry


def _handle_cancel(conn, conv, conversation_id, confirmed, pending, cancel_info):
    """Process a cancel request and return a jsonify() response."""
    order_id = conv["order_id"]

    if cancel_info.get("cancel_all"):
        # Restore stock for any confirmed items in this order
        recorded_items = conn.execute(
            "SELECT product_id, qty FROM order_items WHERE order_id=?", (order_id,)
        ).fetchall()
        for it in recorded_items:
            conn.execute(
                "UPDATE products SET stock = stock + ? WHERE id=?",
                (it["qty"], it["product_id"])
            )

        conn.execute(
            "UPDATE conversations SET confirmed_items='[]', pending_items='[]' WHERE id=?",
            (conversation_id,),
        )
        conn.execute(
            "UPDATE orders SET status='cancelled' WHERE id=?", (order_id,)
        )
        conn.commit()
        conn.close()
        return jsonify({
            "conversation_id": conversation_id,
            "confirmed": [],
            "pending":   [],
            "bill_preview": None,
            "state":    "active",
            "bot_reply": "Theek hai! Aapka poora order cancel ho gaya. "
                         "Kuch aur mangana ho toh batayein.",
        })

    # Cancel specific item
    cancel_item = (cancel_info.get("cancel_item") or "").lower().strip()
    if cancel_item and confirmed:
        new_confirmed = []
        removed = None
        for item in confirmed:
            if (
                cancel_item in item["product_name"].lower()
                or cancel_item in item.get("unit", "").lower()
            ):
                removed = item
            else:
                new_confirmed.append(item)

        if removed:
            # Restore stock for removed item
            conn.execute(
                "UPDATE products SET stock = stock + ? WHERE id=?",
                (removed["qty"], removed["product_id"])
            )
            conn.execute(
                "DELETE FROM order_items WHERE order_id=? AND product_id=?",
                (order_id, removed["product_id"])
            )
            conn.execute(
                "UPDATE conversations SET confirmed_items=? WHERE id=?",
                (json.dumps(new_confirmed), conversation_id),
            )
            conn.commit()
            bill = generate_bill(new_confirmed) if new_confirmed else None
            conn.close()
            state = "awaiting_clarification" if pending else (
                "confirmed" if new_confirmed else "active"
            )
            return jsonify({
                "conversation_id": conversation_id,
                "confirmed":   new_confirmed,
                "pending":     pending,
                "bill_preview": bill,
                "state":       state,
                "bot_reply":   f"'{removed['product_name']}' order se hata diya. "
                               f"Kuch aur chahiye?",
            })

    # Item not found in order
    conn.close()
    bill = generate_bill(confirmed) if confirmed else None
    return jsonify({
        "conversation_id": conversation_id,
        "confirmed":   confirmed,
        "pending":     pending,
        "bill_preview": bill,
        "state": "awaiting_clarification" if pending else (
            "confirmed" if confirmed else "active"
        ),
        "bot_reply": (
            f"Sorry, '{cancel_item}' aapke current order mein nahi mila."
            if cancel_item else
            "Kya cancel karna hai? Item ka naam batayein."
        ),
    })


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/api/message", methods=["POST"])
def handle_message():
    data            = request.get_json()
    raw_message     = data.get("message", "").strip()
    message         = transliterate_hindi_to_roman(raw_message)
    conversation_id = data.get("conversation_id")

    if not message:
        return jsonify({"error": "Empty message"}), 400

    conn = get_db()

    # ── Stock query check (before any parsing) ───────────────────────────────
    if _is_stock_query(message):
        return _handle_stock_query(conn, message, data.get("conversation_id"))

    conv_row = conn.execute(
        "SELECT * FROM conversations WHERE id=?", (conversation_id,)
    ).fetchone() if conversation_id else None

    if not conv_row:
        cursor = conn.execute("INSERT INTO orders (status) VALUES ('pending')")
        order_id = cursor.lastrowid
        cursor2  = conn.execute(
            "INSERT INTO conversations (order_id, state, pending_items, confirmed_items) "
            "VALUES (?, 'active', '[]', '[]')",
            (order_id,),
        )
        conversation_id = cursor2.lastrowid
        conn.commit()
        conv_row = conn.execute(
            "SELECT * FROM conversations WHERE id=?", (conversation_id,)
        ).fetchone()

    conv      = dict(conv_row)
    confirmed = json.loads(conv["confirmed_items"])
    pending   = json.loads(conv["pending_items"])

    # ── Cancel intent check (before any parsing) ─────────────────────────────
    cancel_info = detect_cancel(message)
    if cancel_info.get("is_cancel"):
        return _handle_cancel(conn, conv, conversation_id, confirmed, pending, cancel_info)

    # ── Off-topic / Non-order check (quota safe, instant) ────────────────────
    if detect_off_topic(message):
        conn.close()
        bill = generate_bill(confirmed) if confirmed else None
        state = "awaiting_clarification" if pending else ("confirmed" if confirmed else "active")
        return jsonify({
            "conversation_id": conversation_id,
            "confirmed": confirmed,
            "pending": pending,
            "not_found": [],
            "bill_preview": bill,
            "state": state,
            "bot_reply": get_off_topic_reply(),
        })

    # ── Parse + match ────────────────────────────────────────────────────────
    try:
        parsed = parse_order(message)
    except RuntimeError as e:
        conn.close()
        return jsonify({
            "conversation_id": conversation_id,
            "confirmed": confirmed, "pending": pending,
            "bill_preview": generate_bill(confirmed) if confirmed else None,
            "state": "awaiting_clarification" if pending else ("confirmed" if confirmed else "active"),
            "bot_reply": str(e),
        })
    parsed_items = parsed.get("items", [])
    match_results = run_matching(parsed_items)

    ambiguous = []
    not_found = []
    # Track IDs already confirmed BEFORE this turn to avoid duplicate deduction
    prev_confirmed_ids = {item["product_id"] for item in confirmed}
    newly_confirmed = []

    for result in match_results:
        status = result["status"]
        if status == "matched":
            p = result["product"]
            parsed_qty  = result["item"].get("qty")
            parsed_unit = result["item"].get("unit") or p["unit"]
            # qty = number of PACKETS ordered, not the weight/volume.
            # The product name already encodes the size (e.g. '5kg').
            # So if user says '2 Aashirvaad Atta 5kg', qty=2 (packets).
            # If user says '1 Aashirvaad Atta 5kg', qty=1.
            # The parser may return qty=5 unit=kg (the pack size) when user
            # just says 'Aashirvaad Atta 5kg' without a separate count —
            # in that case treat it as 1 packet.
            prod_qty, prod_unit = _extract_pack_size(p["name"])
            if prod_qty is not None and parsed_qty == prod_qty and parsed_unit == prod_unit:
                # Parser echoed the pack size as qty — user ordered 1 packet
                order_qty = 1
            else:
                order_qty = parsed_qty or 1

            entry = {
                "product_id":     p["id"],
                "product_name":   p["name"],
                "qty":            order_qty,
                "unit":           "packet(s)",
                "price_snapshot": p["price"],
                "confidence":     result["score"],
            }
            confirmed.append(entry)
            if p["id"] not in prev_confirmed_ids:
                newly_confirmed.append(entry)
        elif status in ("ambiguous", "ambiguous_qty", "size_mismatch", "needs_qty"):
            ambiguous.append(_make_pending_entry(result))
        elif status == "out_of_stock":
            ambiguous.append(_make_pending_entry(result))
        elif status == "not_found":
            not_found.append(result["item"]["raw"])

    timing = extract_timing(message)

    conn.execute(
        "UPDATE conversations SET confirmed_items=?, pending_items=? WHERE id=?",
        (json.dumps(confirmed), json.dumps(ambiguous), conversation_id),
    )
    conn.commit()

    bill = generate_bill(confirmed) if confirmed else None

    response = {
        "conversation_id": conversation_id,
        "match_results":   match_results,
        "confirmed":       confirmed,
        "pending":         ambiguous,
        "not_found":       not_found,
        "bill_preview":    bill,
        "state": "awaiting_clarification" if ambiguous else (
            "confirmed" if confirmed else "active"
        ),
    }

    # ── Bot reply ─────────────────────────────────────────────────────────────
    if ambiguous:
        try:
            bot_msg = generate_clarification(
                [{"item": a["item"], "reason": a["reason"]} for a in ambiguous]
            )
        except RuntimeError as e:
            bot_msg = str(e)
        response["bot_reply"] = bot_msg
    elif confirmed:
        note = generate_delivery_note(confirmed, timing, bill["grand_total"])
        response["bot_reply"]    = (
            f"Order confirm ho gaya! Total: Rs{bill['grand_total']}. "
            f"{bill['item_count']} item(s) confirmed."
        )
        response["delivery_note"] = note
        response["final_bill"]    = bill

        order_id = conv["order_id"]
        _sync_order_items_and_stock(conn, order_id, confirmed)
        conn.execute(
            "UPDATE orders SET status='confirmed', total=? WHERE id=?",
            (bill["grand_total"], order_id),
        )
        conn.commit()
    else:
        if not_found:
            response["bot_reply"] = (
                f"Sorry, yeh items hamare kirana store mein nahi hain: "
                f"{', '.join(not_found)}. Hum sirf grocery samaan deliver karte hain. Kuch aur chahiye?"
            )
        else:
            response["bot_reply"] = get_off_topic_reply()

    conn.close()
    return jsonify(response)


@app.route("/api/reply", methods=["POST"])
def handle_reply():
    data            = request.get_json()
    conversation_id = data.get("conversation_id")
    raw_reply       = data.get("message", "").strip()
    reply           = transliterate_hindi_to_roman(raw_reply)

    conn  = get_db()

    # ── Stock query check (works even during clarification) ──────────────────
    if _is_stock_query(reply):
        return _handle_stock_query(conn, reply, conversation_id)

    conv_row = conn.execute(
        "SELECT * FROM conversations WHERE id=?", (conversation_id,)
    ).fetchone() if conversation_id else None

    if not conv_row:
        conn.close()
        return jsonify({
            "error": "Conversation not found",
            "bot_reply": "Session reset ho gaya hai. Kripya naya message bhejein."
        }), 404

    conv  = dict(conv_row)

    pending   = json.loads(conv["pending_items"])
    confirmed = json.loads(conv["confirmed_items"])

    # ── Cancel intent check ──────────────────────────────────────────────────
    cancel_info = detect_cancel(reply)
    if cancel_info.get("is_cancel"):
        return _handle_cancel(conn, conv, conversation_id, confirmed, pending, cancel_info)

    # ── Off-topic check in clarification flow ────────────────────────────────
    if detect_off_topic(reply):
        conn.close()
        bill = generate_bill(confirmed) if confirmed else None
        clarify_hint = ""
        try:
            clarify_hint = generate_clarification(
                [{"item": a["item"], "reason": a.get("reason", "Still unclear")}
                 for a in pending]
            )
        except Exception:
            pass
        off_msg = get_off_topic_reply()
        bot_reply = f"{off_msg}\n\nPehle yeh batayein: {clarify_hint}" if clarify_hint else off_msg
        return jsonify({
            "conversation_id": conversation_id,
            "confirmed": confirmed,
            "pending": pending,
            "bill_preview": bill,
            "state": "awaiting_clarification" if pending else ("confirmed" if confirmed else "active"),
            "bot_reply": bot_reply,
        })

    # ── Resolve clarification with Gemini ────────────────────────────────────
    resolved_data   = resolve_reply(pending, reply)
    resolved        = resolved_data.get("resolved", [])
    still_unresolved = resolved_data.get("unresolved", [])

    # Match resolved choices back to actual products via fuzzy search
    from rapidfuzz import process as rprocess, fuzz as rfuzz
    products_raw = conn.execute(
        "SELECT * FROM products WHERE stock > 0"
    ).fetchall()
    products = [dict(p) for p in products_raw]
    pool     = {p["id"]: p["name"] for p in products}

    # Track which products were already confirmed before this reply
    prev_confirmed_ids = {item["product_id"] for item in confirmed}
    newly_confirmed = []

    for res in resolved:
        chosen = res.get("chosen", "")
        match  = rprocess.extractOne(chosen, pool, scorer=rfuzz.WRatio)
        if match and match[1] > 60:
            product = next(p for p in products if p["id"] == match[2])
            order_qty = res.get("qty") or 1
            entry = {
                "product_id":     product["id"],
                "product_name":   product["name"],
                "qty":            order_qty,
                "unit":           "packet(s)",
                "price_snapshot": product["price"],
                "confidence":     match[1],
            }
            confirmed.append(entry)
            if product["id"] not in prev_confirmed_ids:
                newly_confirmed.append(entry)

    remaining_pending = [p for p in pending if p["item"] in still_unresolved]

    conn.execute(
        "UPDATE conversations SET confirmed_items=?, pending_items=? WHERE id=?",
        (json.dumps(confirmed), json.dumps(remaining_pending), conversation_id),
    )
    conn.commit()

    bill     = generate_bill(confirmed) if confirmed else None
    order_id = conv["order_id"]
    timing   = extract_timing(reply)

    response = {
        "conversation_id": conversation_id,
        "confirmed":       confirmed,
        "pending":         remaining_pending,
        "bill_preview":    bill,
        "state": "awaiting_clarification" if remaining_pending else (
            "confirmed" if confirmed else "active"
        ),
    }

    if remaining_pending:
        response["bot_reply"] = generate_clarification(
            [{"item": a["item"], "reason": a.get("reason", "Still unclear")}
             for a in remaining_pending]
        )
    elif confirmed:
        note = generate_delivery_note(confirmed, timing, bill["grand_total"])
        response["bot_reply"]     = (
            f"Order pakka! Total: Rs{bill['grand_total']}. "
            f"{bill['item_count']} item(s) confirmed."
        )
        response["delivery_note"] = note
        response["final_bill"]    = bill

        _sync_order_items_and_stock(conn, order_id, confirmed)
        conn.execute(
            "UPDATE orders SET status='confirmed', total=? WHERE id=?",
            (bill["grand_total"], order_id),
        )
        conn.commit()
    else:
        response["bot_reply"] = (
            "Kuch items resolve nahi hue. "
            "Kripya specify karein kya chahiye."
        )

    conn.close()
    return jsonify(response)


@app.route("/api/products", methods=["GET"])
def get_products():
    conn     = get_db()
    products = conn.execute(
        "SELECT * FROM products ORDER BY category, name"
    ).fetchall()
    conn.close()
    return jsonify([dict(p) for p in products])


@app.route("/api/orders", methods=["GET"])
def get_orders():
    conn = get_db()
    orders_rows = conn.execute(
        "SELECT * FROM orders ORDER BY id DESC LIMIT 25"
    ).fetchall()
    results = []
    for o in orders_rows:
        order_dict = dict(o)
        items = conn.execute(
            "SELECT * FROM order_items WHERE order_id=?", (order_dict["id"],)
        ).fetchall()
        order_dict["items"] = [dict(i) for i in items]
        results.append(order_dict)
    conn.close()
    return jsonify(results)


@app.route("/api/conversation/<int:conversation_id>/messages", methods=["POST"])
def save_messages(conversation_id):
    """Save chat messages for a conversation."""
    data = request.get_json()
    messages = data.get("messages", [])
    conn = get_db()
    conn.execute(
        "UPDATE conversations SET chat_messages=? WHERE id=?",
        (json.dumps(messages, ensure_ascii=False), conversation_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/conversation/<int:conversation_id>/messages", methods=["GET"])
def get_messages(conversation_id):
    """Retrieve chat messages for a conversation."""
    conn = get_db()
    row = conn.execute(
        "SELECT chat_messages FROM conversations WHERE id=?", (conversation_id,)
    ).fetchone()
    conn.close()
    if not row:
        return jsonify([]), 404
    return jsonify(json.loads(row["chat_messages"] or "[]"))



@app.route('/api/conversation/by-order/<int:order_id>/messages', methods=['GET'])
def get_messages_by_order(order_id):
    conn = get_db()
    row = conn.execute(
        'SELECT chat_messages FROM conversations WHERE order_id=? ORDER BY id DESC LIMIT 1',
        (order_id,)
    ).fetchone()
    conn.close()
    if not row:
        return jsonify([]), 404
    return jsonify(json.loads(row['chat_messages'] or '[]'))


@app.route("/api/orders/<int:order_id>/customer", methods=["POST"])
def update_order_customer(order_id):
    """Save/update customer details for an order."""
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()
    address = data.get("address", "").strip()

    conn = get_db()
    conn.execute(
        "UPDATE orders SET customer_name=?, customer_phone=?, customer_address=? WHERE id=?",
        (name, phone, address, order_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "message": "Customer details saved successfully"})


@app.route("/api/orders/<int:order_id>/status", methods=["POST"])
def update_order_status(order_id):
    """Update order status (e.g. pending, confirmed, delivered, cancelled)."""
    data = request.get_json() or {}
    status = data.get("status", "confirmed").strip()
    conn = get_db()
    conn.execute("UPDATE orders SET status=? WHERE id=?", (status, order_id))
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "status": status})


@app.route("/api/shopkeeper/stats", methods=["GET"])
def get_shopkeeper_stats():
    """Calculate revenue, order counts, and customer statistics for the dashboard."""
    conn = get_db()
    total_rev = conn.execute(
        "SELECT COALESCE(SUM(total), 0) as rev FROM orders WHERE status != 'cancelled'"
    ).fetchone()["rev"]
    total_orders = conn.execute("SELECT COUNT(*) as count FROM orders").fetchone()["count"]
    confirmed_orders = conn.execute(
        "SELECT COUNT(*) as count FROM orders WHERE status IN ('confirmed', 'delivered')"
    ).fetchone()["count"]

    today_stats = conn.execute(
        "SELECT COALESCE(SUM(total), 0) as rev, COUNT(*) as count FROM orders WHERE DATE(created_at) = DATE('now', 'localtime') AND status != 'cancelled'"
    ).fetchone()

    unique_cust = conn.execute(
        "SELECT COUNT(DISTINCT CASE WHEN customer_phone != '' THEN customer_phone WHEN customer_name != '' THEN customer_name END) as cust_count FROM orders WHERE customer_name != '' OR customer_phone != ''"
    ).fetchone()["cust_count"]

    conn.close()
    return jsonify({
        "total_revenue": round(total_rev, 2),
        "total_orders": total_orders,
        "confirmed_orders": confirmed_orders,
        "today_revenue": round(today_stats["rev"], 2),
        "today_orders": today_stats["count"],
        "unique_customers": unique_cust or 0
    })


@app.route("/api/store", methods=["GET"])
def get_store_settings():
    """Retrieve store profile and shopkeeper details."""
    conn = get_db()
    row = conn.execute("SELECT * FROM store_settings WHERE id=1").fetchone()
    conn.close()
    if not row:
        return jsonify({
            "store_name": "Apna Kirana Store",
            "owner_name": "Ramesh Kumar",
            "phone": "+91 98765 43210",
            "address": "Main Market Road, City Centre, Near Clock Tower",
            "upi_id": "apnakirana@upi",
            "gstin": "27AABCS1429B1Z",
            "opening_hours": "8:00 AM - 10:00 PM"
        })
    return jsonify(dict(row))


@app.route("/api/store", methods=["POST"])
def update_store_settings():
    """Update store and shopkeeper details."""
    data = request.get_json() or {}
    store_name = data.get("store_name", "Apna Kirana Store").strip()
    owner_name = data.get("owner_name", "Ramesh Kumar").strip()
    phone = data.get("phone", "+91 98765 43210").strip()
    address = data.get("address", "").strip()
    upi_id = data.get("upi_id", "").strip()
    gstin = data.get("gstin", "").strip()
    opening_hours = data.get("opening_hours", "8:00 AM - 10:00 PM").strip()

    conn = get_db()
    conn.execute("""
        UPDATE store_settings
        SET store_name=?, owner_name=?, phone=?, address=?, upi_id=?, gstin=?, opening_hours=?
        WHERE id=1
    """, (store_name, owner_name, phone, address, upi_id, gstin, opening_hours))
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "message": "Store details updated successfully"})


@app.route("/api/products", methods=["POST"])
def add_product():
    """Add a new product to inventory."""
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "Product name is required"}), 400

    aliases = data.get("aliases", "").strip() or name.lower()
    brand = data.get("brand", "").strip() or None
    category = data.get("category", "grocery").strip().lower()
    unit = data.get("unit", "packet").strip()
    price = float(data.get("price", 0))
    stock = int(data.get("stock", 0))

    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO products (name, aliases, brand, category, unit, price, stock) VALUES (?,?,?,?,?,?,?)",
        (name, aliases, brand, category, unit, price, stock)
    )
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "id": new_id, "message": f"Product '{name}' added successfully"})


@app.route("/api/products/<int:prod_id>/update", methods=["POST"])
def update_product(prod_id):
    """Update an existing product's stock, price, etc."""
    data = request.get_json() or {}
    conn = get_db()
    current = conn.execute("SELECT * FROM products WHERE id=?", (prod_id,)).fetchone()
    if not current:
        conn.close()
        return jsonify({"error": "Product not found"}), 404

    name = data.get("name", current["name"]).strip()
    price = float(data.get("price", current["price"]))
    stock = int(data.get("stock", current["stock"]))
    category = data.get("category", current["category"]).strip()
    brand = data.get("brand", current["brand"])

    conn.execute(
        "UPDATE products SET name=?, price=?, stock=?, category=?, brand=? WHERE id=?",
        (name, price, stock, category, brand, prod_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "message": f"Product #{prod_id} updated"})


@app.route("/api/products/<int:prod_id>", methods=["DELETE"])
def delete_product(prod_id):
    """Remove a product from inventory."""
    conn = get_db()
    conn.execute("DELETE FROM products WHERE id=?", (prod_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "message": f"Product #{prod_id} deleted"})


@app.route("/api/orders/<int:order_id>", methods=["GET"])
def get_order_details(order_id):
    """Retrieve full order details, customer info, and live status for customer sync."""
    conn = get_db()
    order = conn.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
    if not order:
        conn.close()
        return jsonify({"error": "Order not found"}), 404

    order_dict = dict(order)
    items = conn.execute("SELECT * FROM order_items WHERE order_id=?", (order_id,)).fetchall()
    order_dict["items"] = [dict(i) for i in items]
    conn.close()
    return jsonify(order_dict)


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
