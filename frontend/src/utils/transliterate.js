// Transliterate Devanagari Hindi script into Roman script (Hinglish)

const HINDI_NUMBERS = {
    '\u0966': '0', '\u0967': '1', '\u0968': '2', '\u0969': '3', '\u096A': '4',
    '\u096B': '5', '\u096C': '6', '\u096D': '7', '\u096E': '8', '\u096F': '9'
}

const COMMON_HINDI_WORDS = {
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
    
    // Brands
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
    
    // Units
    'किलो': 'kilo',
    'किग्रा': 'kg',
    'केजी': 'kg',
    'ग्राम': 'gram',
    'लीटर': 'litre',
    'मिली': 'ml',
    'पैकेट': 'packet',
    'डिब्बा': 'dabba',
    'बोतल': 'bottle',
    
    // Actions & Numbers
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

const DEVA_VOWELS = {
    '\u0905': 'a', '\u0906': 'aa', '\u0907': 'i', '\u0908': 'ee',
    '\u0909': 'u', '\u090A': 'oo', '\u090B': 'ri', '\u090F': 'e',
    '\u0910': 'ai', '\u0913': 'o', '\u0914': 'au'
}

const DEVA_CONSONANTS = {
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

const DEVA_MATRAS = {
    '\u093E': 'aa', '\u093F': 'i', '\u0940': 'ee', '\u0941': 'u',
    '\u0942': 'oo', '\u0943': 'ri', '\u0947': 'e', '\u0948': 'ai',
    '\u094B': 'o', '\u094C': 'au', '\u0949': 'o', '\u094A': 'o'
}

const VIRAMA = '\u094D'
const ANUSVARA = '\u0902'
const CHANDRABINDU = '\u0901'
const VISARGA = '\u0903'
const NUKTA = '\u093C'

function transliterateWord(word) {
    const cleanWord = word.replace(/^[.,!?;:()\[\]{}]+|[.,!?;:()\[\]{}]+$/g, '')
    if (COMMON_HINDI_WORDS[cleanWord]) {
        return word.replace(cleanWord, COMMON_HINDI_WORDS[cleanWord])
    }

    const chars = Array.from(word)
    const res = []
    let i = 0
    const n = chars.length

    while (i < n) {
        const c = chars[i]

        if (HINDI_NUMBERS[c]) {
            res.push(HINDI_NUMBERS[c])
            i++
            continue
        }

        if (DEVA_VOWELS[c]) {
            res.push(DEVA_VOWELS[c])
            i++
            continue
        }

        if (DEVA_CONSONANTS[c]) {
            const base = DEVA_CONSONANTS[c]
            if (i + 1 < n) {
                const nextC = chars[i + 1]
                if (nextC === VIRAMA) {
                    res.push(base)
                    i += 2
                    continue
                } else if (DEVA_MATRAS[nextC]) {
                    res.push(base + DEVA_MATRAS[nextC])
                    i += 2
                    continue
                } else if (nextC === NUKTA) {
                    if (i + 2 < n && DEVA_MATRAS[chars[i + 2]]) {
                        res.push(base + DEVA_MATRAS[chars[i + 2]])
                        i += 3
                        continue
                    } else if (i + 2 < n && chars[i + 2] === VIRAMA) {
                        res.push(base)
                        i += 3
                        continue
                    } else {
                        res.push(base)
                        i += 2
                        continue
                    }
                } else {
                    if (i + 1 === n || /[\s.,!?-]/.test(chars[i + 1])) {
                        res.push(base)
                    } else {
                        res.push(base + 'a')
                    }
                    i++
                    continue
                }
            } else {
                res.push(base)
                i++
                continue
            }
        }

        if (c === ANUSVARA || c === CHANDRABINDU) {
            res.push('n')
            i++
            continue
        }

        if (c === VISARGA) {
            res.push('h')
            i++
            continue
        }

        if (c === VIRAMA || c === NUKTA) {
            i++
            continue
        }

        res.push(c)
        i++
    }

    return res.join('')
}

export function transliterateHindiToRoman(text) {
    if (!text) return ""

    // Check if contains any Devanagari characters
    if (!/[\u0900-\u097F]/.test(text)) {
        return text
    }

    // Replace Hindi numerals
    let processed = text
    for (const [hn, an] of Object.entries(HINDI_NUMBERS)) {
        processed = processed.replaceAll(hn, an)
    }

    const words = processed.split(/\s+/)
    const transliterated = words.map(w => transliterateWord(w))
    return transliterated.join(' ').replace(/\s+/g, ' ').trim()
}
