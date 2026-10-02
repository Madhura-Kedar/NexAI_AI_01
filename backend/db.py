import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "orders.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            aliases TEXT,
            brand TEXT,
            category TEXT,
            unit TEXT,
            price REAL,
            stock INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'pending',
            total REAL DEFAULT 0,
            customer_name TEXT DEFAULT '',
            customer_phone TEXT DEFAULT '',
            customer_address TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            product_id INTEGER,
            product_name TEXT,
            qty REAL,
            unit TEXT,
            price_snapshot REAL,
            subtotal REAL,
            FOREIGN KEY(order_id) REFERENCES orders(id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            state TEXT DEFAULT 'active',
            pending_items TEXT DEFAULT '[]',
            confirmed_items TEXT DEFAULT '[]',
            chat_messages TEXT DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(order_id) REFERENCES orders(id)
        );

        CREATE TABLE IF NOT EXISTS store_settings (
            id INTEGER PRIMARY KEY,
            store_name TEXT DEFAULT 'Apna Kirana Store',
            owner_name TEXT DEFAULT 'Ramesh Kumar',
            phone TEXT DEFAULT '+91 98765 43210',
            address TEXT DEFAULT 'Main Market Road, City Centre, Near Clock Tower',
            upi_id TEXT DEFAULT 'apnakirana@upi',
            gstin TEXT DEFAULT '27AABCS1429B1Z',
            opening_hours TEXT DEFAULT '8:00 AM - 10:00 PM'
        );
    """)

    # Ensure default store settings row exists
    cursor.execute("""
        INSERT OR IGNORE INTO store_settings (id, store_name, owner_name, phone, address, upi_id, gstin, opening_hours)
        VALUES (1, 'Apna Kirana Store', 'Ramesh Kumar', '+91 98765 43210', 'Main Market Road, City Centre, Near Clock Tower', 'apnakirana@upi', '27AABCS1429B1Z', '8:00 AM - 10:00 PM')
    """)

    # Safe migration: add chat_messages column if it doesn't exist yet
    existing_cols = [row[1] for row in cursor.execute("PRAGMA table_info(conversations)").fetchall()]
    if "chat_messages" not in existing_cols:
        cursor.execute("ALTER TABLE conversations ADD COLUMN chat_messages TEXT DEFAULT '[]'")

    # Safe migration: add customer details columns to orders if not present
    existing_order_cols = [row[1] for row in cursor.execute("PRAGMA table_info(orders)").fetchall()]
    if "customer_name" not in existing_order_cols:
        cursor.execute("ALTER TABLE orders ADD COLUMN customer_name TEXT DEFAULT ''")
    if "customer_phone" not in existing_order_cols:
        cursor.execute("ALTER TABLE orders ADD COLUMN customer_phone TEXT DEFAULT ''")
    if "customer_address" not in existing_order_cols:
        cursor.execute("ALTER TABLE orders ADD COLUMN customer_address TEXT DEFAULT ''")

    conn.commit()
    conn.close()