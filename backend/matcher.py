import re
from rapidfuzz import process, fuzz
from db import get_db


# ---------------------------------------------------------------------------
# Unit helpers
# ---------------------------------------------------------------------------

def normalize_unit(u):
    if not u:
        return None
    u = u.strip().lower()
    mapping = {
        "kg": "kg", "kilo": "kg", "kilogram": "kg", "kilograms": "kg",
        "g": "g", "gm": "g", "gram": "g", "grams": "g",
        "l": "L", "litre": "L", "liter": "L", "litres": "L", "liters": "L",
        "ml": "ml", "millilitre": "ml", "milliliter": "ml",
    }
    return mapping.get(u, u)


def to_base_unit(qty, unit):
    """Convert to a common base (g or ml) for numeric comparison."""
    unit = normalize_unit(unit) or unit
    if unit == "kg":
        return qty * 1000, "g"
    elif unit in ("g", "gm"):
        return qty, "g"
    elif unit == "L":
        return qty * 1000, "ml"
    elif unit == "ml":
        return qty, "ml"
    return qty, unit   # unknown unit — compare as-is


def extract_size_from_name(name):
    """Pull (qty, unit) from a product name like 'Aashirvaad Atta 5kg'."""
    m = re.search(r"(\d+(?:\.\d+)?)\s*(kg|g|ml|L)\b", name, re.IGNORECASE)
    if m:
        qty = float(m.group(1))
        raw_unit = m.group(2)
        unit = "L" if raw_unit.upper() == "L" else raw_unit.lower()
        return qty, unit
    return None, None


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def get_all_products():
    conn = get_db()
    rows = conn.execute("SELECT * FROM products").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def find_alternatives(category, exclude_id, limit=3):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM products WHERE category=? AND id!=? AND stock>0 LIMIT ?",
        (category, exclude_id, limit),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Core matching
# ---------------------------------------------------------------------------

