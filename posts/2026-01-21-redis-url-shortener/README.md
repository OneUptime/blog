# How to Build a URL Shortener with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, URL Shortener, Key-Value, Python, Node.js, Web Development

Description: A comprehensive guide to building a fast and scalable URL shortener with Redis, covering short code generation, click tracking, analytics, and production deployment patterns.

---

URL shorteners are ubiquitous on the web - from social media sharing to marketing campaigns. They transform long, unwieldy URLs into compact, shareable links while providing valuable click analytics. Redis is an ideal backend for URL shorteners due to its speed, simplicity, and support for atomic operations.

In this guide, we will build a complete URL shortener with Redis, covering short code generation, click tracking, analytics, expiration, and production considerations.

## Why Redis for URL Shorteners?

Redis offers several advantages for URL shortener implementations:

- **Sub-millisecond Lookups**: Key-value operations are extremely fast
- **Simple Data Model**: URLs map naturally to Redis strings
- **Atomic Operations**: INCR for click counters prevents race conditions
- **TTL Support**: Built-in expiration for temporary links
- **High Availability**: Redis Cluster for production deployments
- **Memory Efficiency**: Compact storage for millions of URLs

## Basic URL Shortener Implementation

### Core Functionality in Python

```python
import redis
import string
import random
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from urllib.parse import urlparse

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Configuration
SHORT_CODE_LENGTH = 7
BASE_URL = "https://short.ly"
DEFAULT_TTL = 365 * 24 * 60 * 60  # 1 year

class URLShortener:
    # Character set for short codes (URL-safe)
    CHARSET = string.ascii_letters + string.digits  # a-zA-Z0-9

    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url

    def _generate_short_code(self, length: int = SHORT_CODE_LENGTH) -> str:
        """Generate a random short code."""
        return ''.join(random.choices(self.CHARSET, k=length))

    def _is_valid_url(self, url: str) -> bool:
        """Validate that the URL is properly formatted."""
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except Exception:
            return False

    def shorten(self, original_url: str, custom_code: str = None,
                ttl: int = None, user_id: str = None) -> Dict:
        """Create a shortened URL."""
        # Validate URL
        if not self._is_valid_url(original_url):
            return {"error": "Invalid URL format"}

        # Use custom code or generate one
        if custom_code:
            short_code = custom_code
            # Check if custom code is already taken
            if r.exists(f"url:{short_code}"):
                return {"error": "Custom code already in use"}
        else:
            # Generate unique short code
            attempts = 0
            while attempts < 10:
                short_code = self._generate_short_code()
                if not r.exists(f"url:{short_code}"):
                    break
                attempts += 1
            else:
                return {"error": "Could not generate unique code"}

        # Store URL data
        url_data = {
            "original_url": original_url,
            "short_code": short_code,
            "created_at": datetime.now().isoformat(),
            "user_id": user_id or "anonymous",
            "clicks": 0
        }

        pipe = r.pipeline()

        # Store URL mapping
        pipe.hset(f"url:{short_code}", mapping=url_data)

        # Set TTL if specified
        if ttl:
            pipe.expire(f"url:{short_code}", ttl)
        elif DEFAULT_TTL:
            pipe.expire(f"url:{short_code}", DEFAULT_TTL)

        # Store reverse mapping (original URL to short code)
        url_hash = hashlib.md5(original_url.encode()).hexdigest()
        pipe.set(f"url:lookup:{url_hash}", short_code)

        # Track user's URLs if logged in
        if user_id:
            pipe.sadd(f"user:urls:{user_id}", short_code)

        # Increment global URL count
        pipe.incr("stats:total_urls")

        pipe.execute()

        return {
            "short_url": f"{self.base_url}/{short_code}",
            "short_code": short_code,
            "original_url": original_url
        }

    def resolve(self, short_code: str) -> Optional[str]:
        """Resolve a short code to the original URL."""
        url_data = r.hget(f"url:{short_code}", "original_url")
        return url_data

    def get_url_info(self, short_code: str) -> Optional[Dict]:
        """Get full information about a shortened URL."""
        url_data = r.hgetall(f"url:{short_code}")
        if not url_data:
            return None

        return {
            "original_url": url_data.get("original_url"),
            "short_code": url_data.get("short_code"),
            "created_at": url_data.get("created_at"),
            "clicks": int(url_data.get("clicks", 0)),
            "user_id": url_data.get("user_id")
        }

    def delete_url(self, short_code: str, user_id: str = None) -> bool:
        """Delete a shortened URL."""
        url_data = r.hgetall(f"url:{short_code}")

        if not url_data:
            return False

        # Verify ownership if user_id provided
        if user_id and url_data.get("user_id") != user_id:
            return False

        pipe = r.pipeline()

        # Remove URL mapping
        pipe.delete(f"url:{short_code}")

        # Remove reverse lookup
        url_hash = hashlib.md5(url_data["original_url"].encode()).hexdigest()
        pipe.delete(f"url:lookup:{url_hash}")

        # Remove from user's URLs
        if url_data.get("user_id"):
            pipe.srem(f"user:urls:{url_data['user_id']}", short_code)

        # Delete analytics data
        pipe.delete(f"clicks:{short_code}")
        pipe.delete(f"clicks:daily:{short_code}")

        pipe.execute()
        return True

    def get_or_create(self, original_url: str) -> Dict:
        """Get existing short URL or create a new one."""
        url_hash = hashlib.md5(original_url.encode()).hexdigest()
        existing_code = r.get(f"url:lookup:{url_hash}")

        if existing_code:
            return {
                "short_url": f"{self.base_url}/{existing_code}",
                "short_code": existing_code,
                "original_url": original_url,
                "existing": True
            }

        result = self.shorten(original_url)
        result["existing"] = False
        return result


# Usage
shortener = URLShortener()

# Create a short URL
result = shortener.shorten("https://example.com/very/long/path/to/page?param=value")
print(f"Short URL: {result['short_url']}")

# Create with custom code
result = shortener.shorten(
    "https://example.com/promo",
    custom_code="summer24",
    ttl=30 * 24 * 60 * 60  # 30 days
)
print(f"Custom URL: {result['short_url']}")

# Resolve URL
original = shortener.resolve("summer24")
print(f"Original URL: {original}")

# Get URL info
info = shortener.get_url_info("summer24")
print(f"URL Info: {info}")
```

