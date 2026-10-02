import google.generativeai as genai
import json, os, re
from dotenv import load_dotenv
from google.api_core.exceptions import ResourceExhausted

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-flash-lite-latest")

# ── Cancel keywords (local – no API call needed) ─────────────────────────────
_CANCEL_ALL_KW = [
    "cancel", "band karo", "order cancel", "cancel karo", "rok do",
    "mat bhejo", "wapas karo", "don't want", "nahi lena", "order mat karo",
    "poora cancel", "sab cancel", "cancel the order",
]
_CANCEL_ITEM_KW = ["nahi chahiye", "hatao", "remove", "nikalo", "mat lo"]
_ITEM_NAMES = [
    "atta", "sugar", "cheeni", "tel", "oil", "butter", "makhan", "ghee",
    "dal", "rice", "chawal", "salt", "namak", "haldi", "turmeric",
    "chai", "tea", "doodh", "milk", "biscuit", "besan", "maida",
    "aashirvaad", "amul", "fortune", "patanjali", "tata", "pillsbury",
    "moong", "toor", "masoor", "arhar",
]

CATALOG_HINT = (
    "atta, sugar, refined oil, sunflower oil, mustard oil, groundnut oil, butter, ghee, "
    "toor dal, moong dal, masoor dal, chana dal, urad dal, rajma, kabuli chana, "
    "basmati rice, sona masoori rice, salt, rock salt, turmeric, chilli, coriander, cumin, "
    "garam masala, chana masala, rajma masala, chole masala, tea, coffee, milk, paneer, curd, "
    "cheese, cream, biscuit, cookies, marie gold, oreo, monaco, bhujia, mixture, lays, chips, "
    "kurkure, noodles, maggi, besan, maida, surf excel, ariel, tide, vim, pril, lizol, harpic, "
    "colin, soap, lux, dove, dettol, lifebuoy, shampoo, toothpaste, colgate, pepsodent, "
    "handwash, baby powder, jam, bread, ketchup, chocolate, dairy milk, kitkat, water, "
    "bisleri, frooti, maaza, limca"
)

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

PARSE_PROMPT = """
You are an order parser for an Indian kirana (grocery) store.
The customer message is in Hinglish (mixed Hindi + English).

Known catalog categories: {catalog}

Rules:
- Convert Hindi numbers: ek=1, do=2, teen=3, char=4, paanch=5, chhe=6, saat=7
- Convert units: kilo/kg=kg, gram/g=g, litre/liter/L=L, ml=ml
- Convert fractions: half/aadha=0.5, paav=0.25, dedh=1.5
- Liquid items (tel/oil, doodh/milk, ghee, drinks, cleaner, liquid) are measured in L or ml, NOT kg.
  If customer says "2 kilo tel", interpret as 2L not 2kg.
- If quantity is vague (thoda, zyada, kam, thoda sa) set vague=true
- If quantity is completely unspecified, set qty=null and vague=false
- Map Hindi item names: tel=oil, makhan=butter, cheeni/chini/shakkar=sugar,
  aata/atta=atta, doodh=milk, chawal=rice, namak=salt, haldi=turmeric,
  chai=tea, dal=dal (specify type if mentioned), dahi=curd, paani=water, sabun=soap
- brand: extract if mentioned (Amul, Aashirvaad, Fortune, Patanjali, Tata, MDH, Everest, Parle, Britannia, Maggi, Lays, Cadbury, Surf Excel, Dettol, etc.), else null

Return ONLY valid JSON, no extra text, no markdown:
{{
  "items": [
    {{
      "raw": "original text for this item",
      "item": "catalog category name in english",
      "brand": "brand name or null",
      "qty": number or null,
      "unit": "kg/g/L/ml or null",
      "vague": false
    }}
  ]
}}

Customer message: {message}
"""

# (Cancel detection is now done locally — no prompt needed)

CLARIFY_PROMPT = """
You work at a friendly Indian kirana store.
Respond in natural Hinglish (mix of Hindi and English), keep it SHORT and warm.
Ask the customer about these unclear items only:

{pending}

Write ONLY the clarification question. No greetings, no extra text.
Style examples:
- "Tel ke liye — sunflower, mustard ya groundnut chahiye? Aur 1L ya 5L?"
- "Atta ka size batao — 5kg (Rs280) ya 10kg (Rs540)?"
- "1kg atta available nahi. 5kg (Rs280) ya 10kg (Rs540) chalega?"
"""

RESOLVE_PROMPT = """
Customer was asked to clarify these pending items:
{pending}

Customer replied: "{reply}"

Map the customer's reply to the pending items. Use the candidates list to find the best match.
Return ONLY valid JSON:
{{
  "resolved": [
    {{
      "original_item": "item name from pending",
      "chosen": "exact product name from candidates list",
      "qty": number or null,
      "unit": "kg/g/L/ml or null"
    }}
  ],
  "unresolved": ["list of item names still unclear"]
}}
"""

