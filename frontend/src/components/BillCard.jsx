import { useState } from "react"

export default function BillCard({ bill, deliveryNote, state, onNavigateToSummary, onReset }) {
    const isConfirmed = state === "confirmed"
    const [copied, setCopied] = useState(false)

    const handlePrint = () => {
        window.print()
    }

    const handleWhatsApp = () => {
        if (!bill) return
        let text = `*APNA KIRANA STORE - BILL*\n`
        text += `Date: ${new Date().toLocaleDateString("en-IN")}\n`
        text += `---------------------------\n`
        bill.line_items?.forEach((item, idx) => {
            text += `${idx + 1}. ${item.product_name} - ${item.qty}${item.unit} x ₹${item.price_per_unit} = ₹${item.subtotal}\n`
        })
        text += `---------------------------\n`
        text += `Subtotal: ₹${bill.subtotal}\n`
        text += `Delivery: ${bill.delivery_charge === 0 ? "FREE" : `₹${bill.delivery_charge}`}\n`
        text += `*TOTAL: ₹${bill.grand_total}*\n\n`
        if (deliveryNote) {
            text += `*Delivery Note:* ${deliveryNote}\n`
        }
        text += `Thank you for shopping with us! 🙏`

        const encoded = encodeURI(text)
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank")
    }

    const copyText = () => {
        if (!bill) return
        let text = `APNA KIRANA STORE - BILL\n`
        bill.line_items?.forEach((item, idx) => {
            text += `${idx + 1}. ${item.product_name} (${item.qty}${item.unit}) = ₹${item.subtotal}\n`
        })
        text += `TOTAL: ₹${bill.grand_total}\n`
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (!bill) {
        return (
            <div style={{
                maxWidth: 680,
                margin: "40px auto",
                padding: "36px 24px",
                background: "#13171d",
                border: "1px dashed #283240",
                borderRadius: 16,
                textAlign: "center"
            }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>🧾</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                    No Active Bill Available
                </h3>
                <p style={{ fontSize: 13, color: "#94a3b8", maxWidth: 400, margin: "0 auto 20px" }}>
                    Speak or type your order in the Voice Desk first. When items are added, the bill preview and receipt will appear here.
                </p>
                <button
                    onClick={onNavigateToSummary}
                    style={{
                        background: "#25D366",
                        color: "#000",
                        border: "none",
                        borderRadius: 10,
                        padding: "10px 20px",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer"
                    }}
                >
                    View Order Summary
                </button>
            </div>
        )
    }

    return (
        <div style={{
            maxWidth: 760,
            margin: "0 auto",
            padding: "24px 20px 48px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 20
        }}>
            {/* Action Bar (Top) */}
            <div className="no-print" style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12
            }}>
                <button
                    onClick={onNavigateToSummary}
                    style={{
                        background: "#1c232d",
                        border: "1px solid #2d3748",
                        color: "#cbd5e1",
                        borderRadius: 10,
                        padding: "8px 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                    }}
                >
                    ← Back to Order Summary
                </button>

                <div style={{ display: "flex", gap: 10 }}>
                    <button
                        onClick={copyText}
                        style={{
                            background: "#1e293b",
                            border: "1px solid #334155",
                            color: "#94a3b8",
                            borderRadius: 10,
                            padding: "8px 16px",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer"
                        }}
                    >
                        {copied ? "✓ Copied!" : "📋 Copy Summary"}
                    </button>
                    <button
                        onClick={handleWhatsApp}
                        style={{
                            background: "#128C7E",
                            border: "none",
                            color: "#fff",
                            borderRadius: 10,
                            padding: "8px 16px",
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6
                        }}
                    >
                        📲 WhatsApp
                    </button>
                    <button
                        onClick={handlePrint}
                        style={{
                            background: "#25D366",
                            border: "none",
                            color: "#000",
                            borderRadius: 10,
                            padding: "8px 18px",
                            fontSize: 13,
                            fontWeight: 800,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6
                        }}
                    >
                        🖨️ Print Receipt
                    </button>
                </div>
            </div>

            {/* Printable Receipt Card */}
            <div id="printable-receipt" style={{
                background: "#11161d",
                border: "1px solid #232c38",
                borderRadius: 16,
                padding: "28px 32px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                fontFamily: "'JetBrains Mono', 'Courier New', monospace"
            }}>
                {/* Store Header */}
                <div style={{
                    textAlign: "center",
                    borderBottom: "2px dashed #2d3748",
                    paddingBottom: 18,
                    marginBottom: 18
                }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: 1 }}>
                        🏪 APNA KIRANA STORE
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                        Main Market Road, City Centre · Ph: +91 98765 43210
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        GSTIN: 27AABCS1429B1Z · Cash / UPI Counter
                    </div>

                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 11,
                        color: "#94a3b8",
                        marginTop: 12,
                        paddingTop: 8,
                        borderTop: "1px solid #1e2632"
                    }}>
                        <span>Date: {new Date().toLocaleDateString("en-IN")} {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span>Invoice: #ORD-{Math.floor(1000 + Math.random() * 9000)}</span>
                    </div>
                </div>

                {/* Status Badge */}
                <div style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    background: isConfirmed ? "#0d2e1a" : "#2a1e0b",
                    border: isConfirmed ? "1px solid #1a562d" : "1px solid #573a0e",
                    color: isConfirmed ? "#25D366" : "#f59e0b",
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: "center",
                    marginBottom: 18,
                    fontFamily: "Inter, sans-serif"
                }}>
                    {isConfirmed ? "✓ ORDER CONFIRMED & READY FOR DELIVERY" : "⏳ PROVISIONAL BILL (Awaiting Clarification)"}
                </div>

                {/* Line Items Table */}
                <div style={{ marginBottom: 18 }}>
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "30px 1fr 100px 90px",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#64748b",
                        borderBottom: "1px solid #232d3b",
                        paddingBottom: 8,
                        marginBottom: 10
                    }}>
                        <span>#</span>
                        <span>ITEM DESCRIPTION</span>
                        <span style={{ textAlign: "right" }}>QTY × RATE</span>
                        <span style={{ textAlign: "right" }}>AMOUNT</span>
                    </div>

                    {bill.line_items?.map((item, i) => (
                        <div
                            key={i}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "30px 1fr 100px 90px",
                                fontSize: 13,
                                color: "#e2e8f0",
                                padding: "7px 0",
                                borderBottom: "1px dotted #1f2733"
                            }}
                        >
                            <span style={{ color: "#64748b", fontSize: 11 }}>{i + 1}</span>
                            <div>
                                <span style={{ fontWeight: 600 }}>{item.product_name}</span>
                            </div>
                            <span style={{ textAlign: "right", color: "#94a3b8", fontSize: 12 }}>
                                {item.qty}{item.unit} × ₹{item.price_per_unit}
                            </span>
                            <span style={{ textAlign: "right", fontWeight: 700, color: "#fff" }}>
                                ₹{item.subtotal.toFixed(2)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Totals Breakdown */}
                <div style={{
                    borderTop: "2px dashed #2d3748",
                    paddingTop: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#94a3b8" }}>
                        <span>Item Subtotal ({bill.item_count || bill.line_items?.length} items):</span>
                        <span>₹{bill.subtotal.toFixed(2)}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#94a3b8" }}>
                        <span>Delivery Charges:</span>
                        <span style={{ color: bill.delivery_charge === 0 ? "#25D366" : "#cbd5e1" }}>
                            {bill.delivery_charge === 0 ? "FREE (Orders > ₹500)" : `₹${bill.delivery_charge.toFixed(2)}`}
                        </span>
                    </div>

                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 20,
                        fontWeight: 800,
                        color: "#25D366",
                        marginTop: 10,
                        paddingTop: 10,
                        borderTop: "1px solid #1f2733"
                    }}>
                        <span>GRAND TOTAL:</span>
                        <span>₹{bill.grand_total.toFixed(2)}</span>
                    </div>
                </div>

                {/* Footer Note */}
                <div style={{
                    textAlign: "center",
                    marginTop: 20,
                    paddingTop: 14,
                    borderTop: "1px dashed #2d3748",
                    fontSize: 11,
                    color: "#64748b"
                }}>
                    Aapki sewa mein hamesha tatpar! · Computer Generated Invoice
                </div>
            </div>

            {/* Delivery Note Card (for delivery person) */}
            {deliveryNote && (
                <div style={{
                    background: "#0d1f2d",
                    border: "1px solid #16405b",
                    borderRadius: 14,
                    padding: "18px 22px"
                }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#38bdf8",
                        letterSpacing: 0.5,
                        marginBottom: 8
                    }}>
                        <span>🚚</span>
                        <span>DELIVERY PERSON NOTE (Hinglish)</span>
                    </div>
                    <div style={{
                        fontSize: 14,
                        color: "#e0f2fe",
                        lineHeight: 1.6,
                        whiteSpace: "pre-line",
                        background: "#08131d",
                        padding: "12px 16px",
                        borderRadius: 10,
                        border: "1px solid #0f2c42"
                    }}>
                        {deliveryNote}
                    </div>
                </div>
            )}

            {/* Bottom New Order Action */}
            <div className="no-print" style={{
                textAlign: "center",
                marginTop: 8
            }}>
                <button
                    onClick={onReset}
                    style={{
                        background: "#1c232d",
                        border: "1px solid #334155",
                        color: "#cbd5e1",
                        borderRadius: 12,
                        padding: "12px 28px",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer"
                    }}
                >
                    🔄 Start Another New Order
                </button>
            </div>
        </div>
    )
}