## Click Tracking and Analytics

Track clicks with detailed analytics:

```python
import json
from user_agents import parse as parse_ua
from datetime import datetime, timedelta

class URLShortenerWithAnalytics(URLShortener):
    def track_click(self, short_code: str, request_data: Dict) -> bool:
        """Track a click with analytics data."""
        # Verify URL exists
        if not r.exists(f"url:{short_code}"):
            return False

        now = datetime.now()
        today = now.strftime("%Y-%m-%d")
        hour = now.strftime("%Y-%m-%d:%H")

        # Parse user agent
        ua_string = request_data.get("user_agent", "")
        ua = parse_ua(ua_string)

        click_data = {
            "timestamp": now.isoformat(),
            "ip": request_data.get("ip", "unknown"),
            "user_agent": ua_string,
            "referer": request_data.get("referer", ""),
            "country": request_data.get("country", "unknown"),
            "city": request_data.get("city", "unknown"),
            "device": ua.device.family,
            "browser": ua.browser.family,
            "os": ua.os.family,
            "is_mobile": ua.is_mobile,
            "is_bot": ua.is_bot
        }

        pipe = r.pipeline()

        # Increment total clicks
        pipe.hincrby(f"url:{short_code}", "clicks", 1)

        # Store click details (keep last 1000 clicks)
        pipe.lpush(f"clicks:{short_code}", json.dumps(click_data))
        pipe.ltrim(f"clicks:{short_code}", 0, 999)

        # Increment daily counter
        pipe.hincrby(f"clicks:daily:{short_code}", today, 1)
        pipe.expire(f"clicks:daily:{short_code}", 90 * 24 * 3600)  # 90 days

        # Increment hourly counter
        pipe.hincrby(f"clicks:hourly:{short_code}", hour, 1)
        pipe.expire(f"clicks:hourly:{short_code}", 7 * 24 * 3600)  # 7 days

        # Track by country
        country = click_data.get("country", "unknown")
        pipe.hincrby(f"clicks:country:{short_code}", country, 1)

        # Track by device type
        device = "mobile" if click_data["is_mobile"] else "desktop"
        pipe.hincrby(f"clicks:device:{short_code}", device, 1)

        # Track by browser
        pipe.hincrby(f"clicks:browser:{short_code}", click_data["browser"], 1)

        # Track by referer domain
        referer = click_data.get("referer", "")
        if referer:
            try:
                referer_domain = urlparse(referer).netloc or "direct"
            except Exception:
                referer_domain = "direct"
        else:
            referer_domain = "direct"
        pipe.hincrby(f"clicks:referer:{short_code}", referer_domain, 1)

        # Track unique visitors (HyperLogLog)
        visitor_id = f"{click_data['ip']}:{ua_string}"
        pipe.pfadd(f"clicks:unique:{short_code}:{today}", visitor_id)
        pipe.expire(f"clicks:unique:{short_code}:{today}", 90 * 24 * 3600)

        # Global stats
        pipe.incr("stats:total_clicks")

        pipe.execute()
        return True

    def get_analytics(self, short_code: str, days: int = 30) -> Dict:
        """Get comprehensive analytics for a URL."""
        url_data = r.hgetall(f"url:{short_code}")

        if not url_data:
            return {"error": "URL not found"}

        # Get daily clicks for the period
        daily_clicks = r.hgetall(f"clicks:daily:{short_code}")
        hourly_clicks = r.hgetall(f"clicks:hourly:{short_code}")

        # Filter to requested time period
        now = datetime.now()
        filtered_daily = {}
        for i in range(days):
            date = (now - timedelta(days=i)).strftime("%Y-%m-%d")
            filtered_daily[date] = int(daily_clicks.get(date, 0))

        # Get breakdown stats
        country_stats = r.hgetall(f"clicks:country:{short_code}")
        device_stats = r.hgetall(f"clicks:device:{short_code}")
        browser_stats = r.hgetall(f"clicks:browser:{short_code}")
        referer_stats = r.hgetall(f"clicks:referer:{short_code}")

        # Get unique visitors for today
        today = now.strftime("%Y-%m-%d")
        unique_today = r.pfcount(f"clicks:unique:{short_code}:{today}")

        # Calculate total unique visitors
        unique_keys = [
            f"clicks:unique:{short_code}:{(now - timedelta(days=i)).strftime('%Y-%m-%d')}"
            for i in range(days)
        ]
        existing_keys = [k for k in unique_keys if r.exists(k)]
        total_unique = r.pfcount(*existing_keys) if existing_keys else 0

        # Get recent clicks
        recent_clicks = r.lrange(f"clicks:{short_code}", 0, 9)
        recent_clicks = [json.loads(c) for c in recent_clicks]

        return {
            "url_info": {
                "original_url": url_data.get("original_url"),
                "short_code": short_code,
                "created_at": url_data.get("created_at"),
                "total_clicks": int(url_data.get("clicks", 0))
            },
            "summary": {
                "total_clicks": int(url_data.get("clicks", 0)),
                "unique_visitors": total_unique,
                "unique_today": unique_today
            },
            "daily_clicks": filtered_daily,
            "by_country": {k: int(v) for k, v in country_stats.items()},
            "by_device": {k: int(v) for k, v in device_stats.items()},
            "by_browser": {k: int(v) for k, v in browser_stats.items()},
            "by_referer": {k: int(v) for k, v in referer_stats.items()},
            "recent_clicks": recent_clicks
        }

    def redirect_with_tracking(self, short_code: str,
                               request_data: Dict) -> Optional[str]:
        """Get redirect URL and track the click."""
        original_url = self.resolve(short_code)

        if original_url:
            self.track_click(short_code, request_data)

        return original_url


# Flask API example
from flask import Flask, request, redirect, jsonify

app = Flask(__name__)
shortener = URLShortenerWithAnalytics()

@app.route('/<short_code>')
def redirect_url(short_code):
    request_data = {
        "ip": request.remote_addr,
        "user_agent": request.headers.get("User-Agent", ""),
        "referer": request.headers.get("Referer", ""),
        "country": request.headers.get("CF-IPCountry", "unknown"),  # Cloudflare
    }

    original_url = shortener.redirect_with_tracking(short_code, request_data)

    if original_url:
        return redirect(original_url, code=301)
    else:
        return "URL not found", 404

@app.route('/api/shorten', methods=['POST'])
def api_shorten():
    data = request.get_json()
    result = shortener.shorten(
        data['url'],
        custom_code=data.get('custom_code'),
        ttl=data.get('ttl')
    )
    return jsonify(result)

@app.route('/api/analytics/<short_code>')
def api_analytics(short_code):
    days = request.args.get('days', 30, type=int)
    analytics = shortener.get_analytics(short_code, days)
    return jsonify(analytics)
```