DELIVERY_PROMPT = """
Write a short delivery note in Hinglish for the delivery person.
Order items: {items}
Customer timing hint: {timing}
Total amount: Rs{total}

Keep it under 3 lines. Include: what to deliver, when, collect cash.
"""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def clean_json(text):
    text = re.sub(r"```json|```", "", text).strip()
    return text


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def _gemini(prompt):
    """Call Gemini and surface quota/safety errors with a readable message."""
    try:
        resp = model.generate_content(prompt)

        # Handle blocked or empty responses gracefully
        if not resp.candidates:
            raise RuntimeError(
                "Model ne koi jawab nahi diya (response blocked). Dobara try karein."
            )
        candidate = resp.candidates[0]
        # finish_reason 1 = STOP (normal), others may mean blocked/error
        finish_reason = getattr(candidate, "finish_reason", None)
        if finish_reason is not None and finish_reason not in (1, "STOP"):
            # Try to get text anyway; if it fails, return fallback
            try:
                return candidate.content.parts[0].text
            except Exception:
                raise RuntimeError(
                    f"Model response was blocked or incomplete (reason: {finish_reason}). Dobara try karein."
                )

        return resp.text
    except ResourceExhausted as e:
        raise RuntimeError(
            "API quota exhausted. Thoda wait karke dobara try karein."
        ) from e
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"Gemini API error: {e}") from e


def parse_order(message):
    prompt = PARSE_PROMPT.format(catalog=CATALOG_HINT, message=message)
    try:
        raw = _gemini(prompt)
        return json.loads(clean_json(raw))
    except (json.JSONDecodeError, ValueError):
        # If model returns non-JSON (e.g., empty string), return empty items
        return {"items": []}


def detect_cancel(message):
    """
    Pure-Python cancel detection — no API call, instant, quota-safe.
    Returns {is_cancel, cancel_all, cancel_item}.
    """
    msg = message.lower().strip()

    # Check cancel-all first
    for kw in _CANCEL_ALL_KW:
        if kw in msg:
            # Check if a specific item is also mentioned alongside cancel
            for item in _ITEM_NAMES:
                # patterns like "atta cancel karo" or "cancel atta"
                if re.search(rf'\b{re.escape(item)}\b', msg):
                    # Only treat as item-cancel if it's NOT a generic "order cancel"
                    if not re.search(r'\b(order|poora|sab|sabka|all)\b', msg):
                        return {"is_cancel": True, "cancel_all": False, "cancel_item": item}
            return {"is_cancel": True, "cancel_all": True, "cancel_item": None}

    # Check cancel-item patterns ("X nahi chahiye", "X hatao", "remove X")
    for kw in _CANCEL_ITEM_KW:
        if kw in msg:
            for item in _ITEM_NAMES:
                if re.search(rf'\b{re.escape(item)}\b', msg):
                    return {"is_cancel": True, "cancel_all": False, "cancel_item": item}
            # Keyword found but no recognised item name
            return {"is_cancel": True, "cancel_all": False, "cancel_item": None}

    return {"is_cancel": False, "cancel_all": False, "cancel_item": None}


# ── Off-topic / Non-order detection (local – quota safe) ─────────────────────
OFF_TOPIC_REPLIES = [
    "Yeh message kisi grocery order se related nahi lag raha hai. Kripya apna kirana order batayein — jaise '2 kilo atta' ya 'Amul butter 500g'.",
    "Maaf kijiye, hum sirf kirana aur grocery orders lete hain! Yeh order se sambandhit nahi hai. Aapko kya mangana hai, dobara batayein?",
    "Yeh kirana order desk hai, yeh baat order se judi hui nahi lag rahi. Kripya batayein aapko kaunsa samaan chahiye aur kitni quantity mein?",
]

_ORDER_PHRASES = [
    "good day", "mother dairy", "red label", "india gate", "brooke bond",
    "surf excel", "garam masala", "mustard oil", "sunflower oil", "groundnut oil",
    "refined oil", "desi ghee", "wheat flour", "tata salt", "parle g", "toor dal", "moong dal",
    "masoor dal", "arhar dal", "chana dal", "urad dal", "kabuli chana", "sona masoori",
    "basmati rice", "rock salt", "sendha namak", "red chilli", "cumin seeds",
    "kitchen king", "chana masala", "rajma masala", "chole masala", "wagh bakri",
    "marie gold", "nutri choice", "hide seek", "dairy milk", "kit kat", "clinic plus",
    "dishwash bar", "dishwash liquid", "floor cleaner", "toilet cleaner", "glass cleaner",
    "baby powder", "de do", "bhej do", "le aao", "dal do", "pack karo", "add karo",
    "hata do", "kitna hai", "kya bhav", "kya rate", "order karna", "order desk"
]

