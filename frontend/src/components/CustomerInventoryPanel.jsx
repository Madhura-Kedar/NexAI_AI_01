import { useState, useEffect, useMemo } from "react"

export default function CustomerInventoryPanel({
    lang = "en",
    translations: t,
    storeProfile = {},
    onSelectItem,
    onClose,
    isDrawer = false
}) {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("all")
    const [onlyInStock, setOnlyInStock] = useState(false)
    const [addedItemId, setAddedItemId] = useState(null)

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        try {
            setLoading(true)
            const res = await fetch("/api/products")
            if (res.ok) {
                const data = await res.json()
                setProducts(data)
            }
        } catch (err) {
            console.error("Failed to fetch inventory:", err)
        } finally {
            setLoading(false)
        }
    }

    // Category mapping to friendly customer groups
    const categories = [
        { key: "all", label: "🌟 All Items" },
        { key: "dairy", label: "🥛 Dairy & Butter", matches: ["dairy", "milk", "butter", "ghee"] },
        { key: "grains", label: "🌾 Atta, Rice & Dal", matches: ["atta", "rice", "dal", "flour"] },
        { key: "spices", label: "🧂 Spices & Oils", matches: ["oil", "sugar", "salt", "spice"] },
        { key: "snacks", label: "🍪 Snacks & Tea", matches: ["snacks", "biscuit", "noodles", "chocolate", "tea", "coffee", "drinks", "packaged"] },
        { key: "home", label: "🧼 Home & Care", matches: ["household", "personal", "health", "baby"] }
    ]

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            // Stock filter
            if (onlyInStock && p.stock_qty <= 0) return false

            // Category filter
            if (selectedCategory !== "all") {
                const catGroup = categories.find(c => c.key === selectedCategory)
                if (catGroup && catGroup.matches) {
                    const productCat = (p.category || "").toLowerCase()
                    if (!catGroup.matches.includes(productCat)) return false
                }
            }

            // Search query filter
            if (search.trim()) {
                const q = search.toLowerCase().trim()
                const name = (p.name || "").toLowerCase()
                const nameHi = (p.name_hi || "").toLowerCase()
                const cat = (p.category || "").toLowerCase()
                return name.includes(q) || nameHi.includes(q) || cat.includes(q)
            }

            return true
        })
    }, [products, search, selectedCategory, onlyInStock])

    const handleOrder = (product) => {
        setAddedItemId(product.id)
        setTimeout(() => setAddedItemId(null), 1200)
        if (onSelectItem) {
            onSelectItem(product)
        }
    }

    const availableCount = products.filter(p => p.stock_qty > 0).length

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            background: "#0d1117",
            borderLeft: isDrawer ? "1px solid #1f2937" : "none",
            color: "#f1f5f9",
            overflow: "hidden"
        }}>
            {/* Header */}
            <div style={{
                padding: "16px 20px",
                background: "#131922",
                borderBottom: "1px solid #1e2632",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexShrink: 0
            }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18 }}>📦</span>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: 0 }}>
                            {t?.availableItemsTitle || "Shop Inventory"}
                        </h3>
                        <span style={{
                            background: "rgba(37, 211, 102, 0.15)",
                            color: "#25D366",
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 12
                        }}>
                            {availableCount} Available
                        </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
                        {storeProfile.store_name ? `From ${storeProfile.store_name}` : "Check live prices & stock availability"}
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                        onClick={fetchProducts}
                        title="Refresh Stock"
                        style={{
                            background: "#1c2430",
                            border: "1px solid #2d3b4e",
                            color: "#cbd5e1",
                            borderRadius: 8,
                            padding: "6px 10px",
                            fontSize: 12,
                            cursor: "pointer"
                        }}
                    >
                        🔄
                    </button>
                    {isDrawer && onClose && (
                        <button
                            onClick={onClose}
                            title="Close"
                            style={{
                                background: "#1c2430",
                                border: "1px solid #2d3b4e",
                                color: "#cbd5e1",
                                borderRadius: 8,
                                padding: "6px 12px",
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: "pointer"
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div style={{
                padding: "12px 20px",
                background: "#10151c",
                borderBottom: "1px solid #1a222d",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                flexShrink: 0
            }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{
                        flex: 1,
                        position: "relative",
                        display: "flex",
                        alignItems: "center"
                    }}>
                        <span style={{ position: "absolute", left: 12, fontSize: 13, color: "#64748b" }}>🔍</span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t?.searchItems || "Search items (e.g. atta, butter, tea)..."}
                            style={{
                                width: "100%",
                                background: "#090d12",
                                border: "1px solid #232d3b",
                                borderRadius: 10,
                                padding: "9px 12px 9px 34px",
                                color: "#fff",
                                fontSize: 13,
                                outline: "none"
                            }}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                style={{
                                    position: "absolute",
                                    right: 10,
                                    background: "none",
                                    border: "none",
                                    color: "#94a3b8",
                                    cursor: "pointer",
                                    fontSize: 12
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => setOnlyInStock(!onlyInStock)}
                        style={{
                            background: onlyInStock ? "#14532d" : "#161d26",
                            color: onlyInStock ? "#86efac" : "#94a3b8",
                            border: onlyInStock ? "1px solid #22c55e" : "1px solid #273444",
                            borderRadius: 8,
                            padding: "9px 12px",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            whiteSpace: "nowrap"
                        }}
                    >
                        {onlyInStock ? "✓ In Stock" : "All Stock"}
                    </button>
                </div>

                {/* Category Pills */}
                <div style={{
                    display: "flex",
                    gap: 6,
                    overflowX: "auto",
                    paddingBottom: 2,
                    scrollbarWidth: "none"
                }}>
                    {categories.map(c => {
                        const active = selectedCategory === c.key
                        return (
                            <button
                                key={c.key}
                                onClick={() => setSelectedCategory(c.key)}
                                style={{
                                    background: active ? "#25D366" : "#171f2a",
                                    color: active ? "#000" : "#94a3b8",
                                    border: active ? "none" : "1px solid #263344",
                                    borderRadius: 16,
                                    padding: "5px 12px",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                    transition: "all 0.15s ease"
                                }}
                            >
                                {c.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Products List / Grid */}
            <div style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 10
            }}>
                {loading ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                        ⏳ Loading store inventory...
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8" }}>No matching items found</div>
                        <div style={{ fontSize: 12, marginTop: 4 }}>Try clearing the search or category filter</div>
                        {(search || selectedCategory !== "all" || onlyInStock) && (
                            <button
                                onClick={() => {
                                    setSearch("")
                                    setSelectedCategory("all")
                                    setOnlyInStock(false)
                                }}
                                style={{
                                    marginTop: 12,
                                    background: "#1e293b",
                                    border: "1px solid #334155",
                                    color: "#38bdf8",
                                    padding: "6px 14px",
                                    borderRadius: 8,
                                    fontSize: 12,
                                    cursor: "pointer"
                                }}
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>
                ) : (
                    filteredProducts.map(product => {
                        const inStock = product.stock_qty > 0
                        const isAdded = addedItemId === product.id

                        return (
                            <div
                                key={product.id}
                                style={{
                                    background: "#131922",
                                    border: "1px solid #202b3a",
                                    borderRadius: 12,
                                    padding: "12px 14px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 12,
                                    transition: "border-color 0.15s ease",
                                    opacity: inStock ? 1 : 0.6
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>
                                            {product.name}
                                        </span>
                                        {product.name_hi && (
                                            <span style={{ fontSize: 11, color: "#81c784" }}>
                                                ({product.name_hi})
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                                        <span style={{
                                            background: "#1c2533",
                                            color: "#94a3b8",
                                            fontSize: 10,
                                            padding: "2px 6px",
                                            borderRadius: 4
                                        }}>
                                            {product.unit || "pack"}
                                        </span>
                                        <span style={{ fontSize: 11, color: "#64748b" }}>
                                            {product.category}
                                        </span>
                                        <span style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: inStock ? "#4ade80" : "#f87171"
                                        }}>
                                            {inStock ? `🟢 ${product.stock_qty} in stock` : "🔴 Out of stock"}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 15, fontWeight: 800, color: "#25D366" }}>
                                            ₹{product.price}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleOrder(product)}
                                        disabled={!inStock}
                                        style={{
                                            background: isAdded ? "#15803d" : inStock ? "#25D366" : "#263238",
                                            color: isAdded ? "#fff" : inStock ? "#000" : "#64748b",
                                            border: "none",
                                            borderRadius: 8,
                                            padding: "7px 12px",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            cursor: inStock ? "pointer" : "not-allowed",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 4,
                                            transition: "all 0.15s ease",
                                            minWidth: 72,
                                            justifyContent: "center"
                                        }}
                                    >
                                        {isAdded ? "✓ Added" : inStock ? (t?.clickToOrder || "+ Order") : "No Stock"}
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Footer tip */}
            <div style={{
                padding: "10px 16px",
                background: "#0a0e14",
                borderTop: "1px solid #1a222d",
                fontSize: 11,
                color: "#64748b",
                textAlign: "center",
                flexShrink: 0
            }}>
                💡 Click <strong>"+ Order"</strong> to add any available item directly to your voice/chat order!
            </div>
        </div>
    )
}
