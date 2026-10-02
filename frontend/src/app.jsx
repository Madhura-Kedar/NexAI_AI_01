import { useState, useEffect, useCallback } from "react"
import ChatBox from "./components/ChatBox"
import OrderPanel from "./components/OrderPanel"
import BillCard from "./components/BillCard"
import PreviousOrdersSidebar from "./components/PreviousOrdersSidebar"

const STORAGE_KEY = "kirana_active_session"

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
    const [activeTab, setActiveTab] = useState("chat")
    const [sidebarOpen, setSidebarOpen] = useState(true)

    // Restore session from localStorage on first mount
    const saved = loadSession()
    const [conversationId, setConversationId] = useState(saved?.conversationId || null)
    const [messages, setMessages] = useState(saved?.messages || INIT_MSG)
    const [confirmed, setConfirmed] = useState(saved?.confirmed || [])
    const [pending, setPending] = useState(saved?.pending || [])
    const [bill, setBill] = useState(saved?.bill || null)
    const [deliveryNote, setDeliveryNote] = useState(saved?.deliveryNote || "")
    const [state, setState] = useState(saved?.state || "active")
    const [loading, setLoading] = useState(false)

    // Persist session to localStorage whenever key state changes
    useEffect(() => {
        if (conversationId || messages.length > 1) {
            saveSession({ conversationId, messages, confirmed, pending, bill, deliveryNote, state })
        }
    }, [conversationId, messages, confirmed, pending, bill, deliveryNote, state])

    // Also sync messages to backend DB so sidebar can show full chat history per order
    useEffect(() => {
        if (conversationId && messages.length > 1) {
            fetch(`http://localhost:5000/api/conversation/${conversationId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages })
            }).catch(() => {})
        }
    }, [conversationId, messages])

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
            if (data.delivery_note) setDeliveryNote(data.delivery_note)

            setMessages(prev => [...prev, { role: "bot", text: data.bot_reply }])
        } catch (err) {
            console.error("Order error", err)
            setMessages(prev => [...prev, { role: "bot", text: "Sorry, kuch technical error aaya. Dobara try karein." }])
        } finally {
            setLoading(false)
        }
    }

    const resetOrder = () => {
        if (confirmed.length > 0 && !window.confirm("Kya aap naya order start karna chahte hain? Current order reset ho jayega.")) {
            return
        }
        clearSession()
        setConversationId(null)
        setMessages(INIT_MSG)
        setConfirmed([])
        setPending([])
        setBill(null)
        setDeliveryNote("")
        setState("active")
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
                padding: "0 24px",
                flexShrink: 0,
                boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                zIndex: 10
            }}>
                {/* Brand Logo & Store status */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18
                    }}>
                        🛒
                    </div>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                            <span>Kirana Order Desk</span>
                            <span style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "#25D366",
                                display: "inline-block",
                                boxShadow: "0 0 8px #25D366"
                            }} />
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>AI Hinglish Voice Assistant</div>
                    </div>
                </div>

                {/* Separate Pages Navigation Tabs */}
                <nav style={{
                    display: "flex",
                    background: "#0b0d11",
                    border: "1px solid #1e2632",
                    borderRadius: 12,
                    padding: 4,
                    gap: 4
                }}>
                    {/* Tab 1: Voice & Chat Desk */}
                    <button
                        onClick={() => setActiveTab("chat")}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 18px",
                            borderRadius: 8,
                            border: "none",
                            background: activeTab === "chat" ? "#1f2937" : "transparent",
                            color: activeTab === "chat" ? "#25D366" : "#94a3b8",
                            fontWeight: activeTab === "chat" ? 700 : 500,
                            fontSize: 13,
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                        }}
                    >
                        <span>💬</span>
                        <span>1. Voice & Chat Desk</span>
                    </button>

                    {/* Tab 2: Order Summary */}
                    <button
                        onClick={() => setActiveTab("summary")}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 18px",
                            borderRadius: 8,
                            border: "none",
                            background: activeTab === "summary" ? "#1f2937" : "transparent",
                            color: activeTab === "summary" ? "#25D366" : "#94a3b8",
                            fontWeight: activeTab === "summary" ? 700 : 500,
                            fontSize: 13,
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                        }}
                    >
                        <span>📦</span>
                        <span>2. Order Summary</span>
                        {confirmed.length > 0 && (
                            <span style={{
                                background: "#25D366",
                                color: "#000",
                                fontSize: 11,
                                fontWeight: 800,
                                borderRadius: 10,
                                padding: "1px 7px",
                                marginLeft: 2
                            }}>
                                {confirmed.length}
                            </span>
                        )}
                        {pending.length > 0 && (
                            <span style={{
                                background: "#f59e0b",
                                color: "#000",
                                fontSize: 11,
                                fontWeight: 800,
                                borderRadius: 10,
                                padding: "1px 7px",
                                marginLeft: 2
                            }}>
                                {pending.length} ⚠️
                            </span>
                        )}
                    </button>

                    {/* Tab 3: Final Bill */}
                    <button
                        onClick={() => setActiveTab("bill")}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 18px",
                            borderRadius: 8,
                            border: "none",
                            background: activeTab === "bill" ? "#1f2937" : "transparent",
                            color: activeTab === "bill" ? "#25D366" : "#94a3b8",
                            fontWeight: activeTab === "bill" ? 700 : 500,
                            fontSize: 13,
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                        }}
                    >
                        <span>🧾</span>
                        <span>3. Final Bill</span>
                        {bill && (
                            <span style={{
                                background: state === "confirmed" ? "#0d331e" : "#2a1e0b",
                                color: state === "confirmed" ? "#25D366" : "#f59e0b",
                                border: state === "confirmed" ? "1px solid #1c6136" : "1px solid #573a0e",
                                fontSize: 11,
                                fontWeight: 800,
                                borderRadius: 8,
                                padding: "1px 7px"
                            }}>
                                ₹{bill.grand_total}
                            </span>
                        )}
                    </button>
                </nav>

                {/* Right controls */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                        onClick={resetOrder}
                        title="Start a fresh new customer order"
                        style={{
                            background: "#18202a",
                            border: "1px solid #2b3644",
                            color: "#cbd5e1",
                            padding: "8px 16px",
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            transition: "all 0.15s ease"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = "#475569"}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = "#2b3644"}
                    >
                        <span>➕</span>
                        <span>New Order</span>
                    </button>

                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        title={sidebarOpen ? "Hide Previous Orders Sidebar" : "Show Previous Orders Sidebar"}
                        style={{
                            background: sidebarOpen ? "#1e293b" : "#18202a",
                            border: sidebarOpen ? "1px solid #3b82f6" : "1px solid #2b3644",
                            color: sidebarOpen ? "#60a5fa" : "#cbd5e1",
                            padding: "8px 14px",
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            transition: "all 0.15s ease"
                        }}
                    >
                        <span>📋</span>
                        <span>{sidebarOpen ? "Hide History" : "Past Orders"}</span>
                    </button>
                </div>
            </header>

            {/* Layout with Sidebar and Separated Main Content */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                {/* Previous Orders Sidebar */}
                <PreviousOrdersSidebar
                    isOpen={sidebarOpen}
                    onToggle={() => setSidebarOpen(!sidebarOpen)}
                    currentOrderId={conversationId}
                    onReorder={(reorderText) => {
                        setActiveTab("chat")
                        sendMessage(reorderText)
                    }}
                />

                {/* Main Content Area (Separated Pages) */}
                <main style={{
                    flex: 1,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column"
                }}>
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
                            onClarify={(optionText) => {
                                sendMessage(optionText)
                            }}
                            onNavigateToChat={() => setActiveTab("chat")}
                            onNavigateToBill={() => setActiveTab("bill")}
                        />
                    )}

                    {activeTab === "bill" && (
                        <BillCard
                            bill={bill}
                            deliveryNote={deliveryNote}
                            state={state}
                            onNavigateToSummary={() => setActiveTab("summary")}
                            onReset={resetOrder}
                        />
                    )}
                </main>
            </div>
        </div>
    )
}