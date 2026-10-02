import { useState, useRef, useEffect } from "react"

export default function ChatBox({ messages, onSend, loading }) {
    const [input, setInput] = useState("")
    const [listening, setListening] = useState(false)
    const bottomRef = useRef(null)
    const recognitionRef = useRef(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const handleSend = () => {
        if (!input.trim()) return
        onSend(input.trim())
        setInput("")
    }

    const startVoice = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) return alert("Voice not supported in this browser")
        const recognition = new SpeechRecognition()
        recognition.lang = "hi-IN"
        recognition.interimResults = false
        recognition.onstart = () => setListening(true)
        recognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript
            setInput(transcript)
            setListening(false)
        }
        recognition.onerror = () => setListening(false)
        recognition.onend = () => setListening(false)
        recognition.start()
        recognitionRef.current = recognition
    }

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Messages */}
            <div style={{ flex: 1, overflow: "auto", padding: "16px 16px" }}>
                {messages.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                        <div style={{
                            maxWidth: "78%",
                            padding: "10px 14px",
                            borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                            background: m.role === "user" ? "#25D366" : "#1e1e1e",
                            color: m.role === "user" ? "#000" : "#e0e0e0",
                            fontSize: 14,
                            lineHeight: 1.5,
                            border: m.role === "bot" ? "1px solid #2a2a2a" : "none"
                        }}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div style={{ display: "flex", gap: 5, padding: "10px 14px" }}>
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{
                                width: 8, height: 8, borderRadius: "50%", background: "#444",
                                animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`
                            }} />
                        ))}
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid #222", display: "flex", gap: 8 }}>
                <button onClick={startVoice} style={{
                    background: listening ? "#ff4444" : "#1a1a1a",
                    border: "1px solid #333", borderRadius: 10, padding: "0 14px",
                    cursor: "pointer", fontSize: 18, color: listening ? "#fff" : "#888",
                    transition: "all 0.2s"
                }}>
                    🎤
                </button>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    placeholder="Order likhiye ya bolo... (e.g. 2 kilo atta, ek Amul butter)"
                    style={{
                        flex: 1, background: "#1a1a1a", border: "1px solid #333",
                        borderRadius: 10, padding: "10px 14px", color: "#fff",
                        fontSize: 14, outline: "none"
                    }}
                />
                <button onClick={handleSend} disabled={loading} style={{
                    background: "#25D366", border: "none", borderRadius: 10,
                    padding: "0 18px", cursor: "pointer", fontSize: 18,
                    opacity: loading ? 0.5 : 1
                }}>
                    ➤
                </button>
            </div>

            <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
        </div>
    )
}