_ORDER_KEYWORDS = {
    # Groceries & Food items
    "atta", "aata", "gehun", "wheat", "flour", "maida", "besan", "sooji", "suji", "rava",
    "sugar", "cheeni", "chini", "shakkar", "gud", "jaggery",
    "tel", "oil", "sarso", "mustard", "sunflower", "refined", "groundnut", "moongfali", "soya", "soyabean",
    "butter", "makhan", "makkhan", "ghee", "paneer", "dahi", "curd", "cheese", "cream", "malai",
    "dal", "daal", "toor", "tuvar", "arhar", "moong", "masoor", "urad", "chana", "rajma", "chhole", "chole", "kabuli", "lentil", "lentils",
    "rice", "chawal", "basmati", "poha", "masoori",
    "salt", "namak", "sendha", "haldi", "turmeric", "masala", "mirch", "mirchi", "chilli", "chili", "dhaniya", "jeera", "cumin", "hing",
    "tea", "chai", "coffee", "nescafe", "bru",
    "milk", "doodh", "toned",
    "biscuit", "biscuits", "cookie", "cookies", "rusk", "toast", "bread", "oreo", "monaco", "marie",
    "snack", "snacks", "bhujia", "mixture", "namkeen", "chips", "crisps", "lays", "kurkure",
    "maggi", "noodle", "noodles", "yippee", "pasta", "sauce", "ketchup", "jam",
    "chocolate", "choco", "silk", "kitkat",
    "water", "paani", "juice", "frooti", "maaza", "limca", "soda", "drink", "drinks",
    "sabun", "soap", "shampoo", "surf", "detergent", "ariel", "tide", "colgate", "paste", "toothpaste", "pepsodent",
    "handwash", "powder", "cleaner", "lizol", "harpic", "colin", "vim", "pril",

    # Brands
    "aashirvaad", "amul", "fortune", "patanjali", "tata", "pillsbury", "saffola", "shaktibhog", "kohinoor", "uttam",
    "catch", "mdh", "everest", "parle", "britannia", "daawat", "nestle", "cadbury", "dettol", "savlon",
    "wagh", "bakri", "lipton", "taj", "mahal", "haldirams", "sunfeast", "kissan", "modern", "bisleri",
    "lux", "dove", "lifebuoy", "head", "shoulders", "clinic", "plus",

    # Quantities & Units
    "kg", "kilo", "kilos", "kilogram", "kilograms", "g", "gm", "gms", "gram", "grams",
    "l", "lt", "ltr", "ltrs", "litre", "litres", "liter", "liters",
    "ml", "packet", "pkt", "pkts", "packets", "pack", "packs", "pouch", "pouches",
    "bottle", "bottles", "dabba", "dibba", "can", "cans", "tin", "tins", "piece", "pc", "pcs", "dozen", "darjan",

    # Quantities / Hindi numerals & Fractions
    "aadha", "half", "paav", "dedh", "dhai",

    # Order action verbs & kirana terms
    "order", "chahiye", "dena", "bhejo", "bhej", "lana", "lao", "lena",
    "mangwana", "mangana", "pack", "daalo", "rakho", "kitna", "kitne",
    "price", "rate", "bhav", "rupay", "rupaye", "rs", "bill", "delivery", "samaan",
    "kirana", "grocery", "khareedna", "buy",

    # Reply options for clarifications
    "pehla", "doosra", "first", "second", "dono", "both", "haan", "theek", "chalega",
    "chota", "chhota", "bada", "small", "large", "medium",

    # Stock / inventory queries
    "stock", "quantity", "available", "inventory", "bacha", "baki", "left",
    "remaining", "milega", "kitna", "kitne", "kitni", "much", "how",
}


def detect_off_topic(message):
    """
    Returns True if the message appears completely unrelated to groceries/ordering.
    Pure Python, instant and quota-safe.
    """
    msg = message.lower().strip()
    if not msg:
        return True

    # Check multi-word order phrases first
    for phrase in _ORDER_PHRASES:
        if phrase in msg:
            return False

    # Extract alphanumeric word tokens (also separates '5kg' -> '5', 'kg')
    tokens = set(re.findall(r'[a-z]+|\d+', msg))

    # Check if any token matches order keywords
    if any(token in _ORDER_KEYWORDS for token in tokens):
        return False

    return True


def get_off_topic_reply():
    """Pick randomly from the 2-3 friendly off-topic redirection responses."""
    import random
    return random.choice(OFF_TOPIC_REPLIES)


def generate_clarification(pending_items):
    pending_str = "\n".join(
        f"- {p['item']}: {p['reason']}" for p in pending_items
    )
    prompt = CLARIFY_PROMPT.format(pending=pending_str)
    return _gemini(prompt).strip()


def resolve_reply(pending_items, customer_reply):
    pending_str = json.dumps(pending_items, ensure_ascii=False)
    prompt = RESOLVE_PROMPT.format(pending=pending_str, reply=customer_reply)
    try:
        return json.loads(clean_json(_gemini(prompt)))
    except (json.JSONDecodeError, ValueError):
        # Fallback: mark everything as unresolved
        return {"resolved": [], "unresolved": [p["item"] for p in pending_items]}


def generate_delivery_note(items, timing, total):
    items_str = ", ".join(
        f"{i['product_name']} x{i['qty']}{i['unit']}" for i in items
    )
    timing_hint = timing if timing else "jaldi se (ASAP)"
    prompt = DELIVERY_PROMPT.format(items=items_str, timing=timing_hint, total=total)
    return _gemini(prompt).strip()