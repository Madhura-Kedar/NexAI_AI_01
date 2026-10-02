import { useState, useEffect } from "react"
import { translations, LANGUAGES } from "../utils/translations"

export default function ShopkeeperDashboard({ lang, onLangChange, onSelectOrder, onReorder }) {
    const t = translations[lang] || translations.en
    const [orders, setOrders] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [expandedOrderId, setExpandedOrderId] = useState(null)
    const [editingCustomerOrder, setEditingCustomerOrder] = useState(null)
    const [editForm, setEditForm] = useState({ name: "", phone: "", address: "" })
    const [savingCustomer, setSavingCustomer] = useState(false)

    const fetchDashboardData = async () => {
        setLoading(true)
        try {
            const [ordersRes, statsRes] = await Promise.all([
                fetch("http://localhost:5000/api/orders"),
                fetch("http://localhost:5000/api/shopkeeper/stats")
            ])
            if (ordersRes.ok) {
                const ordersData = await ordersRes.json()
                setOrders(Array.isArray(ordersData) ? ordersData : [])
            }
            if (statsRes.ok) {
                const statsData = await statsRes.json()
                setStats(statsData)
            }
        } catch (e) {
            console.error("Failed to load shopkeeper dashboard data", e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            const res = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            })
            if (res.ok) {
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
                fetchDashboardData()
            }
        } catch (e) {
            console.error("Failed to update order status", e)
        }
    }

    const handleSaveCustomer = async (orderId) => {
        setSavingCustomer(true)
        try {
            const res = await fetch(`http://localhost:5000/api/orders/${orderId}/customer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm)
            })
            if (res.ok) {
                setOrders(prev => prev.map(o => o.id === orderId ? {
                    ...o,
                    customer_name: editForm.name,
                    customer_phone: editForm.phone,
                    customer_address: editForm.address
                } : o))
                setEditingCustomerOrder(null)
                fetchDashboardData()
            }
        } catch (e) {
            console.error("Failed to save customer details", e)
        } finally {
            setSavingCustomer(false)
        }
    }

    const openEditCustomer = (order) => {
        setEditingCustomerOrder(order.id)
        setEditForm({
            name: order.customer_name || "",
            phone: order.customer_phone || "",
            address: order.customer_address || ""
        })
    }

    const handleWhatsAppCustomer = (order) => {
        let text = `*APNA KIRANA STORE - INVOICE #ORD-${order.id}*\n`
        text += `Date: ${new Date(order.created_at).toLocaleDateString("en-IN")}\n`
        text += `Customer: ${order.customer_name || "Valued Customer"}\n`
        if (order.customer_address) text += `Delivery: ${order.customer_address}\n`
        text += `---------------------------\n`
        order.items?.forEach((item, idx) => {
            text += `${idx + 1}. ${item.product_name} x ${item.qty}${item.unit} = ₹${item.subtotal}\n`
        })
        text += `---------------------------\n`
        text += `*TOTAL: ₹${order.total}*\n`
        text += `Status: ${order.status?.toUpperCase()}\n\n`
        text += `Thank you for shopping with us! 🙏`

        const cleanPhone = (order.customer_phone || "").replace(/[^0-9]/g, "")
        const phoneParam = cleanPhone ? `phone=${cleanPhone}&` : ""
        window.open(`https://api.whatsapp.com/send?${phoneParam}text=${encodeURI(text)}`, "_blank")
    }

    // Filter and search
    const filteredOrders = orders.filter(order => {
        // Status filter
        if (statusFilter !== "all" && order.status !== statusFilter) return false

        // Search query
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase()
        const matchName = (order.customer_name || "").toLowerCase().includes(q)
        const matchPhone = (order.customer_phone || "").toLowerCase().includes(q)
        const matchAddress = (order.customer_address || "").toLowerCase().includes(q)
        const matchId = `ord-${order.id}`.toLowerCase().includes(q) || String(order.id).includes(q)
        const matchItems = order.items?.some(i => i.product_name.toLowerCase().includes(q))

        return matchName || matchPhone || matchAddress || matchId || matchItems
    })

    return (
        <div style={{
            maxWidth: 1140,
            margin: "0 auto",
            padding: "24px 24px 60px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 24,
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Top Header & Multi-lingual Selector */}
            <div style={{
                background: "linear-gradient(135deg, #131922 0%, #0d1218 100%)",
                border: "1px solid #222d3b",
                borderRadius: 18,
                padding: "22px 28px",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
            }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 24 }}>📊</span>
                        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>
                            {t.dashboardTitle}
                        </h2>
                    </div>
                    <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                        {t.dashboardSubtitle}
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Multi-lingual Language Selector */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: "#1a2330",
                        border: "1px solid #2d3b4e",
                        borderRadius: 12,
                        padding: "6px 12px"
                    }}>
                        <span style={{ fontSize: 14 }}>🌐</span>
                        <select
                            value={lang}
                            onChange={(e) => onLangChange(e.target.value)}
                            style={{
                                background: "transparent",
                                color: "#25D366",
                                border: "none",
                                outline: "none",
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: "pointer"
                            }}
                        >
                            {LANGUAGES.map(l => (
                                <option key={l.code} value={l.code} style={{ background: "#11161f", color: "#fff" }}>
                                    {l.flag} {l.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={fetchDashboardData}
                        title="Refresh Data"
                        style={{
                            background: "#1e293b",
                            border: "1px solid #334155",
                            color: "#cbd5e1",
                            padding: "8px 16px",
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6
                        }}
                    >
                        <span>🔄</span>
                        <span>{t.refreshData}</span>
                    </button>
                </div>
            </div>

            {/* Metric Statistics Cards */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16
            }}>
                {/* Total Revenue */}
                <div style={{
                    background: "linear-gradient(135deg, #0d2818 0%, #081a10 100%)",
                    border: "1px solid #1a562d",
                    borderRadius: 16,
                    padding: "20px 22px",
                    boxShadow: "0 4px 16px rgba(37, 211, 102, 0.1)"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#86efac", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            {t.statTotalRevenue}
                        </span>
                        <span style={{ fontSize: 18 }}>💰</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#25D366", marginTop: 8 }}>
                        ₹{stats?.total_revenue?.toFixed(2) || "0.00"}
                    </div>
                    <div style={{ fontSize: 11, color: "#4ade80", marginTop: 4 }}>
                        {stats?.confirmed_orders || 0} {t.statConfirmed}
                    </div>
                </div>

                {/* Today's Sales */}
                <div style={{
                    background: "linear-gradient(135deg, #182232 0%, #101722 100%)",
                    border: "1px solid #253852",
                    borderRadius: 16,
                    padding: "20px 22px"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#93c5fd", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            {t.statTodaySales}
                        </span>
                        <span style={{ fontSize: 18 }}>📅</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#60a5fa", marginTop: 8 }}>
                        ₹{stats?.today_revenue?.toFixed(2) || "0.00"}
                    </div>
                    <div style={{ fontSize: 11, color: "#93c5fd", marginTop: 4 }}>
                        {stats?.today_orders || 0} {t.statTodayOrders}
                    </div>
                </div>

                {/* Total Orders */}
                <div style={{
                    background: "linear-gradient(135deg, #201c10 0%, #171308 100%)",
                    border: "1px solid #4a3e1c",
                    borderRadius: 16,
                    padding: "20px 22px"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#fde047", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            {t.statTotalOrders}
                        </span>
                        <span style={{ fontSize: 18 }}>📦</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#facc15", marginTop: 8 }}>
                        {stats?.total_orders || 0}
                    </div>
                    <div style={{ fontSize: 11, color: "#ca8a04", marginTop: 4 }}>
                        All recorded sessions
                    </div>
                </div>

                {/* Unique Customers */}
                <div style={{
                    background: "linear-gradient(135deg, #1f142b 0%, #140d1c 100%)",
                    border: "1px solid #472d62",
                    borderRadius: 16,
                    padding: "20px 22px"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#d8b4fe", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            {t.statUniqueCustomers}
                        </span>
                        <span style={{ fontSize: 18 }}>👥</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#c084fc", marginTop: 8 }}>
                        {stats?.unique_customers || 0}
                    </div>
                    <div style={{ fontSize: 11, color: "#a855f7", marginTop: 4 }}>
                        Customer Profiles Saved
                    </div>
                </div>
            </div>

            {/* Search & Status Filter Controls */}
            <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                justifyContent: "space-between",
                alignItems: "center"
            }}>
                {/* Search Bar */}
                <div style={{ flex: 1, minWidth: 280 }}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t.searchPlaceholder}
                        style={{
                            width: "100%",
                            background: "#11161f",
                            border: "1px solid #222d3b",
                            borderRadius: 12,
                            padding: "12px 18px",
                            color: "#fff",
                            fontSize: 13,
                            outline: "none",
                            transition: "border-color 0.15s ease"
                        }}
                        onFocus={(e) => e.target.style.borderColor = "#25D366"}
                        onBlur={(e) => e.target.style.borderColor = "#222d3b"}
                    />
                </div>

                {/* Status Filter Pills */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[
                        { key: "all", label: t.filterAll },
                        { key: "confirmed", label: t.filterConfirmed },
                        { key: "delivered", label: t.filterDelivered },
                        { key: "pending", label: t.filterPending },
                        { key: "cancelled", label: t.filterCancelled }
                    ].map(f => (
                        <button
                            key={f.key}
                            onClick={() => setStatusFilter(f.key)}
                            style={{
                                background: statusFilter === f.key ? "#25D366" : "#161d27",
                                color: statusFilter === f.key ? "#000" : "#94a3b8",
                                border: statusFilter === f.key ? "none" : "1px solid #263344",
                                borderRadius: 10,
                                padding: "8px 14px",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "all 0.15s ease"
                            }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders & Customers Billing Table */}
            <div style={{
                background: "#10151d",
                border: "1px solid #202b3a",
                borderRadius: 18,
                overflow: "hidden",
                boxShadow: "0 6px 24px rgba(0,0,0,0.3)"
            }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: "#151c27", borderBottom: "1px solid #253346", color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                <th style={{ padding: "16px 20px" }}>{t.thOrder}</th>
                                <th style={{ padding: "16px 20px" }}>{t.thCustomer}</th>
                                <th style={{ padding: "16px 20px" }}>{t.thItems}</th>
                                <th style={{ padding: "16px 20px", textAlign: "right" }}>{t.thTotal}</th>
                                <th style={{ padding: "16px 20px", textAlign: "center" }}>{t.thStatus}</th>
                                <th style={{ padding: "16px 20px", textAlign: "right" }}>{t.thActions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                                        ⏳ Loading billing details...
                                    </td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: "center", padding: "48px 20px", color: "#64748b" }}>
                                        <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                                        {t.noOrdersFound}
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => {
                                    const isDelivered = order.status === "delivered"
                                    const isConfirmed = order.status === "confirmed"
                                    const isCancelled = order.status === "cancelled"
                                    const isExpanded = expandedOrderId === order.id

                                    return (
                                        <tr
                                            key={order.id}
                                            style={{
                                                borderBottom: "1px solid #1a2330",
                                                background: isExpanded ? "#141b24" : "transparent",
                                                transition: "background 0.15s ease"
                                            }}
                                        >
                                            {/* Invoice & Date */}
                                            <td style={{ padding: "16px 20px", verticalAlign: "top" }}>
                                                <div style={{ fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>
                                                    #ORD-{order.id}
                                                </div>
                                                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                                                    {new Date(order.created_at).toLocaleDateString("en-IN", {
                                                        day: "numeric", month: "short", year: "numeric"
                                                    })}
                                                </div>
                                                <div style={{ fontSize: 10, color: "#475569" }}>
                                                    {new Date(order.created_at).toLocaleTimeString("en-IN", {
                                                        hour: "2-digit", minute: "2-digit"
                                                    })}
                                                </div>
                                            </td>

                                            {/* Customer Details */}
                                            <td style={{ padding: "16px 20px", verticalAlign: "top" }}>
                                                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                                    <div style={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: "50%",
                                                        background: order.customer_name ? "#1c3829" : "#1e293b",
                                                        color: order.customer_name ? "#25D366" : "#94a3b8",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: 13,
                                                        fontWeight: 700,
                                                        flexShrink: 0
                                                    }}>
                                                        {order.customer_name ? order.customer_name.charAt(0).toUpperCase() : "👤"}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, color: order.customer_name ? "#fff" : "#94a3b8" }}>
                                                            {order.customer_name || t.walkInCustomer}
                                                        </div>
                                                        {order.customer_phone && (
                                                            <div style={{ fontSize: 12, color: "#60a5fa", marginTop: 2 }}>
                                                                📞 {order.customer_phone}
                                                            </div>
                                                        )}
                                                        {order.customer_address && (
                                                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, maxWidth: 220 }}>
                                                                📍 {order.customer_address}
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => openEditCustomer(order)}
                                                            style={{
                                                                background: "none",
                                                                border: "none",
                                                                color: "#38bdf8",
                                                                fontSize: 11,
                                                                padding: 0,
                                                                marginTop: 4,
                                                                cursor: "pointer",
                                                                textDecoration: "underline"
                                                            }}
                                                        >
                                                            ✏️ {order.customer_name ? "Edit Details" : "+ Add Customer Info"}
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Purchased Items */}
                                            <td style={{ padding: "16px 20px", verticalAlign: "top" }}>
                                                <div style={{ color: "#e2e8f0" }}>
                                                    {order.items && order.items.length > 0 ? (
                                                        <div>
                                                            <div style={{ fontSize: 12, fontWeight: 600 }}>
                                                                {order.items.slice(0, 2).map((item, idx) => (
                                                                    <div key={idx} style={{ padding: "2px 0" }}>
                                                                        • {item.product_name} <span style={{ color: "#25D366" }}>×{item.qty}{item.unit}</span>
                                                                    </div>
                                                                ))}
                                                                {order.items.length > 2 && (
                                                                    <span style={{ fontSize: 11, color: "#64748b" }}>
                                                                        +{order.items.length - 2} more items...
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: "#64748b", fontSize: 12 }}>No items recorded</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Grand Total */}
                                            <td style={{ padding: "16px 20px", textAlign: "right", verticalAlign: "top" }}>
                                                <div style={{ fontSize: 16, fontWeight: 800, color: "#25D366" }}>
                                                    ₹{order.total?.toFixed(2) || "0.00"}
                                                </div>
                                                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                                                    {order.items?.length || 0} items
                                                </div>
                                            </td>

                                            {/* Status Badge */}
                                            <td style={{ padding: "16px 20px", textAlign: "center", verticalAlign: "top" }}>
                                                <span style={{
                                                    display: "inline-block",
                                                    padding: "4px 10px",
                                                    borderRadius: 8,
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    background: isDelivered ? "#0f2f1d" : isConfirmed ? "#0d331e" : isCancelled ? "#3b1111" : "#2d2009",
                                                    color: isDelivered ? "#4ade80" : isConfirmed ? "#25D366" : isCancelled ? "#f87171" : "#f59e0b",
                                                    border: isDelivered ? "1px solid #1c6136" : isConfirmed ? "1px solid #1c6136" : isCancelled ? "1px solid #6b1d1d" : "1px solid #573a0e"
                                                }}>
                                                    {isDelivered ? "✓ DELIVERED" : isConfirmed ? "✓ CONFIRMED" : isCancelled ? "✗ CANCELLED" : "⏳ PENDING"}
                                                </span>

                                                {/* Delivery Status Action */}
                                                {isConfirmed && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(order.id, "delivered")}
                                                        style={{
                                                            display: "block",
                                                            margin: "6px auto 0",
                                                            background: "#166534",
                                                            color: "#fff",
                                                            border: "none",
                                                            borderRadius: 6,
                                                            padding: "3px 8px",
                                                            fontSize: 10,
                                                            fontWeight: 700,
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        {t.markDelivered}
                                                    </button>
                                                )}
                                            </td>

                                            {/* Quick Actions */}
                                            <td style={{ padding: "16px 20px", textAlign: "right", verticalAlign: "top" }}>
                                                <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                                                    <button
                                                        onClick={() => handleWhatsAppCustomer(order)}
                                                        title="Share bill on WhatsApp"
                                                        style={{
                                                            background: "#128C7E",
                                                            border: "none",
                                                            color: "#fff",
                                                            borderRadius: 8,
                                                            padding: "6px 10px",
                                                            fontSize: 12,
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        📲
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const itemsText = order.items?.map(i => `${i.qty} ${i.product_name}`).join(", ")
                                                            if (itemsText && onReorder) onReorder(itemsText)
                                                        }}
                                                        title="Duplicate / Reorder"
                                                        style={{
                                                            background: "#1e293b",
                                                            border: "1px solid #334155",
                                                            color: "#cbd5e1",
                                                            borderRadius: 8,
                                                            padding: "6px 10px",
                                                            fontSize: 12,
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        🔁
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal for Editing / Saving Customer Information */}
            {editingCustomerOrder && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.75)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                    padding: 20
                }}>
                    <div style={{
                        background: "#131922",
                        border: "1px solid #2a374a",
                        borderRadius: 18,
                        padding: "26px 30px",
                        maxWidth: 480,
                        width: "100%",
                        boxShadow: "0 20px 50px rgba(0,0,0,0.6)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                                <span>👤</span> {t.custDetailsTitle}
                            </h3>
                            <button
                                onClick={() => setEditingCustomerOrder(null)}
                                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>
                                    {t.custNameLabel}
                                </label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder={t.custNamePlaceholder}
                                    style={{
                                        width: "100%",
                                        background: "#0c1015",
                                        border: "1px solid #2a384c",
                                        borderRadius: 10,
                                        padding: "10px 14px",
                                        color: "#fff",
                                        fontSize: 13,
                                        outline: "none"
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>
                                    {t.custPhoneLabel}
                                </label>
                                <input
                                    type="tel"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder={t.custPhonePlaceholder}
                                    style={{
                                        width: "100%",
                                        background: "#0c1015",
                                        border: "1px solid #2a384c",
                                        borderRadius: 10,
                                        padding: "10px 14px",
                                        color: "#fff",
                                        fontSize: 13,
                                        outline: "none"
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>
                                    {t.custAddressLabel}
                                </label>
                                <textarea
                                    rows={2}
                                    value={editForm.address}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder={t.custAddressPlaceholder}
                                    style={{
                                        width: "100%",
                                        background: "#0c1015",
                                        border: "1px solid #2a384c",
                                        borderRadius: 10,
                                        padding: "10px 14px",
                                        color: "#fff",
                                        fontSize: 13,
                                        outline: "none",
                                        fontFamily: "inherit"
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                                <button
                                    onClick={() => setEditingCustomerOrder(null)}
                                    style={{
                                        background: "#1c2532",
                                        border: "1px solid #334155",
                                        color: "#cbd5e1",
                                        borderRadius: 10,
                                        padding: "10px 18px",
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: "pointer"
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleSaveCustomer(editingCustomerOrder)}
                                    disabled={savingCustomer}
                                    style={{
                                        background: "#25D366",
                                        border: "none",
                                        color: "#000",
                                        borderRadius: 10,
                                        padding: "10px 22px",
                                        fontSize: 13,
                                        fontWeight: 700,
                                        cursor: "pointer"
                                    }}
                                >
                                    {savingCustomer ? "Saving..." : t.saveCustomerBtn}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
