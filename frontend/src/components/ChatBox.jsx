import { useState, useRef, useEffect } from "react"
import { transliterateHindiToRoman } from "../utils/transliterate"

export default function ChatBox({
    messages,
    onSend,
    loading,
    confirmedCount,
    grandTotal,
    onNavigateToSummary,
    onToggleInventory,
    isInventoryOpen,
    inventoryCount = 134
}) {
    const [input, setInput] = useState("")
    const [listening, setListening] = useState(false)
    const [voiceTranscript, setVoiceTranscript] = useState("")
    const [soundEnabled, setSoundEnabled] = useState(true)
    const [speakingIndex, setSpeakingIndex] = useState(null)
    const bottomRef = useRef(null)
    const recognitionRef = useRef(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, voiceTranscript])

    // Load voices on mount
    useEffect(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices()
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.getVoices()
            }
        }
        return () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel()
            }
        }
    }, [])

    // Prepare text for speech (convert symbols, numbers, currencies into natural Hindi words)
    const prepareTextForSpeech = (text) => {
        if (!text) return ""
        return text
            .replace(/₹\s*(\d+)/g, "$1 rupaye")
            .replace(/Rs\.?\s*(\d+)/gi, "$1 rupaye")
            .replace(/\b(\d+)\s*kg\b/gi, "$1 kilo")
            .replace(/\b(\d+)\s*g\b/gi, "$1 gram")
            .replace(/\b(\d+)\s*l\b/gi, "$1 litre")
            .replace(/\b(\d+)\s*ml\b/gi, "$1 mili litre")
            .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
            .replace(/[-_~*#•]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
    }

    const getPreferredVoice = () => {
        if (!('speechSynthesis' in window)) return null
        const voices = window.speechSynthesis.getVoices()
        if (!voices || voices.length === 0) return null

        // 1. Hindi voice
        const hiVoice = voices.find(v => v.lang.toLowerCase().includes("hi"))
        if (hiVoice) return hiVoice

        // 2. Indian English voice
        const enInVoice = voices.find(v => v.lang.toLowerCase().includes("en-in") || v.lang.toLowerCase().includes("en_in"))
        if (enInVoice) return enInVoice

        // 3. Fallback English
        return voices.find(v => v.lang.toLowerCase().startsWith("en")) || voices[0]
    }

    const speakBotReply = (text, index) => {
        if (!('speechSynthesis' in window)) return

        if (speakingIndex === index) {
            // Stop speaking if clicked again
            window.speechSynthesis.cancel()
            setSpeakingIndex(null)
            return
        }

        window.speechSynthesis.cancel()
        const clean = prepareTextForSpeech(text)
        if (!clean) return

        const utterance = new SpeechSynthesisUtterance(clean)
        const voice = getPreferredVoice()
        if (voice) {
            utterance.voice = voice
            utterance.lang = voice.lang
        } else {
            utterance.lang = "hi-IN"
        }

        utterance.rate = 0.95
        utterance.pitch = 1.0

        utterance.onstart = () => setSpeakingIndex(index)
        utterance.onend = () => setSpeakingIndex(null)
        utterance.onerror = () => setSpeakingIndex(null)

        window.speechSynthesis.speak(utterance)
    }

    // Automatically speak the latest bot reply
    useEffect(() => {
        const lastIdx = messages.length - 1
        const lastMsg = messages[lastIdx]
        if (lastMsg && lastMsg.role === "bot" && soundEnabled && lastIdx > 0) {
            speakBotReply(lastMsg.text, lastIdx)
        }
    }, [messages.length, soundEnabled])

    const handleSend = (textToSend) => {
        const raw = (textToSend || input).trim()
        if (!raw) return
        const text = transliterateHindiToRoman(raw)
        onSend(text)
        setInput("")
        setVoiceTranscript("")
    }

    const toggleVoice = () => {
        // Stop any ongoing bot speech so it doesn't conflict with mic
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel()
            setSpeakingIndex(null)
        }

        if (listening) {
            recognitionRef.current?.stop()
            setListening(false)
            return
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) {
            alert("Aapke browser mein Speech Recognition support nahi hai. Kripya Chrome use karein ya type karein.")
            return
        }

        const recognition = new SpeechRecognition()
        recognition.lang = "hi-IN"
        recognition.interimResults = true
        recognition.continuous = false

        recognition.onstart = () => {
            setListening(true)
            setVoiceTranscript("")
        }

        recognition.onresult = (e) => {
            let finalTranscript = ""
            for (let i = 0; i < e.results.length; i++) {
                finalTranscript += e.results[i][0].transcript
            }
            // Convert Hindi Devanagari speech directly into English Roman script
            const romanized = transliterateHindiToRoman(finalTranscript)
            setVoiceTranscript(romanized)
            setInput(romanized)

            if (e.results[0].isFinal) {
                setTimeout(() => {
                    handleSend(romanized)
                }, 400)
            }
        }

        recognition.onerror = (err) => {
            console.error("Speech error", err)
            setListening(false)
        }

        recognition.onend = () => {
            setListening(false)
        }

        try {
            recognition.start()
            recognitionRef.current = recognition
        } catch (e) {
            console.error(e)
            setListening(false)
        }
    }

    const quickPills = [
        "2 kilo atta",
        "1L Fortune sunflower oil",
        "Amul butter 500g",
        "1 packet Parle-G",
        "5kg chawal aur 1kg toor dal",
        "Order cancel karo"
    ]

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            maxWidth: 880,
            margin: "0 auto",
            width: "100%",
            position: "relative"
        }}>
            {/* Top Bar with Audio Toggle & Cart Status */}
            <div style={{
                padding: "8px 18px",
                background: "#12171f",
                borderBottom: "1px solid #1f2836",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {confirmedCount > 0 ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 700, color: "#25D366", fontSize: 13 }}>
                                🛒 {confirmedCount} Confirmed {grandTotal ? `· ₹${grandTotal}` : ""}
                            </span>
                            <button
                                onClick={onNavigateToSummary}
                                style={{
                                    background: "#1c2c22",
                                    color: "#25D366",
                                    border: "1px solid #285437",
                                    borderRadius: 6,
                                    padding: "3px 10px",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer"
                                }}
                            >
                                View ➔
                            </button>
                        </div>
                    ) : (
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                            Boliye ya type karein apna grocery order
                        </span>
                    )}
                </div>

                {/* Top Action Buttons: Inventory beside chatbot & Voice Toggle */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {onToggleInventory && (
                        <button
                            onClick={onToggleInventory}
                            title={isInventoryOpen ? "Close Shop Inventory" : "View available items in shop"}
                            style={{
                                background: isInventoryOpen ? "#25D366" : "rgba(37, 211, 102, 0.14)",
                                border: isInventoryOpen ? "1px solid #22c55e" : "1px solid #285437",
                                color: isInventoryOpen ? "#000" : "#25D366",
                                borderRadius: 20,
                                padding: "4px 12px",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                transition: "all 0.15s ease",
                                boxShadow: isInventoryOpen ? "0 0 10px rgba(37, 211, 102, 0.3)" : "none"
                            }}
                        >
                            <span>📦</span>
                            <span>{isInventoryOpen ? "Hide Inventory" : "Shop Inventory"}</span>
                            <span style={{
                                background: isInventoryOpen ? "#000" : "#25D366",
                                color: isInventoryOpen ? "#25D366" : "#000",
                                fontSize: 10,
                                fontWeight: 800,
                                padding: "1px 6px",
                                borderRadius: 10
                            }}>
                                {inventoryCount}
                            </span>
                        </button>
                    )}

                    <button
                        onClick={() => {
                            if (soundEnabled && 'speechSynthesis' in window) {
                                window.speechSynthesis.cancel()
                                setSpeakingIndex(null)
                            }
                            setSoundEnabled(!soundEnabled)
                        }}
                        title={soundEnabled ? "Audio replies ON (Click to Mute)" : "Audio replies OFF (Click to Unmute)"}
                        style={{
                            background: soundEnabled ? "rgba(37, 211, 102, 0.12)" : "#1a212b",
                            border: soundEnabled ? "1px solid #25D366" : "1px solid #334155",
                            color: soundEnabled ? "#25D366" : "#94a3b8",
                            borderRadius: 20,
                            padding: "4px 12px",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            transition: "all 0.15s ease"
                        }}
                    >
                        <span>{soundEnabled ? "🔊 Voice: ON" : "🔇 Voice: OFF"}</span>
                        <span style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: soundEnabled ? "#25D366" : "#64748b",
                            display: "inline-block"
                        }} />
                    </button>
                </div>
            </div>

            {/* Chat Messages Feed */}
            <div style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 14
            }}>
                {/* Starter Guide Card if only initial message */}
                {messages.length <= 1 && (
                    <div style={{
                        background: "linear-gradient(135deg, #151a21 0%, #11151a 100%)",
                        border: "1px solid #232c38",
                        borderRadius: 16,
                        padding: "20px 24px",
                        textAlign: "center",
                        marginBottom: 10,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.25)"
                    }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🎙️</div>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                            Kirana Voice Order Desk
                        </h3>
                        <p style={{ fontSize: 13, color: "#9aa5b5", maxWidth: 460, margin: "0 auto 16px", lineHeight: 1.5 }}>
                            Boliye Hindi ya Hinglish mein — bot bol kar aur likh kar dono mein jawab dega!
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
                            {onToggleInventory && (
                                <button
                                    onClick={onToggleInventory}
                                    style={{
                                        background: "rgba(37, 211, 102, 0.15)",
                                        border: "1px solid #25D366",
                                        color: "#25D366",
                                        borderRadius: 20,
                                        padding: "6px 14px",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: "pointer"
                                    }}
                                >
                                    📦 View Shop Inventory (Items Available)
                                </button>
                            )}
                            {quickPills.map((pill, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSend(pill)}
                                    style={{
                                        background: "#1c232d",
                                        border: "1px solid #2d3748",
                                        color: "#81c784",
                                        borderRadius: 20,
                                        padding: "6px 14px",
                                        fontSize: 12,
                                        fontWeight: 500,
                                        cursor: "pointer",
                                        transition: "all 0.15s ease"
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = "#24303f"}
                                    onMouseOut={(e) => e.currentTarget.style.background = "#1c232d"}
                                >
                                    "{pill}"
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Message bubbles */}
                {messages.map((m, i) => (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                            animation: "fadeIn 0.2s ease"
                        }}
                    >
                        <div
                            style={{
                                maxWidth: "78%",
                                padding: "12px 18px",
                                borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                                background: m.role === "user"
                                    ? "linear-gradient(135deg, #1fa34e 0%, #15803d 100%)"
                                    : "#1a212b",
                                color: m.role === "user" ? "#ffffff" : "#e2e8f0",
                                fontSize: 14,
                                lineHeight: 1.55,
                                border: m.role === "bot" ? "1px solid #283344" : "none",
                                boxShadow: m.role === "user"
                                    ? "0 4px 14px rgba(21, 128, 61, 0.3)"
                                    : "0 4px 14px rgba(0, 0, 0, 0.25)",
                                whiteSpace: "pre-line",
                                position: "relative"
                            }}
                        >
                            {m.role === "bot" && (
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 6,
                                    borderBottom: "1px solid #252f3e",
                                    paddingBottom: 4
                                }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "#68d391", letterSpacing: 0.5 }}>
                                        🛒 KIRANA DESK
                                    </div>
                                    <button
                                        onClick={() => speakBotReply(m.text, i)}
                                        title={speakingIndex === i ? "Stop audio" : "Listen in audio"}
                                        style={{
                                            background: speakingIndex === i ? "#25D366" : "#242d3b",
                                            color: speakingIndex === i ? "#000" : "#a5d6a7",
                                            border: "none",
                                            borderRadius: 12,
                                            padding: "3px 8px",
                                            fontSize: 11,
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 4,
                                            transition: "all 0.15s ease"
                                        }}
                                    >
                                        <span>{speakingIndex === i ? "⏹️ Bol raha hai..." : "🔊 Suniye"}</span>
                                    </button>
                                </div>
                            )}
                            <div>{m.text}</div>
                        </div>
                    </div>
                ))}

                {/* Live speech feedback if speaking */}
                {listening && voiceTranscript && (
                    <div style={{
                        alignSelf: "flex-end",
                        maxWidth: "75%",
                        padding: "10px 16px",
                        borderRadius: "16px 16px 4px 16px",
                        background: "#16281e",
                        border: "1px dashed #25D366",
                        color: "#a5d6a7",
                        fontSize: 13,
                        fontStyle: "italic"
                    }}>
                        🎙️ "{voiceTranscript}..."
                    </div>
                )}

                {/* Bot loading dots */}
                {loading && (
                    <div style={{
                        alignSelf: "flex-start",
                        background: "#1a212b",
                        border: "1px solid #283344",
                        borderRadius: 14,
                        padding: "10px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                    }}>
                        <span style={{ fontSize: 11, color: "#8899aa", marginRight: 4 }}>Checking stock</span>
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{
                                width: 7, height: 7, borderRadius: "50%", background: "#25D366",
                                animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`
                            }} />
                        ))}
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Bottom Section: Centered Big Mic & Text Input Area */}
            <div style={{
                background: "linear-gradient(180deg, rgba(13,15,18,0.7) 0%, #111418 100%)",
                borderTop: "1px solid #202630",
                padding: "16px 20px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14
            }}>
                {/* PROMINENT CENTERED MICROPHONE BUTTON */}
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8
                }}>
                    <button
                        onClick={toggleVoice}
                        title={listening ? "Stop Recording" : "Start Voice Order"}
                        style={{
                            width: 76,
                            height: 76,
                            borderRadius: "50%",
                            border: listening ? "3px solid #ff4444" : "3px solid #25D366",
                            background: listening
                                ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)"
                                : "linear-gradient(135deg, #25D366 0%, #1b9e4b 100%)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            boxShadow: listening
                                ? "0 0 28px rgba(239, 68, 68, 0.6)"
                                : "0 0 24px rgba(37, 211, 102, 0.4)",
                            animation: listening ? "pulse-red 1.5s infinite" : "pulse-green 2.5s infinite",
                            transition: "all 0.2s ease"
                        }}
                    >
                        {listening ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                <div style={{ width: 4, height: 18, background: "#fff", borderRadius: 2, animation: "soundwave 0.5s infinite" }} />
                                <div style={{ width: 4, height: 28, background: "#fff", borderRadius: 2, animation: "soundwave 0.5s infinite 0.15s" }} />
                                <div style={{ width: 4, height: 16, background: "#fff", borderRadius: 2, animation: "soundwave 0.5s infinite 0.3s" }} />
                            </div>
                        ) : (
                            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="22" />
                            </svg>
                        )}
                    </button>

                    <div style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: listening ? "#ef4444" : "#25D366",
                        letterSpacing: 0.3,
                        textAlign: "center"
                    }}>
                        {listening ? "🔴 Sun raha hoon... Boliye apna order" : "🎤 Tap To Speak / Bol Kar Order Dein"}
                    </div>
                </div>

                {/* Text Input Row for Keyboard / Alternative typing */}
                <div style={{
                    display: "flex",
                    width: "100%",
                    maxWidth: 720,
                    gap: 10,
                    alignItems: "center"
                }}>
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSend()}
                        placeholder="Ya yahan likhiye (e.g. 2 kilo atta, 1L tel, 500g butter)..."
                        style={{
                            flex: 1,
                            background: "#181f28",
                            border: "1px solid #2b3644",
                            borderRadius: 12,
                            padding: "12px 18px",
                            color: "#fff",
                            fontSize: 14,
                            outline: "none",
                            transition: "border 0.2s ease"
                        }}
                        onFocus={(e) => e.target.style.borderColor = "#25D366"}
                        onBlur={(e) => e.target.style.borderColor = "#2b3644"}
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={loading || !input.trim()}
                        style={{
                            background: input.trim() ? "#25D366" : "#222c38",
                            color: input.trim() ? "#000" : "#64748b",
                            border: "none",
                            borderRadius: 12,
                            padding: "12px 22px",
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: input.trim() ? "pointer" : "default",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            transition: "all 0.15s ease"
                        }}
                    >
                        <span>Send</span>
                        <span style={{ fontSize: 16 }}>➤</span>
                    </button>
                </div>
            </div>
        </div>
    )
}