## Node.js Implementation

```javascript
const Redis = require('ioredis');
const crypto = require('crypto');
const { URL } = require('url');

const redis = new Redis({
  host: 'localhost',
  port: 6379
});

const CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SHORT_CODE_LENGTH = 7;
const BASE_URL = 'https://short.ly';
const DEFAULT_TTL = 365 * 24 * 60 * 60;

class URLShortener {
  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  generateShortCode(length = SHORT_CODE_LENGTH) {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
    }
    return code;
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  async shorten(originalUrl, options = {}) {
    const { customCode, ttl, userId } = options;

    if (!this.isValidUrl(originalUrl)) {
      return { error: 'Invalid URL format' };
    }

    let shortCode;
    if (customCode) {
      const exists = await redis.exists(`url:${customCode}`);
      if (exists) {
        return { error: 'Custom code already in use' };
      }
      shortCode = customCode;
    } else {
      for (let i = 0; i < 10; i++) {
        shortCode = this.generateShortCode();
        const exists = await redis.exists(`url:${shortCode}`);
        if (!exists) break;
      }
    }

    const urlData = {
      original_url: originalUrl,
      short_code: shortCode,
      created_at: new Date().toISOString(),
      user_id: userId || 'anonymous',
      clicks: 0
    };

    const urlHash = crypto.createHash('md5').update(originalUrl).digest('hex');

    const pipeline = redis.pipeline();
    pipeline.hset(`url:${shortCode}`, urlData);

    if (ttl) {
      pipeline.expire(`url:${shortCode}`, ttl);
    } else {
      pipeline.expire(`url:${shortCode}`, DEFAULT_TTL);
    }

    pipeline.set(`url:lookup:${urlHash}`, shortCode);

    if (userId) {
      pipeline.sadd(`user:urls:${userId}`, shortCode);
    }

    pipeline.incr('stats:total_urls');

    await pipeline.exec();

    return {
      short_url: `${this.baseUrl}/${shortCode}`,
      short_code: shortCode,
      original_url: originalUrl
    };
  }

  async resolve(shortCode) {
    return redis.hget(`url:${shortCode}`, 'original_url');
  }

  async trackClick(shortCode, requestData) {
    const exists = await redis.exists(`url:${shortCode}`);
    if (!exists) return false;

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const clickData = {
      timestamp: now.toISOString(),
      ip: requestData.ip || 'unknown',
      user_agent: requestData.userAgent || '',
      referer: requestData.referer || '',
      country: requestData.country || 'unknown'
    };

    const pipeline = redis.pipeline();

    pipeline.hincrby(`url:${shortCode}`, 'clicks', 1);
    pipeline.lpush(`clicks:${shortCode}`, JSON.stringify(clickData));
    pipeline.ltrim(`clicks:${shortCode}`, 0, 999);
    pipeline.hincrby(`clicks:daily:${shortCode}`, today, 1);
    pipeline.expire(`clicks:daily:${shortCode}`, 90 * 24 * 3600);
    pipeline.hincrby(`clicks:country:${shortCode}`, clickData.country, 1);
    pipeline.incr('stats:total_clicks');

    await pipeline.exec();
    return true;
  }

  async getAnalytics(shortCode, days = 30) {
    const urlData = await redis.hgetall(`url:${shortCode}`);

    if (!urlData || Object.keys(urlData).length === 0) {
      return { error: 'URL not found' };
    }

    const [dailyClicks, countryStats, recentClicks] = await Promise.all([
      redis.hgetall(`clicks:daily:${shortCode}`),
      redis.hgetall(`clicks:country:${shortCode}`),
      redis.lrange(`clicks:${shortCode}`, 0, 9)
    ]);

    return {
      url_info: {
        original_url: urlData.original_url,
        short_code: shortCode,
        created_at: urlData.created_at,
        total_clicks: parseInt(urlData.clicks || 0, 10)
      },
      daily_clicks: Object.fromEntries(
        Object.entries(dailyClicks).map(([k, v]) => [k, parseInt(v, 10)])
      ),
      by_country: Object.fromEntries(
        Object.entries(countryStats).map(([k, v]) => [k, parseInt(v, 10)])
      ),
      recent_clicks: recentClicks.map(c => JSON.parse(c))
    };
  }
}

// Express.js integration
const express = require('express');
const app = express();
app.use(express.json());

const shortener = new URLShortener();

app.get('/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  const originalUrl = await shortener.resolve(shortCode);

  if (originalUrl) {
    await shortener.trackClick(shortCode, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
      country: req.get('CF-IPCountry') || 'unknown'
    });

    return res.redirect(301, originalUrl);
  }

  res.status(404).send('URL not found');
});

app.post('/api/shorten', async (req, res) => {
  const { url, customCode, ttl, userId } = req.body;
  const result = await shortener.shorten(url, { customCode, ttl, userId });
  res.json(result);
});

app.get('/api/analytics/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  const days = parseInt(req.query.days || 30, 10);
  const analytics = await shortener.getAnalytics(shortCode, days);
  res.json(analytics);
});

app.listen(3000, () => {
  console.log('URL Shortener running on port 3000');
});
```