def match_item(parsed_item, products):
    item_name = (parsed_item.get("item") or "").lower().strip()
    brand     = (parsed_item.get("brand") or "").strip()
    req_qty   = parsed_item.get("qty")          # None means not specified
    req_unit  = normalize_unit(parsed_item.get("unit") or "")

    # Build fuzzy search pool: product name + aliases
    search_pool = {}
    for p in products:
        combined = f"{p['name']} {p['aliases'] or ''}".lower()
        search_pool[p["id"]] = combined

    raw_results = process.extract(item_name, search_pool, scorer=fuzz.WRatio, limit=12)

    if not raw_results or raw_results[0][1] < 55:
        return {"status": "not_found", "item": parsed_item,
                "score": raw_results[0][1] if raw_results else 0}

    top_score = raw_results[0][1]

    # All candidates above threshold, sorted by score
    all_candidates = [
        next(p for p in products if p["id"] == r[2])
        for r in raw_results if r[1] >= 55
    ]

    # Narrow by brand if specified
    if brand:
        brand_filtered = [
            p for p in all_candidates
            if brand.lower() in (p.get("brand") or "").lower()
            or brand.lower() in p["name"].lower()
        ]
        if brand_filtered:
            all_candidates = brand_filtered

    in_stock = [p for p in all_candidates if p["stock"] > 0]

    # --- Everything is out of stock -----------------------------------------
    if not in_stock:
        top = all_candidates[0]
        alts = find_alternatives(top["category"], top["id"])
        reason = (
            f"'{top['name']}' abhi stock mein nahi hai."
            + (f" Available alternatives: {', '.join(a['name'] for a in alts)}" if alts else " Koi alternative bhi nahi hai.")
        )
        return {
            "status": "out_of_stock",
            "item": parsed_item,
            "product": top,
            "alternatives": alts,
            "score": top_score,
            "reason": reason,
        }

    # --- Vague quantity (thoda, zyada etc.) ---------------------------------
    if parsed_item.get("vague"):
        return {
            "status": "ambiguous_qty",
            "item": parsed_item,
            "candidates": in_stock[:4],
            "score": top_score,
            "reason": f"Kitna chahiye '{parsed_item.get('raw', item_name)}' ke liye? "
                      f"Options: {', '.join(p['name'] + ' (Rs' + str(int(p['price'])) + ')' for p in in_stock[:4])}",
        }

    # --- Size-aware matching (qty + unit both present) ----------------------
    if req_qty is not None and req_unit:
        req_base, req_base_unit = to_base_unit(float(req_qty), req_unit)

        size_matched_all = []
        for p in all_candidates:
            prod_qty, prod_unit = extract_size_from_name(p["name"])
            if prod_qty is not None:
                prod_base, prod_base_unit = to_base_unit(prod_qty, prod_unit)
                if prod_base_unit == req_base_unit and abs(prod_base - req_base) < 0.5:
                    size_matched_all.append(p)

        if size_matched_all:
            size_in_stock = [p for p in size_matched_all if p["stock"] > 0]

            if not size_in_stock:
                # Exact size exists but it's OOS
                oos = size_matched_all[0]
                alts = find_alternatives(oos["category"], oos["id"])
                reason = (
                    f"'{oos['name']}' out of stock hai."
                    + (f" Available: {', '.join(a['name'] for a in alts)}" if alts else "")
                )
                return {
                    "status": "out_of_stock",
                    "item": parsed_item,
                    "product": oos,
                    "alternatives": alts,
                    "score": top_score,
                    "reason": reason,
                }

            # Multiple brands match the exact size → ask which brand
            if len(size_in_stock) > 1:
                return {
                    "status": "ambiguous",
                    "item": parsed_item,
                    "candidates": size_in_stock[:4],
                    "score": top_score,
                    "reason": f"Konsa brand chahiye {req_qty}{req_unit} "
                              f"{item_name} ke liye? "
                              f"Options: {', '.join(p['name'] + ' (Rs' + str(int(p['price'])) + ')' for p in size_in_stock[:4])}",
                }

            return {
                "status": "matched",
                "item": parsed_item,
                "product": size_in_stock[0],
                "score": round(top_score, 1),
            }

        else:
            # Requested size does not exist in catalogue
            sizes_available = [
                p["name"] + " (Rs" + str(int(p["price"])) + ")"
                for p in in_stock[:5]
            ]
            reason = (
                f"{int(req_qty) if req_qty == int(req_qty) else req_qty}"
                f"{req_unit} {item_name} available nahi hai. "
                f"Available sizes: {', '.join(sizes_available)}"
            )
            return {
                "status": "size_mismatch",
                "item": parsed_item,
                "candidates": in_stock[:4],
                "score": top_score,
                "reason": reason,
            }

    # --- Qty given but no unit (e.g. "2 butter") ----------------------------
    if req_qty is not None and not req_unit:
        if len(in_stock) == 1:
            return {"status": "matched", "item": parsed_item,
                    "product": in_stock[0], "score": round(top_score, 1)}
        return {
            "status": "needs_qty",
            "item": parsed_item,
            "candidates": in_stock[:4],
            "score": top_score,
            "reason": (
                f"Konsa size/brand chahiye? "
                f"Options: {', '.join(p['name'] + ' (Rs' + str(int(p['price'])) + ')' for p in in_stock[:4])}"
            ),
        }

    # --- No qty specified at all --------------------------------------------
    if req_qty is None:
        if len(in_stock) == 1:
            return {"status": "matched", "item": parsed_item,
                    "product": in_stock[0], "score": round(top_score, 1)}

        # Multiple sizes/brands — ask customer to specify
        return {
            "status": "needs_qty",
            "item": parsed_item,
            "candidates": in_stock[:4],
            "score": top_score,
            "reason": (
                f"Konsa size aur kitna chahiye '{item_name}' ke liye? "
                f"Options: {', '.join(p['name'] + ' (Rs' + str(int(p['price'])) + ')' for p in in_stock[:4])}"
            ),
        }

    # Fallback matched
    return {"status": "matched", "item": parsed_item,
            "product": in_stock[0], "score": round(top_score, 1)}


def run_matching(parsed_items):
    products = get_all_products()
    return [match_item(item, products) for item in parsed_items]