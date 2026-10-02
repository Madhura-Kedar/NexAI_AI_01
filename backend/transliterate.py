# coding: utf-8
import re

HINDI_NUMBERS = {
    '\u0966': '0', '\u0967': '1', '\u0968': '2', '\u0969': '3', '\u096A': '4',
    '\u096B': '5', '\u096C': '6', '\u096D': '7', '\u096E': '8', '\u096F': '9'
}

COMMON_HINDI_WORDS = {
    'आटा': 'atta',
    'आटाका': 'atta ka',
    'गेहूं': 'gehun',
    'मैदा': 'maida',
    'बेसन': 'besan',
    'सूजी': 'sooji',
    'रवा': 'rava',
    'चीनी': 'cheeni',
    'शक्कर': 'shakkar',
    'गुड़': 'gud',
    'गुड़': 'gud',
    'तेल': 'tel',
    'सरसों': 'sarso',
    'रिफाइंड': 'refined',
    'सोयाबीन': 'soyabean',
    'सूरजमुखी': 'sunflower',
    'मूंगफली': 'groundnut',
    'दूध': 'doodh',
    'दही': 'dahi',
    'मक्खन': 'makhan',
    'मखन': 'makhan',
    'बटर': 'butter',
    'घी': 'ghee',
    'दाल': 'dal',
    'तूर': 'toor',
    'अरहर': 'arhar',
    'मूंग': 'moong',
    'मसूर': 'masoor',
    'उड़द': 'urad',
    'चना': 'chana',
    'चावल': 'chawal',
    'बासमती': 'basmati',
    'नमक': 'namak',
    'हल्दी': 'haldi',
    'मसाला': 'masala',
    'मिर्च': 'mirch',
    'चाय': 'chai',
    'कॉफी': 'coffee',
    'बिस्कुट': 'biscuit',
    'बिस्किट': 'biscuit',
    'साबुन': 'sabun',
    'सर्फ': 'surf',
    'कोलगेट': 'colgate',
    'पेस्ट': 'paste',
    
    # Brands
    'अमूल': 'amul',
    'आशीर्वाद': 'aashirvaad',
    'फॉर्च्यून': 'fortune',
    'पतंजलि': 'patanjali',
    'टाटा': 'tata',
    'पिल्सबरी': 'pillsbury',
    'सफोला': 'saffola',
    'मदर': 'mother',
    'डेयरी': 'dairy',
    'पारले': 'parle',
    'ब्रिटानिया': 'britannia',
    'दावत': 'daawat',
    'मैगी': 'maggi',
    
    # Units
    'किलो': 'kilo',
    'किग्रा': 'kg',
    'केजी': 'kg',
    'ग्राम': 'gram',
    'लीटर': 'litre',
    'मिली': 'ml',
    'पैकेट': 'packet',
    'डिब्बा': 'dabba',
    'बोतल': 'bottle',
    
    # Actions & Numbers
    'चाहिए': 'chahiye',
    'दो': 'do',
    'देना': 'dena',
    'दे': 'de',
    'दीजिए': 'dijiye',
    'भेज': 'bhej',
    'भेजो': 'bhejo',
    'भेजिए': 'bhejiye',
    'लाना': 'lana',
    'लाओ': 'lao',
    'लेना': 'lena',
    'लो': 'lo',
    'ऑर्डर': 'order',
    'आर्डर': 'order',
    'कैंसिल': 'cancel',
    'रद्द': 'cancel',
    'हटाओ': 'hatao',
    'हटा': 'hata',
    'नहीं': 'nahi',
    'मत': 'mat',
    'एक': 'ek',
    'तीन': 'teen',
    'चार': 'char',
    'पांच': 'paanch',
    'छह': 'chhe',
    'सात': 'saat',
    'आठ': 'aath',
    'नौ': 'nau',
    'दस': 'das',
    'आधा': 'aadha',
    'पाव': 'paav',
    'डेढ़': 'dedh',
    'ढाई': 'dhai',
    'और': 'aur',
    'का': 'ka',
    'की': 'ki',
    'के': 'ke',
    'मुझे': 'mujhe',
    'हमको': 'humko',
    'भैया': 'bhaiya',
    'दुकान': 'dukan',
    'कितना': 'kitna',
    'भाव': 'bhav',
    'रेट': 'rate',
    'बिल': 'bill'
}