## Rate Limiting

Prevent abuse with rate limiting:

```python
class RateLimitedShortener(URLShortenerWithAnalytics):
    def check_rate_limit(self, identifier: str, limit: int = 10,
                        window: int = 60) -> Dict:
        """Check and update rate limit for an identifier."""
        key = f"ratelimit:shorten:{identifier}"
        current_time = int(datetime.now().timestamp())
        window_start = current_time - window

        pipe = r.pipeline()

        # Remove old entries
        pipe.zremrangebyscore(key, "-inf", window_start)

        # Count current requests
        pipe.zcard(key)

        # Add current request
        pipe.zadd(key, {str(current_time): current_time})

        # Set expiration
        pipe.expire(key, window)

        results = pipe.execute()
        current_count = results[1]

        if current_count >= limit:
            return {
                "allowed": False,
                "remaining": 0,
                "reset_in": window
            }

        return {
            "allowed": True,
            "remaining": limit - current_count - 1,
            "reset_in": window
        }

    def shorten_with_rate_limit(self, original_url: str,
                                 identifier: str, **kwargs) -> Dict:
        """Shorten URL with rate limiting."""
        rate_check = self.check_rate_limit(identifier)

        if not rate_check["allowed"]:
            return {
                "error": "Rate limit exceeded",
                "retry_after": rate_check["reset_in"]
            }

        result = self.shorten(original_url, **kwargs)
        result["rate_limit"] = {
            "remaining": rate_check["remaining"],
            "reset_in": rate_check["reset_in"]
        }

        return result


# Usage with Flask
@app.route('/api/shorten', methods=['POST'])
def api_shorten_rate_limited():
    shortener = RateLimitedShortener()
    data = request.get_json()

    # Use IP or API key as identifier
    identifier = request.headers.get("X-API-Key", request.remote_addr)

    result = shortener.shorten_with_rate_limit(
        data['url'],
        identifier,
        custom_code=data.get('custom_code'),
        ttl=data.get('ttl')
    )

    response = jsonify(result)

    # Add rate limit headers
    if "rate_limit" in result:
        response.headers["X-RateLimit-Remaining"] = result["rate_limit"]["remaining"]
        response.headers["X-RateLimit-Reset"] = result["rate_limit"]["reset_in"]

    return response
```

