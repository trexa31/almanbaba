import os
import json
import datetime
import requests
import whois
import ipinfo
import dns.resolver
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

KEYS_FILE = "keys.json"
IPINFO_TOKEN = ""  # ipinfo.io token (ücretsiz alınabilir)

# ==================== KEY DOĞRULAMA ====================
def validate_key(key):
    if not os.path.exists(KEYS_FILE):
        return False
    with open(KEYS_FILE, "r") as f:
        data = json.load(f)
    if key not in data:
        return False
    expiry = datetime.datetime.fromisoformat(data[key]['expiry'])
    return expiry > datetime.datetime.now()

# ==================== IP SORGU ====================
def ip_lookup(ip):
    try:
        # ipinfo.io
        if IPINFO_TOKEN:
            handler = ipinfo.getHandler(IPINFO_TOKEN)
            details = handler.getDetails(ip)
            return details.all
        else:
            # Ücretsiz API
            resp = requests.get(f"http://ip-api.com/json/{ip}")
            data = resp.json()
            if data.get('status') == 'success':
                return {
                    'ip': data.get('query'),
                    'country': data.get('country'),
                    'city': data.get('city'),
                    'region': data.get('regionName'),
                    'zip': data.get('zip'),
                    'lat': data.get('lat'),
                    'lon': data.get('lon'),
                    'isp': data.get('isp'),
                    'org': data.get('org'),
                    'as': data.get('as')
                }
        return {"error": "IP bilgisi alınamadı"}
    except Exception as e:
        return {"error": str(e)}

# ==================== DOMAIN SORGU ====================
def domain_lookup(domain):
    result = {}
    try:
        # Whois
        w = whois.whois(domain)
        result['whois'] = {
            'registrar': w.registrar,
            'creation_date': str(w.creation_date),
            'expiration_date': str(w.expiration_date),
            'name_servers': w.name_servers,
            'emails': w.emails
        }
    except:
        result['whois'] = {"error": "Whois bilgisi alınamadı"}
    
    try:
        # DNS
        result['dns'] = {}
        for record in ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME']:
            try:
                answers = dns.resolver.resolve(domain, record)
                result['dns'][record] = [str(r) for r in answers]
            except:
                result['dns'][record] = []
    except:
        result['dns'] = {"error": "DNS bilgisi alınamadı"}
    
    try:
        # IP
        ip = socket.gethostbyname(domain)
        result['ip'] = ip
        result['ip_info'] = ip_lookup(ip)
    except:
        result['ip'] = None
    
    return result

# ==================== SOSYAL MEDYA ARAMA ====================
SOCIAL_SITES = [
    'tiktok.com', 'instagram.com', 'facebook.com', 'twitter.com', 
    'youtube.com', 'linkedin.com', 'github.com', 'reddit.com',
    'pinterest.com', 'snapchat.com', 'twitch.tv', 'tumblr.com',
    'whatsapp.com', 'telegram.org', 'discord.com', 'spotify.com',
    'soundcloud.com', 'patreon.com', 'etsy.com', 'medium.com',
    'dev.to', 'hashnode.dev', 'substack.com', 'quora.com'
]

def social_search(username):
    results = []
    for site in SOCIAL_SITES:
        url = f"https://{site}/@{username}"
        try:
            resp = requests.get(url, timeout=3)
            if resp.status_code == 200:
                results.append({
                    'site': site,
                    'url': url,
                    'exists': True
                })
            else:
                results.append({
                    'site': site,
                    'url': url,
                    'exists': False
                })
        except:
            results.append({
                'site': site,
                'url': url,
                'exists': False,
                'error': 'Bağlantı hatası'
            })
    return results

# ==================== MAIL SORGU ====================
def email_lookup(email):
    # Ücretsiz API'ler ile mail bilgisi
    result = {
        'email': email,
        'sources': []
    }
    
    # haveibeenpwned
    try:
        resp = requests.get(f"https://haveibeenpwned.com/api/v3/breachedaccount/{email}")
        if resp.status_code == 200:
            result['breaches'] = resp.json()
        else:
            result['breaches'] = []
    except:
        result['breaches'] = []
    
    # Gravatar
    import hashlib
    hash = hashlib.md5(email.lower().encode()).hexdigest()
    result['gravatar'] = f"https://www.gravatar.com/avatar/{hash}"
    
    return result

# ==================== YÜZ TARAMA (Mock) ====================
def face_scan(image_data):
    # Burada gerçek bir yüz tanıma API'si kullanılabilir (Google Vision, AWS Rekognition, vs.)
    # Şimdilik mock veri döndürüyoruz
    return {
        'detected_faces': 1,
        'confidence': 92,
        'social_media': {
            'tiktok': '@user_example',
            'instagram': '@user_example',
            'facebook': 'user.example',
            'twitter': '@user_example'
        },
        'possible_names': ['John Doe', 'Jane Doe'],
        'age_estimation': '25-30',
        'gender': 'Belirsiz'
    }

# ==================== ROTALAR ====================
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/verify', methods=['POST'])
def verify():
    key = request.json.get('key')
    if validate_key(key):
        return jsonify({'success': True})
    return jsonify({'success': False}), 401

@app.route('/api/ip', methods=['POST'])
def ip_lookup_route():
    key = request.headers.get('X-API-Key')
    if not validate_key(key):
        return jsonify({'error': 'Geçersiz key'}), 401
    
    ip = request.json.get('ip')
    if not ip:
        return jsonify({'error': 'IP adresi gerekli'}), 400
    
    data = ip_lookup(ip)
    return jsonify(data)

@app.route('/api/domain', methods=['POST'])
def domain_lookup_route():
    key = request.headers.get('X-API-Key')
    if not validate_key(key):
        return jsonify({'error': 'Geçersiz key'}), 401
    
    domain = request.json.get('domain')
    if not domain:
        return jsonify({'error': 'Domain gerekli'}), 400
    
    data = domain_lookup(domain)
    return jsonify(data)

@app.route('/api/social', methods=['POST'])
def social_lookup_route():
    key = request.headers.get('X-API-Key')
    if not validate_key(key):
        return jsonify({'error': 'Geçersiz key'}), 401
    
    username = request.json.get('username')
    if not username:
        return jsonify({'error': 'Kullanıcı adı gerekli'}), 400
    
    data = social_search(username)
    return jsonify({'results': data})

@app.route('/api/email', methods=['POST'])
def email_lookup_route():
    key = request.headers.get('X-API-Key')
    if not validate_key(key):
        return jsonify({'error': 'Geçersiz key'}), 401
    
    email = request.json.get('email')
    if not email:
        return jsonify({'error': 'Mail adresi gerekli'}), 400
    
    data = email_lookup(email)
    return jsonify(data)

@app.route('/api/face', methods=['POST'])
def face_lookup_route():
    key = request.headers.get('X-API-Key')
    if not validate_key(key):
        return jsonify({'error': 'Geçersiz key'}), 401
    
    # Fotoğraf base64 olarak gelir
    image = request.json.get('image')
    if not image:
        return jsonify({'error': 'Fotoğraf gerekli'}), 400
    
    data = face_scan(image)
    return jsonify(data)

@app.route('/api/keylerim', methods=['GET'])
def get_keys():
    if not os.path.exists(KEYS_FILE):
        return jsonify({'keys': []})
    with open(KEYS_FILE, "r") as f:
        data = json.load(f)
    
    result = []
    for key, info in data.items():
        expiry = datetime.datetime.fromisoformat(info['expiry'])
        result.append({
            'key': key,
            'expiry': info['expiry'],
            'active': expiry > datetime.datetime.now()
        })
    return jsonify({'keys': result})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
