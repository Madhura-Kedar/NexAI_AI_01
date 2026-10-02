export default function OrderPanel({ confirmed, pending, grandTotal, onClarify, onNavigateToChat, onNavigateToBill }) {
    const totalCount = confirmed.length + pending.length

    return (
        <div style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "24px 24px 40px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 24
        }}>
            {/* Page Header & Stats Summary */}
            <div style={{
                background: "linear-gradient(135deg, #161c24 0%, #10141a 100%)",
                border: "1px solid #232c38",
                borderRadius: 16,
                padding: "22px 26px",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                boxShadow: "0 6px 20px rgba(0,0,0,0.3)"
            }}>
                <div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
                        <span>📦</span> Live Order Summary
                    </h2>
                    <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                        Real-time status of items parsed from voice & chat
                    </p>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                    <div style={{
                        background: "#1c2430",
                        border: "1px solid #2d3848",
                        borderRadius: 12,
                        padding: "10px 18px",
                        textAlign: "center"
                    }}>
                        <div style={{ fontSize: 11, color: "#81c784", fontWeight: 700, letterSpacing: 0.5 }}>CONFIRMED</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#25D366" }}>{confirmed.length}</div>
                    </div>

                    <div style={{
                        background: "#1c2430",
                        border: "1px solid #2d3848",
                        borderRadius: 12,
                        padding: "10px 18px",
                        textAlign: "center"
                    }}>
                        <div style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700, letterSpacing: 0.5 }}>PENDING</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>{pending.length}</div>
                    </div>

                    {grandTotal !== null && grandTotal !== undefined && (
                        <div style={{
                            background: "linear-gradient(135deg, #0d331e 0%, #082414 100%)",
                            border: "1px solid #1c6136",
                            borderRadius: 12,
                            padding: "10px 20px",
                            textAlign: "center"
                        }}>
                            <div style={{ fontSize: 11, color: "#a5d6a7", fontWeight: 700, letterSpacing: 0.5 }}>EST. TOTAL</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: "#25D366" }}>₹{grandTotal}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Pending / Clarification Section (First if any, so shopkeeper notices immediately!) */}
            {pending.length > 0 && (
                <div style={{
                    background: "rgba(245, 158, 11, 0.05)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    borderRadius: 16,
                    padding: "20px 24px"
                }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 16
                    }}>
                        <span style={{ fontSize: 20 }}>⚠️</span>
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f59e0b" }}>
                                Awaiting Clarification ({pending.length} item{pending.length > 1 ? "s" : ""})
                            </h3>
                            <p style={{ fontSize: 12, color: "#d97706", marginTop: 2 }}>
                                Shopkeeper action: Tap any option below to resolve, or speak in chat
                            </p>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {pending.map((item, i) => (
                            <div key={i} style={{
                                background: "#1c170d",
                                border: "1px solid #45300d",
                                borderRadius: 12,
                                padding: "16px 20px"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: "#fbbf24" }}>
                                            {item.item ? item.item.toUpperCase() : "ITEM"}
                                        </div>
                                        <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 4 }}>
                                            {item.reason}
                                        </div>
                                    </div>
                                    <span style={{
                                        background: "#362409",
                                        color: "#f59e0b",
                                        borderRadius: 6,
                                        padding: "4px 10px",
                                        fontSize: 11,
                                        fontWeight: 700
                                    }}>
                                        Needs choice
                                    </span>
                                </div>

                                {/* Clickable Candidate Chips */}
                                {item.candidates && item.candidates.length > 0 && (
                                    <div style={{ marginTop: 14 }}>
                                        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, fontWeight: 600 }}>
                                            AVAILABLE OPTIONS (Click to select):
                                        </div>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                            {item.candidates.map((c, j) => (
                                                <button
                                                    key={j}
                                                    onClick={() => onClarify(c.name)}
                                                    style={{
                                                        background: "#261c0d",
                                                        border: "1px solid #634515",
                                                        borderRadius: 8,
                                                        padding: "8px 14px",
                                                        color: "#fef3c7",
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 6,
                                                        transition: "all 0.15s ease"
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.background = "#45300d"
                                                        e.currentTarget.style.borderColor = "#fbbf24"
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.background = "#261c0d"
                                                        e.currentTarget.style.borderColor = "#634515"
                                                    }}
                                                >
                                                    <span>{c.name}</span>
                                                    <span style={{ color: "#25D366" }}>₹{c.price}</span>
                                                    <span style={{ fontSize: 11, color: "#fbbf24" }}>✓ Select</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Out of stock info */}
                                {item.out_of_stock && (
                                    <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: 8, fontSize: 12, color: "#f87171" }}>
                                        <strong>⚠️ {item.product} is Out of Stock.</strong>
                                        {item.alternatives?.length > 0 && (
                                            <div style={{ marginTop: 6, color: "#cbd5e1" }}>
                                                Suggested Alternatives: {item.alternatives.map(a => `${a.name} (₹${a.price})`).join(", ")}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Confirmed Items Section */}
            <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#25D366", display: "flex", alignItems: "center", gap: 8 }}>
                        <span>✓</span> Confirmed Items ({confirmed.length})
                    </h3>
                    {confirmed.length > 0 && (
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                            Verified against inventory
                        </span>
                    )}
                </div>

                {confirmed.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {confirmed.map((item, i) => (
                            <div
                                key={i}
                                style={{
                                    background: "#141c17",
                                    border: "1px solid #1e3828",
                                    borderRadius: 14,
                                    padding: "16px 22px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    transition: "all 0.15s ease"
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                    <div style={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: "50%",
                                        background: "#193623",
                                        color: "#25D366",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 800,
                                        fontSize: 14
                                    }}>
                                        {i + 1}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>
                                            {item.product_name}
                                        </div>
                                        <div style={{ fontSize: 12, color: "#8fa397", marginTop: 3 }}>
                                            Quantity: <strong>{item.qty} {item.unit}</strong> · Unit Price: ₹{item.price_snapshot}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: "#25D366" }}>
                                        ₹{(item.qty * item.price_snapshot).toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: 10, color: "#527962", marginTop: 2 }}>
                                        CONFIRMED
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{
                        background: "#13171d",
                        border: "1px dashed #283240",
                        borderRadius: 14,
                        padding: "36px 20px",
                        textAlign: "center"
                    }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🛒</div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#cbd5e1" }}>
                            Abhi koi confirmed item nahi hai
                        </div>
                        <p style={{ fontSize: 12, color: "#64748b", marginTop: 4, maxWidth: 360, margin: "4px auto 16px" }}>
                            Voice ya text se order place karein (jaise: '2 kilo atta, 1L tel')
                        </p>
                        <button
                            onClick={onNavigateToChat}
                            style={{
                                background: "#25D366",
                                color: "#000",
                                border: "none",
                                borderRadius: 10,
                                padding: "8px 18px",
                                fontWeight: 700,
                                fontSize: 13,
                                cursor: "pointer"
                            }}
                        >
                            🎤 Go to Voice & Chat Desk
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom Navigation & Action Bar */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 10,
                paddingTop: 20,
                borderTop: "1px solid #1f2732"
            }}>
                <button
                    onClick={onNavigateToChat}
                    style={{
                        background: "#1c232d",
                        border: "1px solid #2d3748",
                        color: "#cbd5e1",
                        borderRadius: 12,
                        padding: "12px 20px",
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8
                    }}
                >
                    <span>←</span>
                    <span>Back to Voice & Chat</span>
                </button>

                {confirmed.length > 0 && (
                    <button
                        onClick={onNavigateToBill}
                        style={{
                            background: "linear-gradient(135deg, #25D366 0%, #16a34a 100%)",
                            border: "none",
                            color: "#000",
                            borderRadius: 12,
                            padding: "12px 26px",
                            fontWeight: 800,
                            fontSize: 14,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            boxShadow: "0 4px 16px rgba(37, 211, 102, 0.3)"
                        }}
                    >
                        <span>Proceed to Final Bill (₹{grandTotal || "..."})</span>
                        <span>➔</span>
                    </button>
                )}
            </div>
        </div>
    )
}