DEVA_VOWELS = {
    '\u0905': 'a', '\u0906': 'aa', '\u0907': 'i', '\u0908': 'ee',
    '\u0909': 'u', '\u090A': 'oo', '\u090B': 'ri', '\u090F': 'e',
    '\u0910': 'ai', '\u0913': 'o', '\u0914': 'au'
}

DEVA_CONSONANTS = {
    '\u0915': 'k', '\u0916': 'kh', '\u0917': 'g', '\u0918': 'gh', '\u0919': 'ng',
    '\u091A': 'ch', '\u091B': 'chh', '\u091C': 'j', '\u091D': 'jh', '\u091E': 'ny',
    '\u091F': 't', '\u0920': 'th', '\u0921': 'd', '\u0922': 'dh', '\u0923': 'n',
    '\u0924': 't', '\u0925': 'th', '\u0926': 'd', '\u0927': 'dh', '\u0928': 'n',
    '\u092A': 'p', '\u092B': 'f', '\u092C': 'b', '\u092D': 'bh', '\u092E': 'm',
    '\u092F': 'y', '\u0930': 'r', '\u0932': 'l', '\u0935': 'v',
    '\u0936': 'sh', '\u0937': 'sh', '\u0938': 's', '\u0939': 'h',
    '\u0958': 'q', '\u0959': 'kh', '\u095A': 'g', '\u095B': 'z',
    '\u095C': 'r', '\u095D': 'rh', '\u095E': 'f'
}

DEVA_MATRAS = {
    '\u093E': 'aa', '\u093F': 'i', '\u0940': 'ee', '\u0941': 'u',
    '\u0942': 'oo', '\u0943': 'ri', '\u0947': 'e', '\u0948': 'ai',
    '\u094B': 'o', '\u094C': 'au', '\u0949': 'o', '\u094A': 'o'
}

VIRAMA = '\u094D'
ANUSVARA = '\u0902'
CHANDRABINDU = '\u0901'
VISARGA = '\u0903'
NUKTA = '\u093C'

def _transliterate_word(word):
    w_clean = word.strip('.,!?-;:()[]{}')
    if w_clean in COMMON_HINDI_WORDS:
        return word.replace(w_clean, COMMON_HINDI_WORDS[w_clean])
    
    chars = list(word)
    res = []
    i = 0
    n = len(chars)
    while i < n:
        c = chars[i]
        
        if c in HINDI_NUMBERS:
            res.append(HINDI_NUMBERS[c])
            i += 1
            continue
            
        if c in DEVA_VOWELS:
            res.append(DEVA_VOWELS[c])
            i += 1
            continue
            
        if c in DEVA_CONSONANTS:
            base = DEVA_CONSONANTS[c]
            if i + 1 < n:
                next_c = chars[i + 1]
                if next_c == VIRAMA:
                    res.append(base)
                    i += 2
                    continue
                elif next_c in DEVA_MATRAS:
                    res.append(base + DEVA_MATRAS[next_c])
                    i += 2
                    continue
                elif next_c == NUKTA:
                    if i + 2 < n and chars[i + 2] in DEVA_MATRAS:
                        res.append(base + DEVA_MATRAS[chars[i + 2]])
                        i += 3
                        continue
                    elif i + 2 < n and chars[i + 2] == VIRAMA:
                        res.append(base)
                        i += 3
                        continue
                    else:
                        res.append(base)
                        i += 2
                        continue
                else:
                    if i + 1 == n or chars[i + 1] in ' \t\n.,!?-':
                        res.append(base)
                    else:
                        res.append(base + 'a')
                    i += 1
                    continue
            else:
                res.append(base)
                i += 1
                continue
                
        if c == ANUSVARA or c == CHANDRABINDU:
            res.append('n')
            i += 1
            continue
            
        if c == VISARGA:
            res.append('h')
            i += 1
            continue
            
        if c == VIRAMA or c == NUKTA:
            i += 1
            continue
            
        res.append(c)
        i += 1
        
    return ''.join(res)

def transliterate_hindi_to_roman(text):
    """
    If text contains Devanagari script (Hindi), transliterate it into Roman script (Hinglish).
    If text is already Roman/English script, returns it as-is.
    """
    if not text:
        return ""
    
    # Check if any Devanagari characters are present
    if not re.search(r'[\u0900-\u097F]', text):
        return text

    for hn, an in HINDI_NUMBERS.items():
        text = text.replace(hn, an)

    words = text.split()
    transliterated_words = [_transliterate_word(w) for w in words]
    res = ' '.join(transliterated_words)
    res = re.sub(r'\s+', ' ', res).strip()
    return res
