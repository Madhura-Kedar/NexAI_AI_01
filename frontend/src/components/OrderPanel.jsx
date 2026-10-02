export default function OrderPanel({ confirmed, pending }) {
    return (
        <div style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 16 }}>
                📦 Order Summary
            </div>

            {/* Confirmed Items */}
            {confirmed.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: "#25D366", letterSpacing: 1, marginBottom: 8 }}>
                        ✓ CONFIRMED ITEMS
                    </div>
                    {confirmed.map((item, i) => (
                        <div key={i} style={{
                            background: "#0d2e1a",
                            border: "1px solid #1a4a28",
                            borderRadius: 10,
                            padding: "10px 14px",
                            marginBottom: 8,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}>
                            <div>
                                <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{item.product_name}</div>
                                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                                    {item.qty}{item.unit} × ₹{item.price_snapshot}
                                </div>
                            </div>
                            <div style={{ fontSize: 14, color: "#25D366", fontWeight: 700 }}>
                                ₹{(item.qty * item.price_snapshot).toFixed(2)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pending / Ambiguous Items */}
            {pending.length > 0 && (
                <div>
                    <div style={{ fontSize: 11, color: "#f0a500", letterSpacing: 1, marginBottom: 8 }}>
                        ⏳ AWAITING CLARIFICATION
                    </div>
                    {pending.map((item, i) => (
                        <div key={i} style={{
                            background: "#2a1f00",
                            border: "1px solid #3d2e00",
                            borderRadius: 10,
                            padding: "10px 14px",
                            marginBottom: 8
                        }}>
                            <div style={{ fontSize: 13, color: "#f0a500", fontWeight: 600 }}>{item.item}</div>
                            <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{item.reason}</div>
                            {item.candidates && item.candidates.length > 0 && (
                                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {item.candidates.map((c, j) => (
                                        <span key={j} style={{
                                            background: "#1a1200",
                                            border: "1px solid #4a3800",
                                            borderRadius: 6,
                                            padding: "3px 8px",
                                            fontSize: 11,
                                            color: "#ccc"
                                        }}>
                                            {c.name} — ₹{c.price}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {item.out_of_stock && (
                                <div style={{ marginTop: 6, fontSize: 11, color: "#ff6b6b" }}>
                                    ⚠️ Out of stock
                                    {item.alternatives?.length > 0 && (
                                        <span style={{ color: "#888" }}> · Alt: {item.alternatives.map(a => a.name).join(", ")}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {confirmed.length === 0 && pending.length === 0 && (
                <div style={{ color: "#444", fontSize: 13, textAlign: "center", marginTop: 40 }}>
                    Items will appear as you order
                </div>
            )}
        </div>
    )
}
