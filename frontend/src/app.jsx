import { useState, useEffect } from "react"
import ChatBox from "./components/ChatBox"
import OrderPanel from "./components/OrderPanel"
import BillCard from "./components/BillCard"
import PreviousOrdersSidebar from "./components/PreviousOrdersSidebar"
import ShopkeeperDashboard from "./components/ShopkeeperDashboard"
import { translations, LANGUAGES } from "./utils/translations"

const STORAGE_KEY = "kirana_active_session"
const LANG_STORAGE_KEY = "kirana_selected_lang"
const ROLE_STORAGE_KEY = "kirana_active_role"

function loadSession() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) return JSON.parse(raw)
    } catch {}
    return null
}

function saveSession(session) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } catch {}
}

function clearSession() {
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch {}
}

const INIT_MSG = [{ role: "bot", text: "Namaste! 🙏 Apna order boliye ya likhiye — Hindi ya English mein." }]

export default function App() {
    // Mode: "customer" vs "shopkeeper"
    const [role, setRole] = useState(() => {
        try {
            return localStorage.getItem(ROLE_STORAGE_KEY) || "customer"
        } catch {
            return "customer"
        }
    })

    const [activeTab, setActiveTab] = useState("chat") // "chat", "summary", "bill"
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [lang, setLang] = useState(() => {
        try {
            return localStorage.getItem(LANG_STORAGE_KEY) || "en"
        } catch {
            return "en"
        }
    })

    // Store & Shopkeeper details
    const [storeProfile, setStoreProfile] = useState({
        store_name: "Apna Kirana Store",
        owner_name: "Ramesh Kumar",
        phone: "+91 98765 43210",
        address: "Main Market Road, City Centre, Near Clock Tower",
        upi_id: "apnakirana@upi",
        gstin: "27AABCS1429B1Z",
        opening_hours: "8:00 AM - 10:00 PM"
    })

    const fetchStoreProfile = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/store")
            if (res.ok) {
                const data = await res.json()
                setStoreProfile(data)
            }
        } catch (e) {
            console.error("Failed to load store profile", e)
        }
    }

    useEffect(() => {
        fetchStoreProfile()
    }, [])

    const handleRoleChange = (newRole) => {
        setRole(newRole)
        try {
            localStorage.setItem(ROLE_STORAGE_KEY, newRole)
        } catch {}
        fetchStoreProfile()
    }

    const handleLangChange = (newLang) => {
        setLang(newLang)
        try {
            localStorage.setItem(LANG_STORAGE_KEY, newLang)
        } catch {}
    }

    const t = translations[lang] || translations.en

    // Restore customer session
    const saved = loadSession()
    const [conversationId, setConversationId] = useState(saved?.conversationId || null)
    const [messages, setMessages] = useState(saved?.messages || INIT_MSG)
    const [confirmed, setConfirmed] = useState(saved?.confirmed || [])
    const [pending, setPending] = useState(saved?.pending || [])
    const [bill, setBill] = useState(saved?.bill || null)
    const [state, setState] = useState(saved?.state || "active")
    const [loading, setLoading] = useState(false)
    const [orderStatus, setOrderStatus] = useState(saved?.orderStatus || "pending") // "pending", "confirmed", "delivered", "cancelled"

    // Persist session to localStorage
    useEffect(() => {
        if (conversationId || messages.length > 1) {
            saveSession({ conversationId, messages, confirmed, pending, bill, state, orderStatus })
        }
    }, [conversationId, messages, confirmed, pending, bill, state, orderStatus])

    // Sync messages to backend DB
    useEffect(() => {
        if (conversationId && messages.length > 1) {
            fetch(`http://localhost:5000/api/conversation/${conversationId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages })
            }).catch(() => {})
        }
    }, [conversationId, messages])

    // ── Real-Time Order Status Polling for Customer Side ─────────────────────
    // When the shopkeeper confirms or updates the order on their dashboard,
    // the customer's UI instantly receives and displays the update!
    useEffect(() => {
        if (!conversationId) return

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`http://localhost:5000/api/orders/${conversationId}`)
                if (res.ok) {
                    const data = await res.json()
                    if (data && data.status && data.status !== orderStatus) {
                        setOrderStatus(data.status)
                        if (data.status === "confirmed" && state !== "confirmed") {
                            setState("confirmed")
                        }
                    }
                }
            } catch {}
        }, 3000)

        return () => clearInterval(interval)
    }, [conversationId, orderStatus, state])

    const sendMessage = async (text) => {
        setMessages(prev => [...prev, { role: "user", text }])
        setLoading(true)

        const endpoint = state === "awaiting_clarification"
            ? "http://localhost:5000/api/reply"
            : "http://localhost:5000/api/message"

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text, conversation_id: conversationId })
            })
            const data = await res.json()

            if (!conversationId && data.conversation_id) setConversationId(data.conversation_id)
            setConfirmed(data.confirmed || [])
            setPending(data.pending || [])
            setBill(data.final_bill || data.bill_preview || null)
            setState(data.state || "active")

            setMessages(prev => [...prev, { role: "bot", text: data.bot_reply }])
        } catch (err) {
            console.error("Order error", err)
            setMessages(prev => [...prev, { role: "bot", text: "Sorry, technical error. Please try again." }])
        } finally {
            setLoading(false)
        }
    }

    const resetOrder = () => {
        if (confirmed.length > 0 && !window.confirm("Start a new order? Current order will be reset.")) {
            return
        }
        clearSession()
        setConversationId(null)
        setMessages(INIT_MSG)
        setConfirmed([])
        setPending([])
        setBill(null)
        setState("active")
        setOrderStatus("pending")
        setActiveTab("chat")
    }

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            background: "#0c0e12",
            color: "#f1f5f9",
            fontFamily: "'Inter', sans-serif",
            overflow: "hidden"
        }}>
            {/* Top Navigation Bar */}
            <header className="no-print" style={{
                height: 64,
                background: "#11151c",
                borderBottom: "1px solid #1f2732",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 20px",
                flexShrink: 0,
                boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                zIndex: 20
            }}>
                {/* Brand & Store Identity */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: role === "shopkeeper" ? "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" : "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18
                    }}>
                        {role === "shopkeeper" ? "🏪" : "🛒"}
                    </div>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                            <span>{storeProfile.store_name || t.appName}</span>
                            <span style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "#25D366",
                                display: "inline-block",
                                boxShadow: "0 0 8px #25D366"
                            }} />
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                            {role === "shopkeeper" ? `Shopkeeper Portal · ${storeProfile.owner_name}` : `AI Voice Kirana · Call ${storeProfile.phone}`}
                        </div>
                    </div>
                </div>

                {/* Navigation Controls: Customer Mode Tabs */}
                {role === "customer" && (
                    <nav style={{
                        display: "flex",
                        background: "#0b0d11",
                        border: "1px solid #1e2632",
                        borderRadius: 12,
                        padding: 4,
                        gap: 4
                    }}>
                        <button
                            onClick={() => setActiveTab("chat")}
                            style={{
                                display: "flex", alignItems: "center", gap: 6,
                                padding: "8px 16px", borderRadius: 8, border: "none",
                                background: activeTab === "chat" ? "#1f2937" : "transparent",
                                color: activeTab === "chat" ? "#25D366" : "#94a3b8",
                                fontWeight: activeTab === "chat" ? 700 : 500, fontSize: 13, cursor: "pointer"
                            }}
                        >
                            <span>💬</span>
                            <span>{t.tabChat}</span>
                        </button>

                        <button
                            onClick={() => setActiveTab("summary")}
                            style={{
                                display: "flex", alignItems: "center", gap: 6,
                                padding: "8px 16px", borderRadius: 8, border: "none",
                                background: activeTab === "summary" ? "#1f2937" : "transparent",
                                color: activeTab === "summary" ? "#25D366" : "#94a3b8",
                                fontWeight: activeTab === "summary" ? 700 : 500, fontSize: 13, cursor: "pointer"
                            }}
                        >
                            <span>📦</span>
                            <span>{t.tabSummary}</span>
                            {confirmed.length > 0 && (
                                <span style={{ background: "#25D366", color: "#000", fontSize: 11, fontWeight: 800, borderRadius: 10, padding: "1px 6px" }}>
                                    {confirmed.length}
                                </span>
                            )}
                            {pending.length > 0 && (
                                <span style={{ background: "#f59e0b", color: "#000", fontSize: 11, fontWeight: 800, borderRadius: 10, padding: "1px 6px" }}>
                                    {pending.length} ⚠️
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab("bill")}
                            style={{
                                display: "flex", alignItems: "center", gap: 6,
                                padding: "8px 16px", borderRadius: 8, border: "none",
                                background: activeTab === "bill" ? "#1f2937" : "transparent",
                                color: activeTab === "bill" ? "#25D366" : "#94a3b8",
                                fontWeight: activeTab === "bill" ? 700 : 500, fontSize: 13, cursor: "pointer"
                            }}
                        >
                            <span>🧾</span>
                            <span>{t.tabBill}</span>
                            {bill && (
                                <span style={{
                                    background: state === "confirmed" ? "#0d331e" : "#2a1e0b",
                                    color: state === "confirmed" ? "#25D366" : "#f59e0b",
                                    fontSize: 11, fontWeight: 800, borderRadius: 6, padding: "1px 6px"
                                }}>
                                    ₹{bill.grand_total}
                                </span>
                            )}
                        </button>
                    </nav>
                )}

                {/* Right controls: Role Switcher & Multi-Lingual */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Role Switcher Toggle */}
                    <div style={{
                        display: "flex",
                        background: "#0c1016",
                        border: "1px solid #233142",
                        borderRadius: 10,
                        padding: 3,
                        gap: 2
                    }}>
                        <button
                            onClick={() => handleRoleChange("customer")}
                            style={{
                                background: role === "customer" ? "#1b3323" : "transparent",
                                color: role === "customer" ? "#4ade80" : "#94a3b8",
                                border: role === "customer" ? "1px solid #1c6136" : "none",
                                borderRadius: 8,
                                padding: "6px 12px",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 5
                            }}
                        >
                            <span>🛍️</span>
                            <span>Customer</span>
                        </button>

                        <button
                            onClick={() => handleRoleChange("shopkeeper")}
                            style={{
                                background: role === "shopkeeper" ? "#1e293b" : "transparent",
                                color: role === "shopkeeper" ? "#60a5fa" : "#94a3b8",
                                border: role === "shopkeeper" ? "1px solid #3b82f6" : "none",
                                borderRadius: 8,
                                padding: "6px 12px",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 5
                            }}
                        >
                            <span>🏪</span>
                            <span>Shopkeeper</span>
                        </button>
                    </div>

                    {/* Language Selector */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#18202a",
                        border: "1px solid #2b3644",
                        borderRadius: 10,
                        padding: "4px 8px"
                    }}>
                        <span style={{ fontSize: 13 }}>🌐</span>
                        <select
                            value={lang}
                            onChange={(e) => handleLangChange(e.target.value)}
                            style={{
                                background: "transparent",
                                color: "#25D366",
                                border: "none",
                                outline: "none",
                                fontSize: 12,
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

                    {role === "customer" && (
                        <>
                            <button
                                onClick={resetOrder}
                                title="Start a fresh new customer order"
                                style={{
                                    background: "#18202a", border: "1px solid #2b3644", color: "#cbd5e1",
                                    padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer"
                                }}
                            >
                                ➕ {t.newOrder}
                            </button>

                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                title="Past Orders"
                                style={{
                                    background: sidebarOpen ? "#1e293b" : "#18202a",
                                    border: sidebarOpen ? "1px solid #3b82f6" : "1px solid #2b3644",
                                    color: sidebarOpen ? "#60a5fa" : "#cbd5e1",
                                    padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer"
                                }}
                            >
                                📋 {sidebarOpen ? t.hideHistory : t.pastOrders}
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* ══════════════════════════════════════════════════════════════════════
                CUSTOMER VIEW
               ══════════════════════════════════════════════════════════════════════ */}
            {role === "customer" ? (
                <div style={{ flex: 1, display: "flex", overflow: "hidden", flexDirection: "column" }}>
                    {/* Live Store Details Banner provided to Customer */}
                    <div style={{
                        background: "linear-gradient(90deg, #101924 0%, #0d1218 100%)",
                        borderBottom: "1px solid #1a2533",
                        padding: "8px 24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 12,
                        fontSize: 12
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                            <span style={{ color: "#25D366", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                                <span>🏪</span> {storeProfile.store_name}
                            </span>
                            <span style={{ color: "#94a3b8" }}>
                                👤 {t.storeOwner}: <strong style={{ color: "#e2e8f0" }}>{storeProfile.owner_name}</strong>
                            </span>
                            <span style={{ color: "#94a3b8" }}>
                                📞 {t.storePhone}: <strong style={{ color: "#60a5fa" }}>{storeProfile.phone}</strong>
                            </span>
                            <span style={{ color: "#94a3b8" }}>
                                📍 {t.storeAddress}: <span style={{ color: "#cbd5e1" }}>{storeProfile.address}</span>
                            </span>
                        </div>

                        {storeProfile.upi_id && (
                            <div style={{ background: "#0c1f15", border: "1px solid #1a4a2d", borderRadius: 6, padding: "3px 8px", color: "#86efac", fontSize: 11 }}>
                                💳 UPI: {storeProfile.upi_id}
                            </div>
                        )}
                    </div>

                    {/* Live Order Confirmation Status Banner (Updates live when shopkeeper confirms!) */}
                    {conversationId && confirmed.length > 0 && (
                        <div style={{
                            background: orderStatus === "delivered" ? "#0f2f1d" : orderStatus === "confirmed" ? "#0d331e" : "#2d2009",
                            borderBottom: orderStatus === "delivered" || orderStatus === "confirmed" ? "1px solid #1c6136" : "1px solid #573a0e",
                            padding: "8px 24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: 12,
                            fontWeight: 700,
                            color: orderStatus === "delivered" ? "#4ade80" : orderStatus === "confirmed" ? "#25D366" : "#f59e0b",
                            transition: "all 0.3s ease"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 14 }}>
                                    {orderStatus === "delivered" ? "🎉" : orderStatus === "confirmed" ? "✓" : "⏳"}
                                </span>
                                <span>
                                    {orderStatus === "delivered"
                                        ? t.liveStatusDelivered
                                        : orderStatus === "confirmed"
                                        ? t.liveStatusConfirmed
                                        : t.liveStatusPending}
                                </span>
                            </div>
                            <span style={{
                                background: "rgba(0,0,0,0.3)",
                                padding: "2px 8px",
                                borderRadius: 4,
                                fontSize: 11,
                                letterSpacing: 0.5
                            }}>
                                INVOICE #ORD-{conversationId}
                            </span>
                        </div>
                    )}

                    {/* Main Workspace with Previous Orders Sidebar */}
                    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                        <PreviousOrdersSidebar
                            isOpen={sidebarOpen}
                            onToggle={() => setSidebarOpen(!sidebarOpen)}
                            currentOrderId={conversationId}
                            onReorder={(reorderText) => {
                                setActiveTab("chat")
                                sendMessage(reorderText)
                            }}
                        />

                        <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                            {activeTab === "chat" && (
                                <ChatBox
                                    messages={messages}
                                    onSend={sendMessage}
                                    loading={loading}
                                    confirmedCount={confirmed.length}
                                    grandTotal={bill?.grand_total}
                                    onNavigateToSummary={() => setActiveTab("summary")}
                                />
                            )}

                            {activeTab === "summary" && (
                                <OrderPanel
                                    confirmed={confirmed}
                                    pending={pending}
                                    grandTotal={bill?.grand_total}
                                    onClarify={(optionText) => sendMessage(optionText)}
                                    onNavigateToChat={() => setActiveTab("chat")}
                                    onNavigateToBill={() => setActiveTab("bill")}
                                />
                            )}

                            {activeTab === "bill" && (
                                <BillCard
                                    bill={bill}
                                    state={orderStatus === "confirmed" ? "confirmed" : state}
                                    orderId={conversationId}
                                    lang={lang}
                                    storeProfile={storeProfile}
                                    onNavigateToSummary={() => setActiveTab("summary")}
                                    onReset={resetOrder}
                                />
                            )}
                        </main>
                    </div>
                </div>
            ) : (
                /* ══════════════════════════════════════════════════════════════════════
                    SHOPKEEPER PORTAL VIEW
                   ══════════════════════════════════════════════════════════════════════ */
                <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                    <ShopkeeperDashboard
                        lang={lang}
                        onLangChange={handleLangChange}
                        onReorder={(reorderText) => {
                            handleRoleChange("customer")
                            setActiveTab("chat")
                            sendMessage(reorderText)
                        }}
                    />
                </main>
            )}
        </div>
    )
}