def generate_bill(confirmed_items):
    """
    confirmed_items: list of dicts with product_name, qty, unit, price_snapshot
    Pure Python math — never use LLM for this
    """
    line_items = []
    subtotal = 0

    for item in confirmed_items:
        qty = item.get("qty", 1) or 1
        price = item.get("price_snapshot", 0)
        item_total = round(qty * price, 2)
        subtotal += item_total

        line_items.append({
            "product_name": item["product_name"],
            "qty": qty,
            "unit": item.get("unit", ""),
            "price_per_unit": price,
            "subtotal": item_total
        })

    delivery_charge = 0 if subtotal >= 500 else 30
    grand_total = round(subtotal + delivery_charge, 2)

    return {
        "line_items": line_items,
        "subtotal": round(subtotal, 2),
        "delivery_charge": delivery_charge,
        "grand_total": grand_total,
        "item_count": len(line_items)
    }