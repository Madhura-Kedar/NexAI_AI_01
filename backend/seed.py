from db import get_db, init_db

products = [
    # ATTA
    ("Aashirvaad Atta 5kg", "atta aata gehun wheat flour", "Aashirvaad", "atta", "kg", 280, 50),
    ("Aashirvaad Atta 10kg", "atta aata gehun wheat flour", "Aashirvaad", "atta", "kg", 540, 30),
    ("Pillsbury Atta 5kg", "atta aata wheat flour maida", "Pillsbury", "atta", "kg", 260, 0),  # OOS

    # SUGAR
    ("Sugar 1kg", "cheeni chini shakkar sugar", None, "sugar", "kg", 45, 100),
    ("Sugar 5kg", "cheeni chini shakkar sugar", None, "sugar", "kg", 220, 40),

    # OIL
    ("Fortune Sunflower Oil 1L", "tel sunflower oil sarso refined", "Fortune", "oil", "L", 140, 60),
    ("Fortune Sunflower Oil 5L", "tel sunflower oil sarso refined", "Fortune", "oil", "L", 680, 25),
    ("Saffola Sunflower Oil 1L", "tel sunflower oil healthy saffola", "Saffola", "oil", "L", 160, 0),  # OOS
    ("Fortune Mustard Oil 1L", "sarso ka tel mustard oil kachi ghani", "Fortune", "oil", "L", 130, 45),
    ("Fortune Mustard Oil 5L", "sarso ka tel mustard oil kachi ghani", "Fortune", "oil", "L", 620, 15),
    ("Patanjali Mustard Oil 1L", "sarso tel mustard patanjali", "Patanjali", "oil", "L", 120, 30),
    ("Fortune Groundnut Oil 1L", "moongfali tel groundnut oil", "Fortune", "oil", "L", 180, 20),
    ("Fortune Groundnut Oil 5L", "moongfali tel groundnut oil", "Fortune", "oil", "L", 870, 10),

    # BUTTER
    ("Amul Butter 100g", "makhan butter amul", "Amul", "butter", "g", 56, 80),
    ("Amul Butter 500g", "makhan butter amul", "Amul", "butter", "g", 260, 40),
    ("Mother Dairy Butter 100g", "makhan butter mother dairy", "Mother Dairy", "butter", "g", 52, 50),

    # GHEE
    ("Amul Ghee 500ml", "ghee desi ghee clarified butter", "Amul", "ghee", "ml", 310, 35),
    ("Amul Ghee 1L", "ghee desi ghee clarified butter", "Amul", "ghee", "ml", 600, 20),
    ("Patanjali Ghee 1L", "ghee desi ghee patanjali", "Patanjali", "ghee", "ml", 550, 15),

    # DAL
    ("Toor Dal 500g", "arhar dal toor dal tuvar", None, "dal", "g", 75, 60),
    ("Toor Dal 1kg", "arhar dal toor dal tuvar", None, "dal", "kg", 145, 40),
    ("Moong Dal 500g", "moong dal green gram", None, "dal", "g", 65, 50),
    ("Moong Dal 1kg", "moong dal green gram", None, "dal", "kg", 125, 30),
    ("Masoor Dal 1kg", "masoor dal red lentil", None, "dal", "kg", 110, 0),  # OOS

    # RICE
    ("India Gate Basmati 1kg", "chawal rice basmati", "India Gate", "rice", "kg", 120, 40),
    ("India Gate Basmati 5kg", "chawal rice basmati", "India Gate", "rice", "kg", 580, 20),
    ("Daawat Basmati 1kg", "chawal rice basmati daawat", "Daawat", "rice", "kg", 110, 35),

    # SALT & SPICES
    ("Tata Salt 1kg", "namak salt tata iodized", "Tata", "salt", "kg", 22, 100),
    ("Catch Turmeric 100g", "haldi turmeric powder catch", "Catch", "spice", "g", 28, 60),
    ("MDH Garam Masala 100g", "garam masala spice mix mdh", "MDH", "spice", "g", 55, 40),

    # TEA
    ("Tata Tea Gold 250g", "chai tea tata gold", "Tata", "tea", "g", 120, 50),
    ("Red Label Tea 500g", "chai tea red label brooke bond", "Brooke Bond", "tea", "g", 210, 30),

    # MILK PRODUCTS
    ("Amul Milk 1L", "doodh milk amul toned", "Amul", "milk", "L", 62, 100),
    ("Mother Dairy Milk 1L", "doodh milk mother dairy", "Mother Dairy", "milk", "L", 60, 80),

    # BISCUITS
    ("Parle-G 200g", "biscuit parle g glucose", "Parle", "biscuit", "g", 20, 200),
    ("Britannia Good Day 200g", "biscuit good day butter britannia", "Britannia", "biscuit", "g", 35, 150),

    # MAIDA / BESAN
    ("Besan 500g", "besan gram flour chickpea flour", None, "flour", "g", 55, 40),
    ("Maida 1kg", "maida all purpose flour refined flour", None, "flour", "kg", 40, 50),
]

def seed():
    init_db()
    conn = get_db()
    conn.execute("DELETE FROM products")
    conn.executemany(
        "INSERT INTO products (name, aliases, brand, category, unit, price, stock) VALUES (?,?,?,?,?,?,?)",
        products
    )
    conn.commit()
    conn.close()
    print(f"[OK] Seeded {len(products)} products")

if __name__ == "__main__":
    seed()