## Link Expiration and Cleanup

Handle expired links efficiently:

```python
class ExpiringURLShortener(URLShortenerWithAnalytics):
    def shorten_with_expiration(self, original_url: str,
                                 expires_at: datetime = None,
                                 max_clicks: int = None,
                                 **kwargs) -> Dict:
        """Create a URL with custom expiration rules."""
        result = self.shorten(original_url, **kwargs)

        if "error" in result:
            return result

        short_code = result["short_code"]
        expiration_data = {}

        if expires_at:
            expiration_data["expires_at"] = expires_at.isoformat()
            # Set Redis TTL
            ttl = int((expires_at - datetime.now()).total_seconds())
            if ttl > 0:
                r.expire(f"url:{short_code}", ttl)

        if max_clicks:
            expiration_data["max_clicks"] = max_clicks

        if expiration_data:
            r.hset(f"url:{short_code}", mapping=expiration_data)

        result["expiration"] = expiration_data
        return result

    def resolve_with_expiration_check(self, short_code: str) -> Optional[str]:
        """Resolve URL with expiration validation."""
        url_data = r.hgetall(f"url:{short_code}")

        if not url_data:
            return None

        # Check max clicks
        max_clicks = url_data.get("max_clicks")
        if max_clicks:
            current_clicks = int(url_data.get("clicks", 0))
            if current_clicks >= int(max_clicks):
                return None

        # Check expiration date
        expires_at = url_data.get("expires_at")
        if expires_at:
            expiry = datetime.fromisoformat(expires_at)
            if datetime.now() > expiry:
                return None

        return url_data.get("original_url")

    def cleanup_expired_urls(self, batch_size: int = 100) -> int:
        """Clean up expired URLs (run periodically)."""
        # This is handled automatically by Redis TTL
        # But we can clean up related data

        cursor = 0
        cleaned = 0

        while True:
            cursor, keys = r.scan(cursor, match="url:*", count=batch_size)

            for key in keys:
                if key.startswith("url:lookup:"):
                    continue

                short_code = key.split(":")[1]

                # Check if URL still exists
                if not r.exists(f"url:{short_code}"):
                    # Clean up analytics data
                    pipe = r.pipeline()
                    pipe.delete(f"clicks:{short_code}")
                    pipe.delete(f"clicks:daily:{short_code}")
                    pipe.delete(f"clicks:hourly:{short_code}")
                    pipe.delete(f"clicks:country:{short_code}")
                    pipe.delete(f"clicks:device:{short_code}")
                    pipe.delete(f"clicks:browser:{short_code}")
                    pipe.delete(f"clicks:referer:{short_code}")
                    pipe.execute()
                    cleaned += 1

            if cursor == 0:
                break

        return cleaned


# Usage
shortener = ExpiringURLShortener()

# Create URL that expires in 7 days
result = shortener.shorten_with_expiration(
    "https://example.com/limited-offer",
    expires_at=datetime.now() + timedelta(days=7)
)

# Create URL with max click limit
result = shortener.shorten_with_expiration(
    "https://example.com/exclusive-download",
    max_clicks=100
)
```

