import { useState, useEffect } from "react"
import { translations, LANGUAGES } from "../utils/translations"

export default function ShopkeeperDashboard({ lang, onLangChange, onReorder }) {
    const t = translations[lang] || translations.en
    const [subTab, setSubTab] = useState("orders") // "orders", "inventory", "profile"
    
    // Orders state
    const [orders, setOrders] = useState([])
    const [stats, setStats] = useState(null)
    const [loadingOrders, setLoadingOrders] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [editingCustomerOrder, setEditingCustomerOrder] = useState(null)
    const [editCustomerForm, setEditCustomerForm] = useState({ name: "", phone: "", address: "" })
    const [savingCustomer, setSavingCustomer] = useState(false)

    // Store profile state
    const [storeProfile, setStoreProfile] = useState({
        store_name: "Apna Kirana Store",
        owner_name: "Ramesh Kumar",
        phone: "+91 98765 43210",
        address: "Main Market Road, City Centre, Near Clock Tower",
        upi_id: "apnakirana@upi",
        gstin: "27AABCS1429B1Z",
        opening_hours: "8:00 AM - 10:00 PM"
    })
    const [savingStore, setSavingStore] = useState(false)
    const [storeSaveSuccess, setStoreSaveSuccess] = useState(false)

    // Inventory state
    const [products, setProducts] = useState([])
    const [loadingProducts, setLoadingProducts] = useState(false)
    const [inventorySearch, setInventorySearch] = useState("")
    const [showAddProductModal, setShowAddProductModal] = useState(false)
    const [newProductForm, setNewProductForm] = useState({
        name: "",
        category: "grocery",
        brand: "",
        unit: "packet",
        price: "",
        stock: ""
    })
    const [addingProduct, setAddingProduct] = useState(false)

    // Initial data fetch
    const fetchDashboardData = async () => {
        setLoadingOrders(true)
        try {
            const [ordersRes, statsRes, storeRes] = await Promise.all([
                fetch("http://localhost:5000/api/orders"),
                fetch("http://localhost:5000/api/shopkeeper/stats"),
                fetch("http://localhost:5000/api/store")
            ])
            if (ordersRes.ok) {
                const ordersData = await ordersRes.json()
                setOrders(Array.isArray(ordersData) ? ordersData : [])
            }
            if (statsRes.ok) {
                const statsData = await statsRes.json()
                setStats(statsData)
            }
            if (storeRes.ok) {
                const storeData = await storeRes.json()
                setStoreProfile(storeData)
            }
        } catch (e) {
            console.error("Failed to load shopkeeper dashboard data", e)
        } finally {
            setLoadingOrders(false)
        }
    }

    const fetchProducts = async () => {
        setLoadingProducts(true)
        try {
            const res = await fetch("http://localhost:5000/api/products")
            if (res.ok) {
                const data = await res.json()
                setProducts(Array.isArray(data) ? data : [])
            }
        } catch (e) {
            console.error("Failed to load products", e)
        } finally {
            setLoadingProducts(false)
        }
    }

    useEffect(() => {
        fetchDashboardData()
        fetchProducts()
    }, [])

    // ── Order status update (e.g. Confirm, Deliver) ───────────────────────────
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

    // ── Store details update ────────────────────────────────────────────────
    const handleSaveStore = async (e) => {
        if (e) e.preventDefault()
        setSavingStore(true)
        try {
            const res = await fetch("http://localhost:5000/api/store", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(storeProfile)
            })
            if (res.ok) {
                setStoreSaveSuccess(true)
                setTimeout(() => setStoreSaveSuccess(false), 4000)
            }
        } catch (e) {
            console.error("Failed to update store settings", e)
        } finally {
            setSavingStore(false)
        }
    }

    // ── Customer details update ─────────────────────────────────────────────
    const handleSaveCustomer = async (orderId) => {
        setSavingCustomer(true)
        try {
            const res = await fetch(`http://localhost:5000/api/orders/${orderId}/customer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editCustomerForm)
            })
            if (res.ok) {
                setOrders(prev => prev.map(o => o.id === orderId ? {
                    ...o,
                    customer_name: editCustomerForm.name,
                    customer_phone: editCustomerForm.phone,
                    customer_address: editCustomerForm.address
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

    // ── Inventory quick stock update (+ / -) ────────────────────────────────
    const handleQuickStockAdjust = async (product, delta) => {
        const newStock = Math.max(0, product.stock + delta)
        try {
            const res = await fetch(`http://localhost:5000/api/products/${product.id}/update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stock: newStock })
            })
            if (res.ok) {
                setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: newStock } : p))
            }
        } catch (e) {
            console.error("Failed to adjust stock", e)
        }
    }

    // ── Add new product ─────────────────────────────────────────────────────
    const handleAddProduct = async (e) => {
        e.preventDefault()
        if (!newProductForm.name.trim()) return
        setAddingProduct(true)
        try {
            const res = await fetch("http://localhost:5000/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newProductForm.name,
                    category: newProductForm.category,
                    brand: newProductForm.brand,
                    unit: newProductForm.unit,
                    price: parseFloat(newProductForm.price) || 0,
                    stock: parseInt(newProductForm.stock) || 0
                })
            })
            if (res.ok) {
                setShowAddProductModal(false)
                setNewProductForm({ name: "", category: "grocery", brand: "", unit: "packet", price: "", stock: "" })
                fetchProducts()
            }
        } catch (e) {
            console.error("Failed to add product", e)
        } finally {
            setAddingProduct(false)
        }
    }

    // Filter orders
    const filteredOrders = orders.filter(order => {
        if (statusFilter !== "all" && order.status !== statusFilter) return false
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase()
        const matchName = (order.customer_name || "").toLowerCase().includes(q)
        const matchPhone = (order.customer_phone || "").toLowerCase().includes(q)
        const matchAddress = (order.customer_address || "").toLowerCase().includes(q)
        const matchId = `ord-${order.id}`.toLowerCase().includes(q) || String(order.id).includes(q)
        const matchItems = order.items?.some(i => i.product_name.toLowerCase().includes(q))
        return matchName || matchPhone || matchAddress || matchId || matchItems
    })

    // Filter products
    const filteredProducts = products.filter(p => {
        if (!inventorySearch.trim()) return true
        const q = inventorySearch.toLowerCase()
        return p.name.toLowerCase().includes(q) ||
               (p.brand || "").toLowerCase().includes(q) ||
               (p.category || "").toLowerCase().includes(q)
    })

    return (
        <div style={{
            maxWidth: 1160,
            margin: "0 auto",
            padding: "24px 20px 60px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Top Navigation & Subtabs */}
            <div style={{
                background: "linear-gradient(135deg, #131922 0%, #0d1218 100%)",
                border: "1px solid #222d3b",
                borderRadius: 18,
                padding: "20px 24px",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
            }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 24 }}>🏪</span>
                        <div>
                            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>
                                {storeProfile.store_name || "Apna Kirana Store"} — {t.shopkeeperMode}
                            </h2>
                            <div style={{ fontSize: 12, color: "#86efac", fontWeight: 600, marginTop: 2 }}>
                                👤 {storeProfile.owner_name} · 📞 {storeProfile.phone} · 📍 {storeProfile.address}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sub-tab navigation */}
                <div style={{
                    display: "flex",
                    background: "#0c1015",
                    border: "1px solid #243142",
                    borderRadius: 12,
                    padding: 4,
                    gap: 4
                }}>
                    <button
                        onClick={() => setSubTab("orders")}
                        style={{
                            background: subTab === "orders" ? "#1e293b" : "transparent",
                            color: subTab === "orders" ? "#25D366" : "#94a3b8",
                            border: "none",
                            borderRadius: 8,
                            padding: "8px 16px",
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                        }}
                    >
                        {t.skTabOrders}
                    </button>
                    <button
                        onClick={() => setSubTab("inventory")}
                        style={{
                            background: subTab === "inventory" ? "#1e293b" : "transparent",
                            color: subTab === "inventory" ? "#25D366" : "#94a3b8",
                            border: "none",
                            borderRadius: 8,
                            padding: "8px 16px",
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                        }}
                    >
                        {t.skTabInventory}
                    </button>
                    <button
                        onClick={() => setSubTab("profile")}
                        style={{
                            background: subTab === "profile" ? "#1e293b" : "transparent",
                            color: subTab === "profile" ? "#25D366" : "#94a3b8",
                            border: "none",
                            borderRadius: 8,
                            padding: "8px 16px",
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                        }}
                    >
                        {t.skTabProfile}
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════════
                SUB-TAB 1: CUSTOMER ORDERS & BILLING
               ══════════════════════════════════════════════════════════════════════ */}
            {subTab === "orders" && (
                <>
                    {/* Metric Stats Cards */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                        gap: 14
                    }}>
                        <div style={{
                            background: "linear-gradient(135deg, #0d2818 0%, #081a10 100%)",
                            border: "1px solid #1a562d",
                            borderRadius: 14,
                            padding: "18px 20px"
                        }}>
                            <div style={{ fontSize: 11, color: "#86efac", fontWeight: 700, textTransform: "uppercase" }}>
                                {t.statTotalRevenue}
                            </div>
                            <div style={{ fontSize: 26, fontWeight: 800, color: "#25D366", marginTop: 6 }}>
                                ₹{stats?.total_revenue?.toFixed(2) || "0.00"}
                            </div>
                            <div style={{ fontSize: 11, color: "#4ade80", marginTop: 2 }}>
                                {stats?.confirmed_orders || 0} {t.statConfirmed}
                            </div>
                        </div>

                        <div style={{
                            background: "linear-gradient(135deg, #182232 0%, #101722 100%)",
                            border: "1px solid #253852",
                            borderRadius: 14,
                            padding: "18px 20px"
                        }}>
                            <div style={{ fontSize: 11, color: "#93c5fd", fontWeight: 700, textTransform: "uppercase" }}>
                                {t.statTodaySales}
                            </div>
                            <div style={{ fontSize: 26, fontWeight: 800, color: "#60a5fa", marginTop: 6 }}>
                                ₹{stats?.today_revenue?.toFixed(2) || "0.00"}
                            </div>
                            <div style={{ fontSize: 11, color: "#93c5fd", marginTop: 2 }}>
                                {stats?.today_orders || 0} {t.statTodayOrders}
                            </div>
                        </div>

                        <div style={{
                            background: "linear-gradient(135deg, #201c10 0%, #171308 100%)",
                            border: "1px solid #4a3e1c",
                            borderRadius: 14,
                            padding: "18px 20px"
                        }}>
                            <div style={{ fontSize: 11, color: "#fde047", fontWeight: 700, textTransform: "uppercase" }}>
                                {t.statTotalOrders}
                            </div>
                            <div style={{ fontSize: 26, fontWeight: 800, color: "#facc15", marginTop: 6 }}>
                                {stats?.total_orders || 0}
                            </div>
                            <div style={{ fontSize: 11, color: "#ca8a04", marginTop: 2 }}>
                                Total customer sessions
                            </div>
                        </div>

                        <div style={{
                            background: "linear-gradient(135deg, #1f142b 0%, #140d1c 100%)",
                            border: "1px solid #472d62",
                            borderRadius: 14,
                            padding: "18px 20px"
                        }}>
                            <div style={{ fontSize: 11, color: "#d8b4fe", fontWeight: 700, textTransform: "uppercase" }}>
                                {t.statUniqueCustomers}
                            </div>
                            <div style={{ fontSize: 26, fontWeight: 800, color: "#c084fc", marginTop: 6 }}>
                                {stats?.unique_customers || 0}
                            </div>
                            <div style={{ fontSize: 11, color: "#a855f7", marginTop: 2 }}>
                                Registered Profiles
                            </div>
                        </div>
                    </div>

                    {/* Search & Filter Controls */}
                    <div style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}>
                        <div style={{ flex: 1, minWidth: 260 }}>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t.searchPlaceholder}
                                style={{
                                    width: "100%",
                                    background: "#11161f",
                                    border: "1px solid #222d3b",
                                    borderRadius: 10,
                                    padding: "10px 16px",
                                    color: "#fff",
                                    fontSize: 13,
                                    outline: "none"
                                }}
                            />
                        </div>

                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {[
                                { key: "all", label: t.filterAll },
                                { key: "pending", label: t.filterPending },
                                { key: "confirmed", label: t.filterConfirmed },
                                { key: "delivered", label: t.filterDelivered }
                            ].map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setStatusFilter(f.key)}
                                    style={{
                                        background: statusFilter === f.key ? "#25D366" : "#161d27",
                                        color: statusFilter === f.key ? "#000" : "#94a3b8",
                                        border: statusFilter === f.key ? "none" : "1px solid #263344",
                                        borderRadius: 8,
                                        padding: "7px 12px",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: "pointer"
                                    }}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Orders Table */}
                    <div style={{
                        background: "#10151d",
                        border: "1px solid #202b3a",
                        borderRadius: 16,
                        overflow: "hidden"
                    }}>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: "#151c27", borderBottom: "1px solid #253346", color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                                        <th style={{ padding: "14px 18px" }}>{t.thOrder}</th>
                                        <th style={{ padding: "14px 18px" }}>{t.thCustomer}</th>
                                        <th style={{ padding: "14px 18px" }}>{t.thItems}</th>
                                        <th style={{ padding: "14px 18px", textAlign: "right" }}>{t.thTotal}</th>
                                        <th style={{ padding: "14px 18px", textAlign: "center" }}>{t.thStatus}</th>
                                        <th style={{ padding: "14px 18px", textAlign: "right" }}>{t.thActions}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingOrders ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                                                ⏳ Loading orders...
                                            </td>
                                        </tr>
                                    ) : filteredOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                                                {t.noOrdersFound}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredOrders.map(order => {
                                            const isConfirmed = order.status === "confirmed"
                                            const isDelivered = order.status === "delivered"
                                            const isPending = order.status === "pending"

                                            return (
                                                <tr key={order.id} style={{ borderBottom: "1px solid #1a2330" }}>
                                                    {/* Invoice */}
                                                    <td style={{ padding: "14px 18px", verticalAlign: "top" }}>
                                                        <div style={{ fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>
                                                            #ORD-{order.id}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                                                            {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                                        </div>
                                                    </td>

                                                    {/* Customer Details */}
                                                    <td style={{ padding: "14px 18px", verticalAlign: "top" }}>
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
                                                            onClick={() => {
                                                                setEditingCustomerOrder(order.id)
                                                                setEditCustomerForm({
                                                                    name: order.customer_name || "",
                                                                    phone: order.customer_phone || "",
                                                                    address: order.customer_address || ""
                                                                })
                                                            }}
                                                            style={{
                                                                background: "none",
                                                                border: "none",
                                                                color: "#38bdf8",
                                                                fontSize: 11,
                                                                padding: 0,
                                                                marginTop: 3,
                                                                cursor: "pointer",
                                                                textDecoration: "underline"
                                                            }}
                                                        >
                                                            ✏️ Edit
                                                        </button>
                                                    </td>

                                                    {/* Items */}
                                                    <td style={{ padding: "14px 18px", verticalAlign: "top" }}>
                                                        {order.items?.map((it, idx) => (
                                                            <div key={idx} style={{ fontSize: 12, padding: "1px 0" }}>
                                                                • {it.product_name} <span style={{ color: "#25D366" }}>×{it.qty}</span>
                                                            </div>
                                                        ))}
                                                    </td>

                                                    {/* Total */}
                                                    <td style={{ padding: "14px 18px", textAlign: "right", verticalAlign: "top" }}>
                                                        <div style={{ fontSize: 16, fontWeight: 800, color: "#25D366" }}>
                                                            ₹{order.total?.toFixed(2) || "0.00"}
                                                        </div>
                                                    </td>

                                                    {/* Status & Confirmation Action */}
                                                    <td style={{ padding: "14px 18px", textAlign: "center", verticalAlign: "top" }}>
                                                        <span style={{
                                                            display: "inline-block",
                                                            padding: "4px 8px",
                                                            borderRadius: 6,
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            background: isDelivered ? "#0f2f1d" : isConfirmed ? "#0d331e" : "#2d2009",
                                                            color: isDelivered ? "#4ade80" : isConfirmed ? "#25D366" : "#f59e0b",
                                                            border: isDelivered || isConfirmed ? "1px solid #1c6136" : "1px solid #573a0e"
                                                        }}>
                                                            {isDelivered ? "DELIVERED" : isConfirmed ? "CONFIRMED" : "PENDING"}
                                                        </span>

                                                        {/* 1-CLICK CONFIRM ORDER BY SHOPKEEPER */}
                                                        {isPending && (
                                                            <button
                                                                onClick={() => handleUpdateStatus(order.id, "confirmed")}
                                                                style={{
                                                                    display: "block",
                                                                    margin: "6px auto 0",
                                                                    background: "#25D366",
                                                                    color: "#000",
                                                                    border: "none",
                                                                    borderRadius: 6,
                                                                    padding: "4px 10px",
                                                                    fontSize: 11,
                                                                    fontWeight: 800,
                                                                    cursor: "pointer",
                                                                    boxShadow: "0 2px 8px rgba(37, 211, 102, 0.3)"
                                                                }}
                                                            >
                                                                {t.confirmOrderBtn}
                                                            </button>
                                                        )}

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

                                                    {/* Actions */}
                                                    <td style={{ padding: "14px 18px", textAlign: "right", verticalAlign: "top" }}>
                                                        <button
                                                            onClick={() => {
                                                                const text = `APNA KIRANA BILL #ORD-${order.id}\nCustomer: ${order.customer_name || 'Customer'}\nTotal: ₹${order.total}`
                                                                const phone = (order.customer_phone || "").replace(/[^0-9]/g, "")
                                                                window.open(`https://api.whatsapp.com/send?${phone ? `phone=${phone}&` : ''}text=${encodeURI(text)}`, "_blank")
                                                            }}
                                                            title="WhatsApp"
                                                            style={{ background: "#128C7E", border: "none", color: "#fff", borderRadius: 6, padding: "5px 8px", fontSize: 11, cursor: "pointer" }}
                                                        >
                                                            📲 WhatsApp
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                SUB-TAB 2: INVENTORY & STOCK MANAGEMENT
               ══════════════════════════════════════════════════════════════════════ */}
            {subTab === "inventory" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 12
                    }}>
                        <div>
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
                                {t.inventoryTitle} ({products.length} {t.thProduct})
                            </h3>
                            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                                {t.inventorySubtitle}
                            </p>
                        </div>

                        <div style={{ display: "flex", gap: 10 }}>
                            <input
                                type="text"
                                value={inventorySearch}
                                onChange={(e) => setInventorySearch(e.target.value)}
                                placeholder={t.searchInventory}
                                style={{
                                    background: "#11161f",
                                    border: "1px solid #222d3b",
                                    borderRadius: 10,
                                    padding: "8px 14px",
                                    color: "#fff",
                                    fontSize: 13,
                                    minWidth: 260
                                }}
                            />
                            <button
                                onClick={() => setShowAddProductModal(true)}
                                style={{
                                    background: "#25D366",
                                    color: "#000",
                                    border: "none",
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
                                {t.addProductBtn}
                            </button>
                        </div>
                    </div>

                    {/* Inventory Table */}
                    <div style={{
                        background: "#10151d",
                        border: "1px solid #202b3a",
                        borderRadius: 16,
                        overflow: "hidden"
                    }}>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: "#151c27", borderBottom: "1px solid #253346", color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                                        <th style={{ padding: "14px 18px" }}>#</th>
                                        <th style={{ padding: "14px 18px" }}>{t.thProduct}</th>
                                        <th style={{ padding: "14px 18px" }}>{t.thCategory}</th>
                                        <th style={{ padding: "14px 18px" }}>{t.thBrand}</th>
                                        <th style={{ padding: "14px 18px", textAlign: "right" }}>{t.thPrice}</th>
                                        <th style={{ padding: "14px 18px", textAlign: "center" }}>{t.thStock}</th>
                                        <th style={{ padding: "14px 18px", textAlign: "center" }}>{t.thStockActions}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingProducts ? (
                                        <tr>
                                            <td colSpan={7} style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                                                ⏳ Loading stock items...
                                            </td>
                                        </tr>
                                    ) : filteredProducts.slice(0, 50).map((prod, idx) => {
                                        const isOOS = prod.stock === 0
                                        const isLow = prod.stock > 0 && prod.stock <= 5

                                        return (
                                            <tr key={prod.id} style={{ borderBottom: "1px solid #1a2330" }}>
                                                <td style={{ padding: "12px 18px", color: "#64748b", fontSize: 11 }}>{idx + 1}</td>
                                                <td style={{ padding: "12px 18px", fontWeight: 600, color: "#fff" }}>
                                                    {prod.name}
                                                </td>
                                                <td style={{ padding: "12px 18px", color: "#94a3b8" }}>
                                                    <span style={{ background: "#1e293b", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>
                                                        {prod.category}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "12px 18px", color: "#94a3b8" }}>
                                                    {prod.brand || "—"}
                                                </td>
                                                <td style={{ padding: "12px 18px", textAlign: "right", fontWeight: 700, color: "#25D366" }}>
                                                    ₹{prod.price}
                                                </td>
                                                <td style={{ padding: "12px 18px", textAlign: "center" }}>
                                                    <span style={{
                                                        padding: "3px 8px",
                                                        borderRadius: 6,
                                                        fontSize: 11,
                                                        fontWeight: 800,
                                                        background: isOOS ? "#3b1111" : isLow ? "#3b2b09" : "#0d331e",
                                                        color: isOOS ? "#f87171" : isLow ? "#f59e0b" : "#4ade80"
                                                    }}>
                                                        {prod.stock} {prod.unit || "packets"}
                                                    </span>
                                                </td>
                                                {/* Quick Adjust Buttons */}
                                                <td style={{ padding: "12px 18px", textAlign: "center" }}>
                                                    <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                                                        <button
                                                            onClick={() => handleQuickStockAdjust(prod, -1)}
                                                            disabled={prod.stock === 0}
                                                            title="Subtract 1"
                                                            style={{ background: "#1e293b", border: "1px solid #334155", color: "#fff", borderRadius: 4, width: 26, height: 26, cursor: "pointer", fontWeight: 700 }}
                                                        >
                                                            -1
                                                        </button>
                                                        <button
                                                            onClick={() => handleQuickStockAdjust(prod, +1)}
                                                            title="Add 1"
                                                            style={{ background: "#1e293b", border: "1px solid #334155", color: "#fff", borderRadius: 4, width: 26, height: 26, cursor: "pointer", fontWeight: 700 }}
                                                        >
                                                            +1
                                                        </button>
                                                        <button
                                                            onClick={() => handleQuickStockAdjust(prod, +10)}
                                                            title="Add 10 Packets"
                                                            style={{ background: "#143323", border: "1px solid #1c6136", color: "#25D366", borderRadius: 4, padding: "0 6px", height: 26, fontSize: 11, cursor: "pointer", fontWeight: 700 }}
                                                        >
                                                            +10
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                SUB-TAB 3: SHOPKEEPER & STORE DETAILS PROFILE
               ══════════════════════════════════════════════════════════════════════ */}
            {subTab === "profile" && (
                <div style={{
                    background: "#11161f",
                    border: "1px solid #222d3b",
                    borderRadius: 18,
                    padding: "26px 30px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.25)"
                }}>
                    <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
                            {t.storeSettingsTitle}
                        </h3>
                        <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                            {t.storeSettingsSubtitle}
                        </p>
                    </div>

                    {storeSaveSuccess && (
                        <div style={{
                            background: "#0d331e",
                            border: "1px solid #1c6136",
                            color: "#86efac",
                            padding: "12px 18px",
                            borderRadius: 10,
                            marginBottom: 20,
                            fontSize: 13,
                            fontWeight: 600
                        }}>
                            {t.storeSavedSuccess}
                        </div>
                    )}

                    <form onSubmit={handleSaveStore} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
                            {/* Store Name */}
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>
                                    {t.storeNameLabel}
                                </label>
                                <input
                                    type="text"
                                    value={storeProfile.store_name}
                                    onChange={(e) => setStoreProfile({ ...storeProfile, store_name: e.target.value })}
                                    placeholder={t.storeNamePlaceholder}
                                    required
                                    style={{ width: "100%", background: "#0c1015", border: "1px solid #263344", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none" }}
                                />
                            </div>

                            {/* Owner Name */}
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>
                                    {t.ownerNameLabel}
                                </label>
                                <input
                                    type="text"
                                    value={storeProfile.owner_name}
                                    onChange={(e) => setStoreProfile({ ...storeProfile, owner_name: e.target.value })}
                                    placeholder={t.ownerNamePlaceholder}
                                    required
                                    style={{ width: "100%", background: "#0c1015", border: "1px solid #263344", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none" }}
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>
                                    {t.phoneLabel}
                                </label>
                                <input
                                    type="text"
                                    value={storeProfile.phone}
                                    onChange={(e) => setStoreProfile({ ...storeProfile, phone: e.target.value })}
                                    placeholder={t.phonePlaceholder}
                                    required
                                    style={{ width: "100%", background: "#0c1015", border: "1px solid #263344", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none" }}
                                />
                            </div>

                            {/* UPI ID */}
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>
                                    {t.upiLabel}
                                </label>
                                <input
                                    type="text"
                                    value={storeProfile.upi_id}
                                    onChange={(e) => setStoreProfile({ ...storeProfile, upi_id: e.target.value })}
                                    placeholder={t.upiPlaceholder}
                                    style={{ width: "100%", background: "#0c1015", border: "1px solid #263344", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none" }}
                                />
                            </div>
                        </div>

                        {/* Store Address */}
                        <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>
                                {t.addressLabel}
                            </label>
                            <input
                                type="text"
                                value={storeProfile.address}
                                onChange={(e) => setStoreProfile({ ...storeProfile, address: e.target.value })}
                                placeholder={t.addressPlaceholder}
                                style={{ width: "100%", background: "#0c1015", border: "1px solid #263344", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none" }}
                            />
                        </div>

                        {/* Hours */}
                        <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>
                                {t.hoursLabel}
                            </label>
                            <input
                                type="text"
                                value={storeProfile.opening_hours}
                                onChange={(e) => setStoreProfile({ ...storeProfile, opening_hours: e.target.value })}
                                placeholder={t.hoursPlaceholder}
                                style={{ width: "100%", background: "#0c1015", border: "1px solid #263344", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none" }}
                            />
                        </div>

                        <div style={{ marginTop: 10 }}>
                            <button
                                type="submit"
                                disabled={savingStore}
                                style={{
                                    background: "#25D366",
                                    color: "#000",
                                    border: "none",
                                    borderRadius: 10,
                                    padding: "12px 28px",
                                    fontSize: 14,
                                    fontWeight: 800,
                                    cursor: "pointer"
                                }}
                            >
                                {savingStore ? "Saving..." : t.saveStoreBtn}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Modal: Add New Product */}
            {showAddProductModal && (
                <div style={{
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.8)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 1000, padding: 20
                }}>
                    <div style={{
                        background: "#131922", border: "1px solid #2a374a", borderRadius: 16,
                        padding: "26px", maxWidth: 460, width: "100%"
                    }}>
                        <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 16 }}>
                            {t.addProductBtn}
                        </h3>
                        <form onSubmit={handleAddProduct} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <input
                                type="text"
                                placeholder={t.newProductName}
                                value={newProductForm.name}
                                onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                                required
                                style={{ background: "#0c1015", border: "1px solid #263344", borderRadius: 8, padding: "10px", color: "#fff", fontSize: 13 }}
                            />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                <input
                                    type="text"
                                    placeholder={t.newProductCategory}
                                    value={newProductForm.category}
                                    onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                                    style={{ background: "#0c1015", border: "1px solid #263344", borderRadius: 8, padding: "10px", color: "#fff", fontSize: 13 }}
                                />
                                <input
                                    type="text"
                                    placeholder={t.newProductBrand}
                                    value={newProductForm.brand}
                                    onChange={(e) => setNewProductForm({ ...newProductForm, brand: e.target.value })}
                                    style={{ background: "#0c1015", border: "1px solid #263344", borderRadius: 8, padding: "10px", color: "#fff", fontSize: 13 }}
                                />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                <input
                                    type="number"
                                    placeholder={t.newProductPrice}
                                    value={newProductForm.price}
                                    onChange={(e) => setNewProductForm({ ...newProductForm, price: e.target.value })}
                                    required
                                    style={{ background: "#0c1015", border: "1px solid #263344", borderRadius: 8, padding: "10px", color: "#fff", fontSize: 13 }}
                                />
                                <input
                                    type="number"
                                    placeholder={t.newProductStock}
                                    value={newProductForm.stock}
                                    onChange={(e) => setNewProductForm({ ...newProductForm, stock: e.target.value })}
                                    required
                                    style={{ background: "#0c1015", border: "1px solid #263344", borderRadius: 8, padding: "10px", color: "#fff", fontSize: 13 }}
                                />
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddProductModal(false)}
                                    style={{ background: "#1c2532", color: "#cbd5e1", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}
                                >
                                    {t.cancelBtn}
                                </button>
                                <button
                                    type="submit"
                                    disabled={addingProduct}
                                    style={{ background: "#25D366", color: "#000", border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 800, cursor: "pointer" }}
                                >
                                    {addingProduct ? "Adding..." : t.saveProductBtn}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Edit Customer Details */}
            {editingCustomerOrder && (
                <div style={{
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.8)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 1000, padding: 20
                }}>
                    <div style={{
                        background: "#131922", border: "1px solid #2a374a", borderRadius: 16,
                        padding: "24px", maxWidth: 440, width: "100%"
                    }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 14 }}>
                            {t.custDetailsTitle}
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <input
                                type="text"
                                placeholder={t.custNamePlaceholder}
                                value={editCustomerForm.name}
                                onChange={(e) => setEditCustomerForm({ ...editCustomerForm, name: e.target.value })}
                                style={{ background: "#0c1015", border: "1px solid #263344", borderRadius: 8, padding: "10px", color: "#fff", fontSize: 13 }}
                            />
                            <input
                                type="tel"
                                placeholder={t.custPhonePlaceholder}
                                value={editCustomerForm.phone}
                                onChange={(e) => setEditCustomerForm({ ...editCustomerForm, phone: e.target.value })}
                                style={{ background: "#0c1015", border: "1px solid #263344", borderRadius: 8, padding: "10px", color: "#fff", fontSize: 13 }}
                            />
                            <textarea
                                rows={2}
                                placeholder={t.custAddressPlaceholder}
                                value={editCustomerForm.address}
                                onChange={(e) => setEditCustomerForm({ ...editCustomerForm, address: e.target.value })}
                                style={{ background: "#0c1015", border: "1px solid #263344", borderRadius: 8, padding: "10px", color: "#fff", fontSize: 13 }}
                            />
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                                <button
                                    onClick={() => setEditingCustomerOrder(null)}
                                    style={{ background: "#1c2532", color: "#cbd5e1", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleSaveCustomer(editingCustomerOrder)}
                                    disabled={savingCustomer}
                                    style={{ background: "#25D366", color: "#000", border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 800, cursor: "pointer" }}
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
