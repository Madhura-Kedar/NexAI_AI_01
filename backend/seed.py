from db import get_db, init_db

products = [
    # ATTA
    ("Aashirvaad Atta 5kg", "atta aata gehun wheat flour", "Aashirvaad", "atta", "kg", 280, 50),
    ("Aashirvaad Atta 10kg", "atta aata gehun wheat flour", "Aashirvaad", "atta", "kg", 540, 30),
    ("Pillsbury Atta 5kg", "atta aata wheat flour maida", "Pillsbury", "atta", "kg", 260, 0),  # OOS
    ("Aashirvaad Multigrain Atta 5kg", "atta multigrain aashirvaad gehun", "Aashirvaad", "atta", "kg", 310, 20),
    ("Patanjali Atta 5kg", "atta gehun wheat flour patanjali", "Patanjali", "atta", "kg", 220, 35),
    ("Shaktibhog Atta 10kg", "atta gehun wheat flour shaktibhog", "Shaktibhog", "atta", "kg", 420, 15),

    # SUGAR
    ("Sugar 1kg", "cheeni chini shakkar sugar", None, "sugar", "kg", 45, 100),
    ("Sugar 5kg", "cheeni chini shakkar sugar", None, "sugar", "kg", 220, 40),
    ("Patanjali Sugar 1kg", "cheeni chini sugar patanjali", "Patanjali", "sugar", "kg", 42, 60),
    ("Uttam Sugar 5kg", "cheeni chini shakkar sugar uttam", "Uttam", "sugar", "kg", 205, 30),

    # OIL & COOKING ESSENTIALS
    ("Fortune Sunflower Oil 1L", "tel sunflower oil sarso refined", "Fortune", "oil", "L", 140, 60),
    ("Fortune Sunflower Oil 5L", "tel sunflower oil sarso refined", "Fortune", "oil", "L", 680, 25),
    ("Saffola Sunflower Oil 1L", "tel sunflower oil healthy saffola", "Saffola", "oil", "L", 160, 0),  # OOS
    ("Fortune Mustard Oil 1L", "sarso ka tel mustard oil kachi ghani", "Fortune", "oil", "L", 130, 45),
    ("Fortune Mustard Oil 5L", "sarso ka tel mustard oil kachi ghani", "Fortune", "oil", "L", 620, 15),
    ("Patanjali Mustard Oil 1L", "sarso tel mustard patanjali", "Patanjali", "oil", "L", 120, 30),
    ("Fortune Groundnut Oil 1L", "moongfali tel groundnut oil", "Fortune", "oil", "L", 180, 20),
    ("Fortune Groundnut Oil 5L", "moongfali tel groundnut oil", "Fortune", "oil", "L", 870, 10),
    ("Fortune Refined Oil 1L", "refined oil cooking oil tel", "Fortune", "oil", "L", 130, 40),
    ("Fortune Refined Oil 5L", "refined oil cooking oil tel", "Fortune", "oil", "L", 620, 20),
    ("Saffola Gold Oil 1L", "saffola oil heart healthy tel", "Saffola", "oil", "L", 175, 30),

    # BUTTER & GHEE
    ("Amul Butter 100g", "makhan butter amul", "Amul", "butter", "g", 56, 80),
    ("Amul Butter 500g", "makhan butter amul", "Amul", "butter", "g", 260, 40),
    ("Mother Dairy Butter 100g", "makhan butter mother dairy", "Mother Dairy", "butter", "g", 52, 50),
    ("Amul Ghee 200ml", "ghee desi ghee amul small", "Amul", "ghee", "ml", 130, 40),
    ("Amul Ghee 500ml", "ghee desi ghee clarified butter", "Amul", "ghee", "ml", 310, 35),
    ("Amul Ghee 1L", "ghee desi ghee clarified butter", "Amul", "ghee", "ml", 600, 20),
    ("Patanjali Ghee 500ml", "ghee desi ghee patanjali", "Patanjali", "ghee", "ml", 280, 25),
    ("Patanjali Ghee 1L", "ghee desi ghee patanjali", "Patanjali", "ghee", "ml", 550, 15),

    # DAL & PULSES
    ("Toor Dal 500g", "arhar dal toor dal tuvar", None, "dal", "g", 75, 60),
    ("Toor Dal 1kg", "arhar dal toor dal tuvar", None, "dal", "kg", 145, 40),
    ("Moong Dal 500g", "moong dal green gram", None, "dal", "g", 65, 50),
    ("Moong Dal 1kg", "moong dal green gram", None, "dal", "kg", 125, 30),
    ("Masoor Dal 1kg", "masoor dal red lentil", None, "dal", "kg", 110, 0),  # OOS
    ("Chana Dal 500g", "chana dal bengal gram split", None, "dal", "g", 70, 45),
    ("Chana Dal 1kg", "chana dal bengal gram split", None, "dal", "kg", 135, 30),
    ("Urad Dal 500g", "urad dal black gram dhuli", None, "dal", "g", 80, 35),
    ("Urad Dal 1kg", "urad dal black gram dhuli", None, "dal", "kg", 155, 20),
    ("Rajma 500g", "rajma kidney beans lal", None, "dal", "g", 90, 30),
    ("Rajma 1kg", "rajma kidney beans lal", None, "dal", "kg", 175, 15),
    ("Kabuli Chana 500g", "kabuli chana chickpeas chole", None, "dal", "g", 85, 25),

    # RICE
    ("India Gate Basmati 1kg", "chawal rice basmati", "India Gate", "rice", "kg", 120, 40),
    ("India Gate Basmati 5kg", "chawal rice basmati india gate", "India Gate", "rice", "kg", 570, 15),
    ("Daawat Basmati 1kg", "chawal rice basmati daawat", "Daawat", "rice", "kg", 110, 35),
    ("Daawat Basmati 5kg", "chawal rice basmati daawat", "Daawat", "rice", "kg", 540, 10),
    ("Kohinoor Basmati 1kg", "chawal rice basmati kohinoor", "Kohinoor", "rice", "kg", 115, 30),
    ("Sona Masoori Rice 1kg", "chawal rice sona masoori raw", None, "rice", "kg", 65, 50),
    ("Sona Masoori Rice 5kg", "chawal rice sona masoori raw", None, "rice", "kg", 310, 25),

    # SALT & SPICES
    ("Tata Salt 1kg", "namak salt tata iodized", "Tata", "salt", "kg", 22, 100),
    ("Tata Rock Salt 1kg", "sendha namak rock salt tata", "Tata", "salt", "kg", 28, 60),
    ("Patanjali Salt 1kg", "namak salt iodized patanjali", "Patanjali", "salt", "kg", 18, 80),
    ("Catch Turmeric 100g", "haldi turmeric powder catch", "Catch", "spice", "g", 28, 60),
    ("MDH Turmeric 200g", "haldi turmeric powder mdh", "MDH", "spice", "g", 48, 45),
    ("Catch Red Chilli 100g", "lal mirch red chilli powder catch", "Catch", "spice", "g", 32, 60),
    ("Catch Coriander 100g", "dhaniya coriander powder catch", "Catch", "spice", "g", 28, 55),
    ("Tata Cumin Seeds 100g", "jeera cumin seeds tata", "Tata", "spice", "g", 25, 70),
    ("MDH Garam Masala 100g", "garam masala spice mix mdh", "MDH", "spice", "g", 55, 40),
    ("Everest Garam Masala 100g", "garam masala spice everest", "Everest", "spice", "g", 52, 35),
    ("Everest Kitchen King 100g", "kitchen king masala everest", "Everest", "spice", "g", 55, 30),
    ("MDH Chana Masala 100g", "chana masala spice mdh", "MDH", "spice", "g", 45, 50),
    ("MDH Rajma Masala 100g", "rajma masala spice mdh", "MDH", "spice", "g", 45, 40),
    ("MDH Chole Masala 100g", "chole masala spice mdh", "MDH", "spice", "g", 45, 40),

    # TEA & COFFEE
    ("Tata Tea Gold 250g", "chai tea tata gold", "Tata", "tea", "g", 120, 50),
    ("Tata Tea Premium 500g", "chai tea tata premium", "Tata", "tea", "g", 195, 40),
    ("Red Label Tea 500g", "chai tea red label brooke bond", "Brooke Bond", "tea", "g", 210, 30),
    ("Wagh Bakri Tea 500g", "chai tea wagh bakri", "Wagh Bakri", "tea", "g", 220, 25),
    ("Lipton Tea 250g", "chai tea lipton yellow label", "Lipton", "tea", "g", 115, 30),
    ("Taj Mahal Tea 250g", "chai tea taj mahal brooke bond", "Brooke Bond", "tea", "g", 130, 20),
    ("Nescafe Classic 50g", "coffee nescafe instant", "Nescafe", "coffee", "g", 135, 30),
    ("Nescafe Classic 200g", "coffee nescafe instant", "Nescafe", "coffee", "g", 480, 15),
    ("Bru Instant Coffee 50g", "coffee bru instant", "Bru", "coffee", "g", 115, 25),

    # MILK & DAIRY
    ("Amul Milk 1L", "doodh milk amul toned", "Amul", "milk", "L", 62, 100),
    ("Amul Taaza Milk 500ml", "doodh milk amul taaza", "Amul", "milk", "ml", 32, 80),
    ("Amul Gold Milk 1L", "doodh milk amul gold full cream", "Amul", "milk", "L", 68, 60),
    ("Mother Dairy Milk 1L", "doodh milk mother dairy", "Mother Dairy", "milk", "L", 60, 80),
    ("Mother Dairy Toned 500ml", "doodh milk mother dairy toned", "Mother Dairy", "milk", "ml", 30, 70),
    ("Amul Paneer 200g", "paneer cottage cheese amul", "Amul", "dairy", "g", 95, 40),
    ("Amul Paneer 500g", "paneer cottage cheese amul", "Amul", "dairy", "g", 220, 25),
    ("Amul Curd 400g", "dahi curd yogurt amul", "Amul", "dairy", "g", 45, 50),
    ("Mother Dairy Curd 400g", "dahi curd yogurt mother dairy", "Mother Dairy", "dairy", "g", 42, 45),
    ("Amul Cheese Slices 200g", "cheese slices amul processed", "Amul", "dairy", "g", 115, 30),
    ("Amul Cream 200ml", "cream fresh amul malai", "Amul", "dairy", "ml", 55, 35),

    # BISCUITS
    ("Parle-G 200g", "biscuit parle g glucose", "Parle", "biscuit", "g", 20, 200),
    ("Parle-G 800g", "biscuit parle g glucose big", "Parle", "biscuit", "g", 75, 100),
    ("Britannia Good Day 200g", "biscuit good day butter britannia", "Britannia", "biscuit", "g", 35, 150),
    ("Britannia Marie Gold 200g", "biscuit marie gold britannia", "Britannia", "biscuit", "g", 30, 120),
    ("Britannia NutriChoice 200g", "biscuit nutrichoice digestive britannia", "Britannia", "biscuit", "g", 45, 80),
    ("Oreo 120g", "biscuit oreo chocolate cream", "Cadbury", "biscuit", "g", 40, 90),
    ("Monaco 200g", "biscuit monaco salted parle", "Parle", "biscuit", "g", 25, 110),
    ("Hide & Seek 100g", "biscuit hide seek chocolate parle", "Parle", "biscuit", "g", 30, 75),

    # SNACKS & NOODLES
    ("Haldirams Aloo Bhujia 200g", "bhujia namkeen snack haldirams", "Haldirams", "snacks", "g", 65, 60),
    ("Haldirams Mixture 200g", "mixture namkeen snack haldirams", "Haldirams", "snacks", "g", 60, 55),
    ("Lays Classic 26g", "chips lays potato crisps", "Lays", "snacks", "g", 20, 150),
    ("Lays Classic 73g", "chips lays potato crisps", "Lays", "snacks", "g", 40, 100),
    ("Kurkure Masala 90g", "kurkure chips snack puffed", "Kurkure", "snacks", "g", 20, 120),
    ("Maggi Noodles 70g", "maggi noodles instant 2 minute", "Maggi", "noodles", "g", 14, 200),
    ("Maggi Noodles 4pack", "maggi noodles instant pack combo", "Maggi", "noodles", "g", 52, 100),
    ("Yippee Noodles 70g", "yippee noodles instant sunfeast", "Sunfeast", "noodles", "g", 12, 150),

    # MAIDA / BESAN
    ("Besan 500g", "besan gram flour chickpea flour", None, "flour", "g", 55, 40),
    ("Maida 1kg", "maida all purpose flour refined flour", None, "flour", "kg", 40, 50),

    # HOUSEHOLD & CLEANING
    ("Surf Excel 500g", "detergent washing powder surf excel", "Surf Excel", "household", "g", 95, 50),
    ("Ariel 500g", "detergent washing powder ariel", "Ariel", "household", "g", 105, 40),
    ("Tide 500g", "detergent washing powder tide", "Tide", "household", "g", 85, 45),
    ("Vim Dishwash Bar 200g", "vim bar dishwash soap bartan", "Vim", "household", "g", 30, 80),
    ("Pril Dishwash Liquid 250ml", "pril liquid dishwash soap bartan", "Pril", "household", "ml", 65, 60),
    ("Lizol Floor Cleaner 500ml", "lizol floor cleaner phenyl", "Lizol", "household", "ml", 120, 35),
    ("Harpic 500ml", "harpic toilet cleaner bathroom", "Harpic", "household", "ml", 115, 30),
    ("Colin Glass Cleaner 500ml", "colin glass cleaner sheesha", "Colin", "household", "ml", 95, 25),

    # SOAPS & PERSONAL CARE
    ("Lux Soap 100g", "soap lux bath sabun", "Lux", "personal", "g", 45, 100),
    ("Dove Soap 100g", "soap dove bath moisturizing sabun", "Dove", "personal", "g", 55, 80),
    ("Lifebuoy Soap 100g", "soap lifebuoy germ protection sabun", "Lifebuoy", "personal", "g", 35, 120),
    ("Dettol Soap 100g", "soap dettol antiseptic sabun", "Dettol", "personal", "g", 48, 90),
    ("Clinic Plus Shampoo 175ml", "shampoo clinic plus hair", "Clinic Plus", "personal", "ml", 85, 50),
    ("Head Shoulders 180ml", "shampoo head shoulders dandruff", "Head & Shoulders", "personal", "ml", 175, 35),
    ("Colgate 200g", "toothpaste colgate strong teeth", "Colgate", "personal", "g", 75, 80),
    ("Pepsodent 200g", "toothpaste pepsodent teeth gum", "Pepsodent", "personal", "g", 68, 70),

    # BABY & HEALTH
    ("Dettol Handwash 200ml", "handwash dettol liquid soap hath", "Dettol", "health", "ml", 75, 60),
    ("Savlon Handwash 200ml", "handwash savlon liquid soap hath", "Savlon", "health", "ml", 70, 50),
    ("Johnsons Baby Powder 100g", "baby powder johnsons talcum", "Johnsons", "baby", "g", 95, 40),

    # PACKAGED FOOD & CHOCOLATES
    ("Kissan Jam 200g", "jam kissan mixed fruit", "Kissan", "packaged", "g", 85, 45),
    ("Amul Jam 200g", "jam amul mixed fruit", "Amul", "packaged", "g", 78, 40),
    ("Britannia Bread 400g", "bread britannia white sliced", "Britannia", "packaged", "g", 45, 60),
    ("Modern Bread 400g", "bread modern white sliced", "Modern", "packaged", "g", 42, 55),
    ("Maggi Ketchup 500g", "ketchup tomato sauce maggi", "Maggi", "packaged", "g", 85, 50),
    ("Kissan Ketchup 500g", "ketchup tomato sauce kissan", "Kissan", "packaged", "g", 80, 45),
    ("Amul Chocolate 40g", "chocolate amul milk choco", "Amul", "chocolate", "g", 20, 100),
    ("Dairy Milk 40g", "chocolate dairy milk cadbury", "Cadbury", "chocolate", "g", 20, 100),
    ("Dairy Milk Silk 60g", "chocolate silk cadbury premium", "Cadbury", "chocolate", "g", 55, 60),
    ("KitKat 37g", "chocolate kitkat wafer nestle", "Nestle", "chocolate", "g", 20, 80),

    # WATER & DRINKS
    ("Bisleri Water 1L", "paani water mineral bisleri bottle", "Bisleri", "drinks", "L", 20, 100),
    ("Bisleri Water 500ml", "paani water mineral bisleri bottle", "Bisleri", "drinks", "ml", 15, 150),
    ("Frooti 200ml", "frooti mango drink juice aamras", "Parle", "drinks", "ml", 15, 100),
    ("Maaza 250ml", "maaza mango drink aam", "Coca Cola", "drinks", "ml", 20, 80),
    ("Limca 250ml", "limca lemon drink nimbu soda", "Coca Cola", "drinks", "ml", 20, 70),
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
    print(f"[OK] Seeded {len(products)} products successfully")

if __name__ == "__main__":
    seed()