## QR Code Generation

Add QR code support:

```python
import qrcode
import io
import base64

class URLShortenerWithQR(URLShortenerWithAnalytics):
    def generate_qr_code(self, short_code: str,
                         size: int = 10) -> Optional[str]:
        """Generate QR code for a short URL."""
        short_url = f"{self.base_url}/{short_code}"

        if not r.exists(f"url:{short_code}"):
            return None

        # Check cache first
        cache_key = f"qr:{short_code}:{size}"
        cached = r.get(cache_key)
        if cached:
            return cached

        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=size,
            border=4,
        )
        qr.add_data(short_url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode()

        # Cache for 1 hour
        r.setex(cache_key, 3600, img_str)

        return img_str

    def shorten_with_qr(self, original_url: str, **kwargs) -> Dict:
        """Create short URL with QR code."""
        result = self.shorten(original_url, **kwargs)

        if "error" not in result:
            qr_code = self.generate_qr_code(result["short_code"])
            result["qr_code"] = f"data:image/png;base64,{qr_code}"

        return result


# Flask endpoint for QR codes
@app.route('/api/qr/<short_code>')
def get_qr_code(short_code):
    shortener = URLShortenerWithQR()
    qr_base64 = shortener.generate_qr_code(short_code)

    if not qr_base64:
        return "URL not found", 404

    # Return as image
    img_data = base64.b64decode(qr_base64)
    return img_data, 200, {'Content-Type': 'image/png'}
```

