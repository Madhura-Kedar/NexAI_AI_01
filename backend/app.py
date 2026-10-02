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

    # ── New conversation ─────────────────────────────────────────────────────
    if not conversation_id:
        cursor = conn.execute("INSERT INTO orders (status) VALUES ('pending')")
        order_id = cursor.lastrowid
        cursor2  = conn.execute(
            "INSERT INTO conversations (order_id, state, pending_items, confirmed_items) "
            "VALUES (?, 'active', '[]', '[]')",
            (order_id,),
        )
        conversation_id = cursor2.lastrowid
        conn.commit()

    conv      = dict(conn.execute(
        "SELECT * FROM conversations WHERE id=?", (conversation_id,)
    ).fetchone())
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

    for result in match_results:
        status = result["status"]
        if status == "matched":
            p = result["product"]
            confirmed.append({
                "product_id":     p["id"],
                "product_name":   p["name"],
                "qty":            result["item"].get("qty") or 1,
                "unit":           result["item"].get("unit") or p["unit"],
                "price_snapshot": p["price"],
                "confidence":     result["score"],
            })
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
        for item in confirmed:
            conn.execute(
                "INSERT INTO order_items "
                "(order_id, product_id, product_name, qty, unit, price_snapshot, subtotal) "
                "VALUES (?,?,?,?,?,?,?)",
                (
                    order_id, item["product_id"], item["product_name"],
                    item["qty"], item["unit"], item["price_snapshot"],
                    item["qty"] * item["price_snapshot"],
                ),
            )
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
    conv  = dict(conn.execute(
        "SELECT * FROM conversations WHERE id=?", (conversation_id,)
    ).fetchone())

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

    for res in resolved:
        chosen = res.get("chosen", "")
        match  = rprocess.extractOne(chosen, pool, scorer=rfuzz.WRatio)
        if match and match[1] > 60:
            product = next(p for p in products if p["id"] == match[2])
            confirmed.append({
                "product_id":     product["id"],
                "product_name":   product["name"],
                "qty":            res.get("qty") or 1,
                "unit":           res.get("unit") or product["unit"],
                "price_snapshot": product["price"],
                "confidence":     match[1],
            })

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

        for item in confirmed:
            conn.execute(
                "INSERT OR IGNORE INTO order_items "
                "(order_id, product_id, product_name, qty, unit, price_snapshot, subtotal) "
                "VALUES (?,?,?,?,?,?,?)",
                (
                    order_id, item["product_id"], item["product_name"],
                    item["qty"], item["unit"], item["price_snapshot"],
                    item["qty"] * item["price_snapshot"],
                ),
            )
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


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)