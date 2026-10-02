export default function BillCard({ bill, deliveryNote, state }) {
    if (!bill) return (
        <div style={{ padding: 20, color: "#444", fontSize: 13, textAlign: "center", marginTop: 40 }}>
            Bill will appear after order is confirmed
        </div>
    )

    const isConfirmed = state === "confirmed"

    return (
        <div style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 16 }}>
                {isConfirmed ? "🧾 Final Bill" : "🧾 Bill Preview"}
            </div>

            <div style={{
                background: "#111", border: "1px solid #222", borderRadius: 12, padding: 16,
                fontFamily: "'Courier New', monospace"
            }}>
                {/* Header */}
                <div style={{ textAlign: "center", borderBottom: "1px dashed #333", paddingBottom: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>KIRANA STORE</div>
                    <div style={{ fontSize: 11, color: "#666" }}>AI-Powered Order Desk</div>
                    <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>{new Date().toLocaleString("en-IN")}</div>
                </div>

                {/* Line items */}
                {bill.line_items?.map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, color: "#ccc" }}>
                        <div style={{ flex: 1 }}>
                            <div>{item.product_name}</div>
                            <div style={{ color: "#555", fontSize: 11 }}>{item.qty}{item.unit} × ₹{item.price_per_unit}</div>
                        </div>
                        <div style={{ fontWeight: 600, color: "#fff" }}>₹{item.subtotal}</div>
                    </div>
                ))}

                {/* Totals */}
                <div style={{ borderTop: "1px dashed #333", paddingTop: 12, marginTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 6 }}>
                        <span>Subtotal</span><span>₹{bill.subtotal}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 10 }}>
                        <span>Delivery</span>
                        <span>{bill.delivery_charge === 0 ? "FREE" : `₹${bill.delivery_charge}`}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, color: "#25D366" }}>
                        <span>TOTAL</span><span>₹{bill.grand_total}</span>
                    </div>
                    {bill.delivery_charge === 0 && (
                        <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>Free delivery on orders above ₹500</div>
                    )}
                </div>

                {/* Status badge */}
                <div style={{
                    marginTop: 14, padding: "8px 0", textAlign: "center",
                    background: isConfirmed ? "#0d2e1a" : "#2a1f00",
                    borderRadius: 8, fontSize: 12, fontFamily: "Inter, sans-serif",
                    color: isConfirmed ? "#25D366" : "#f0a500"
                }}>
                    {isConfirmed ? "✓ Order Confirmed" : "⏳ Awaiting Clarification"}
                </div>
            </div>

            {/* Delivery note */}
            {deliveryNote && (
                <div style={{ marginTop: 16, background: "#0d1a1d", border: "1px solid #1a3a40", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, color: "#4a9eb5", marginBottom: 6, letterSpacing: 1 }}>DELIVERY NOTE</div>
                    <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.6 }}>{deliveryNote}</div>
                </div>
            )}
        </div>
    )
}