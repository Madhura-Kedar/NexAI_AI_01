import { useState } from "react"
import ChatBox from "./components/ChatBox"
import OrderPanel from "./components/OrderPanel"
import BillCard from "./components/BillCard"

export default function App() {
    const [conversationId, setConversationId] = useState(null)
    const [messages, setMessages] = useState([
        { role: "bot", text: "Namaste! 🙏 Apna order bataiye — Hindi ya English mein likhiye." }
    ])
    const [confirmed, setConfirmed] = useState([])
    const [pending, setPending] = useState([])
    const [bill, setBill] = useState(null)
    const [deliveryNote, setDeliveryNote] = useState("")
    const [state, setState] = useState("active")
    const [loading, setLoading] = useState(false)

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

            if (!conversationId) setConversationId(data.conversation_id)
            setConfirmed(data.confirmed || [])
            setPending(data.pending || [])
            setBill(data.final_bill || data.bill_preview || null)
            setState(data.state)
            if (data.delivery_note) setDeliveryNote(data.delivery_note)

            setMessages(prev => [...prev, { role: "bot", text: data.bot_reply }])
        } catch (err) {
            setMessages(prev => [...prev, { role: "bot", text: "Sorry, kuch error aaya. Dobara try karein." }])
        } finally {
            setLoading(false)
        }
    }

    const reset = () => {
        setConversationId(null)
        setMessages([{ role: "bot", text: "Namaste! 🙏 Apna order bataiye — Hindi ya English mein likhiye." }])
        setConfirmed([])
        setPending([])
        setBill(null)
        setDeliveryNote("")
        setState("active")
    }

    return (
        <div style={{ display: "flex", height: "100vh", background: "#0f0f0f", color: "#fff", fontFamily: "'Inter', sans-serif" }}>
            {/* Left: Chat */}
            <div style={{ flex: "0 0 38%", borderRight: "1px solid #222", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>🛒 Hinglish Order Desk</div>
                        <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>AI-powered kirana assistant</div>
                    </div>
                    <button onClick={reset} style={{ background: "#1a1a1a", border: "1px solid #333", color: "#888", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
                        New Order
                    </button>
                </div>
                <ChatBox messages={messages} onSend={sendMessage} loading={loading} />
            </div>

            {/* Middle: Order Panel */}
            <div style={{ flex: "0 0 35%", borderRight: "1px solid #222", overflow: "auto" }}>
                <OrderPanel confirmed={confirmed} pending={pending} />
            </div>

            {/* Right: Bill */}
            <div style={{ flex: 1, overflow: "auto" }}>
                <BillCard bill={bill} deliveryNote={deliveryNote} state={state} />
            </div>
        </div>
    )
}