## Global Statistics

Track system-wide statistics:

```python
class URLShortenerStats:
    @staticmethod
    def get_global_stats() -> Dict:
        """Get global statistics."""
        pipe = r.pipeline()
        pipe.get("stats:total_urls")
        pipe.get("stats:total_clicks")
        results = pipe.execute()

        return {
            "total_urls": int(results[0] or 0),
            "total_clicks": int(results[1] or 0)
        }

    @staticmethod
    def get_top_urls(limit: int = 10) -> List[Dict]:
        """Get most clicked URLs."""
        # This requires a sorted set tracking click counts
        # which we would populate during click tracking

        # Alternative: scan URL hashes (not recommended for large datasets)
        top_urls = []
        cursor = 0

        while len(top_urls) < limit * 10:  # Get more than needed, then sort
            cursor, keys = r.scan(cursor, match="url:*", count=100)

            for key in keys:
                if ":" in key.split("url:")[1]:
                    continue

                short_code = key.split(":")[1]
                clicks = r.hget(key, "clicks")

                if clicks:
                    top_urls.append({
                        "short_code": short_code,
                        "clicks": int(clicks)
                    })

            if cursor == 0:
                break

        # Sort by clicks and return top N
        top_urls.sort(key=lambda x: x["clicks"], reverse=True)
        return top_urls[:limit]
```

## Conclusion

Redis provides an excellent foundation for building fast and scalable URL shorteners. Key takeaways:

- Use **hashes** for storing URL data and metadata
- Use **strings** for reverse lookups (original URL to short code)
- Implement **atomic counters** with HINCRBY for click tracking
- Use **TTL** for automatic link expiration
- Use **HyperLogLog** for unique visitor counting
- Implement **rate limiting** to prevent abuse
- Cache **QR codes** to avoid regeneration

With these patterns, you can build a URL shortener that handles millions of URLs and redirects with sub-millisecond latency.

## Related Resources

- [Redis String Commands](https://redis.io/commands/?group=string)
- [Redis Hash Commands](https://redis.io/commands/?group=hash)
- [Redis TTL Documentation](https://redis.io/commands/expire/)
