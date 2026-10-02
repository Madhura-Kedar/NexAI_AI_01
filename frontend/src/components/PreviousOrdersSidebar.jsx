import { useState, useEffect } from "react"

export default function PreviousOrdersSidebar({ isOpen, onToggle, currentOrderId, onSelectOrder, onReorder }) {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(false)
    const [expandedOrderId, setExpandedOrderId] = useState(null)

    const fetchOrders = async () => {
        setLoading(true)
        try {
            const res = await fetch("http://localhost:5000/api/orders")
            const data = await res.json()
            setOrders(Array.isArray(data) ? data : [])
        } catch (e) {
            console.error("Failed to fetch previous orders", e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchOrders()
    }, [currentOrderId])

    // Filter out active order if it is empty/pending without items
    const completedOrders = orders.filter(o => o.id !== currentOrderId || (o.items && o.items.length > 0))

    if (!isOpen) {
        return (
            <div
                className="no-print"
                style={{
                    width: 44,
                    background: "#0f131a",
                    borderRight: "1px solid #1f2732",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    paddingTop: 16,
                    gap: 16,
                    flexShrink: 0,
                    transition: "width 0.2s ease"
                }}
            >
                <button
                    onClick={onToggle}
                    title="Open Previous Orders Sidebar"
                    style={{
                        background: "#1a2230",
                        border: "1px solid #2d3b4e",
                        color: "#a5b4fc",
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: 14
                    }}
                >
                    ▶
                </button>
                <div style={{
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#94a3b8",
                    letterSpacing: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                }}>
                    <span>PREVIOUS ORDERS</span>
                    {completedOrders.length > 0 && (
                        <span style={{
                            background: "#25D366",
                            color: "#000",
                            padding: "2px 6px",
                            borderRadius: 10,
                            fontSize: 10,
                            fontWeight: 800
                        }}>
                            {completedOrders.length}
                        </span>
                    )}
                </div>
            </div>
        )
    }

    return (
        <aside
            className="no-print"
            style={{
                width: 320,
                background: "#0f131a",
                borderRight: "1px solid #1f2732",
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                height: "100%",
                boxShadow: "2px 0 10px rgba(0,0,0,0.25)",
                transition: "width 0.2s ease",
                zIndex: 5
            }}
        >
            {/* Header */}
            <div style={{
                padding: "16px 18px",
                borderBottom: "1px solid #1f2732",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#131822"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>📋</span>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>
                            Previous Orders
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                            {completedOrders.length} past record{completedOrders.length === 1 ? "" : "s"}
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                        onClick={fetchOrders}
                        title="Refresh orders list"
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "#94a3b8",
                            cursor: "pointer",
                            fontSize: 14,
                            padding: 4
                        }}
                    >
                        {loading ? "⏳" : "🔄"}
                    </button>
                    <button
                        onClick={onToggle}
                        title="Collapse Sidebar"
                        style={{
                            background: "#1a2230",
                            border: "1px solid #2d3b4e",
                            color: "#a5b4fc",
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontSize: 12
                        }}
                    >
                        ◀
                    </button>
                </div>
            </div>

            {/* Orders List */}
            <div style={{
                flex: 1,
                overflowY: "auto",
                padding: "14px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 10
            }}>
                {completedOrders.length === 0 ? (
                    <div style={{
                        textAlign: "center",
                        padding: "40px 16px",
                        color: "#64748b",
                        fontSize: 13
                    }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                        Abhi koi previous order nahi hai.
                        <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
                            Order complete karne ke baad yahan dikhega.
                        </div>
                    </div>
                ) : (
                    completedOrders.map((ord) => {
                        const isExpanded = expandedOrderId === ord.id
                        const itemCount = ord.items ? ord.items.length : 0
                        const isConfirmed = ord.status === "confirmed"
                        const isCancelled = ord.status === "cancelled"

                        return (
                            <div
                                key={ord.id}
                                style={{
                                    background: "#141a24",
                                    border: isExpanded ? "1px solid #3b82f6" : "1px solid #212c3d",
                                    borderRadius: 12,
                                    padding: "12px 14px",
                                    transition: "all 0.15s ease",
                                    cursor: "pointer"
                                }}
                                onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                            >
                                {/* Top row: ID + Status */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>
                                        Order #{ord.id}
                                    </div>
                                    <span style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        padding: "2px 8px",
                                        borderRadius: 6,
                                        background: isConfirmed ? "#0d331e" : (isCancelled ? "#381010" : "#2d2410"),
                                        color: isConfirmed ? "#25D366" : (isCancelled ? "#ef4444" : "#f59e0b"),
                                        border: isConfirmed ? "1px solid #1c6136" : (isCancelled ? "1px solid #7f1d1d" : "1px solid #573a0e")
                                    }}>
                                        {isConfirmed ? "✓ Confirmed" : (isCancelled ? "✗ Cancelled" : "⏳ Pending")}
                                    </span>
                                </div>

                                {/* Middle row: Date & Total */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                                    <span style={{ fontSize: 11, color: "#64748b" }}>
                                        {ord.created_at ? new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}
                                        {ord.created_at ? ` · ${new Date(ord.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : ""}
                                    </span>
                                    <span style={{ fontSize: 15, fontWeight: 800, color: ord.total > 0 ? "#25D366" : "#94a3b8" }}>
                                        ₹{ord.total || 0}
                                    </span>
                                </div>

                                {/* Items Preview Summary */}
                                {itemCount > 0 ? (
                                    <div style={{
                                        fontSize: 11,
                                        color: "#94a3b8",
                                        background: "#0e131b",
                                        padding: "6px 8px",
                                        borderRadius: 6,
                                        lineHeight: 1.4
                                    }}>
                                        {ord.items.slice(0, 2).map((it, idx) => (
                                            <div key={idx} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                • {it.product_name} ({it.qty}{it.unit})
                                            </div>
                                        ))}
                                        {itemCount > 2 && (
                                            <div style={{ color: "#60a5fa", fontSize: 10, marginTop: 2 }}>
                                                +{itemCount - 2} more item{itemCount - 2 > 1 ? "s" : ""} (tap to view)
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: 11, color: "#64748b", fontStyle: "italic" }}>
                                        No items recorded
                                    </div>
                                )}

                                {/* Expanded Full Item Breakdown */}
                                {isExpanded && ord.items && ord.items.length > 0 && (
                                    <div style={{
                                        marginTop: 10,
                                        paddingTop: 8,
                                        borderTop: "1px dashed #28364a",
                                        fontSize: 11
                                    }}>
                                        <div style={{ fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
                                            Full Items List ({itemCount}):
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                                            {ord.items.map((it, idx) => (
                                                <div key={idx} style={{ display: "flex", justifyContent: "space-between", color: "#e2e8f0" }}>
                                                    <span>{it.product_name} × {it.qty}{it.unit}</span>
                                                    <span style={{ color: "#25D366", fontWeight: 600 }}>₹{it.subtotal}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Action buttons inside expanded order */}
                                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                                            {onReorder && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        const reorderText = ord.items.map(it => `${it.qty} ${it.unit} ${it.product_name}`).join(", ")
                                                        onReorder(reorderText)
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        background: "#1c2c22",
                                                        border: "1px solid #285437",
                                                        color: "#25D366",
                                                        borderRadius: 6,
                                                        padding: "5px 8px",
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        cursor: "pointer"
                                                    }}
                                                >
                                                    🔄 Re-order These Items
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </aside>
    )
}
