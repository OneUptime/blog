# How to Build a URL Shortener with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, URL Shortener, Hash, Click Tracking, Caching

Description: Build a production-ready URL shortener with Redis featuring click tracking, custom aliases, expiry, and analytics using Hashes and Sorted Sets.

---

## Overview

A URL shortener maps short codes to long URLs. Redis is a natural fit: Hash storage for URL metadata, O(1) redirect lookups, atomic click counting with INCR, and sorted sets for analytics. Redis can handle millions of redirects per second - far more than a traditional database.

## URL Storage Design

```text
url:{short_code}                -> Hash: {original_url, created_at, expires_at, clicks, user_id}
url:shortcode_counter           -> String: auto-incrementing ID for base62 encoding
url:custom:{alias}              -> String: points to short_code for custom aliases
url:clicks:hourly:{short_code}  -> Sorted Set: hourly click counts
url:clicks:daily:{short_code}   -> Sorted Set: daily click counts
url:referrers:{short_code}      -> Sorted Set: referrer click counts
url:global:clicks               -> Sorted Set: global click counts for top-N queries
```

## Generating Short Codes

```python
import time
import string
from redis import Redis

r = Redis(host='localhost', port=6379, decode_responses=True)

BASE62 = string.ascii_letters + string.digits  # 62 chars

def encode_base62(num: int) -> str:
    """Convert integer to base62 string."""
    if num == 0:
        return BASE62[0]
    result = []
    while num:
        num, rem = divmod(num, 62)
        result.append(BASE62[rem])
    return "".join(reversed(result))

def generate_short_code() -> str:
    """Generate next unique short code using atomic counter."""
    counter = r.incr("url:shortcode_counter")
    return encode_base62(counter)

def create_short_url(
    original_url: str,
    user_id: str = None,
    custom_alias: str = None,
    ttl_days: int = None
) -> dict:
    """Create a shortened URL."""
    # Check custom alias availability
    if custom_alias:
        if r.exists(f"url:custom:{custom_alias}"):
            raise ValueError(f"Alias '{custom_alias}' is already taken")
        short_code = custom_alias
    else:
        short_code = generate_short_code()

    url_key = f"url:{short_code}"
    created_at = int(time.time())
    expires_at = created_at + ttl_days * 86400 if ttl_days else None

    url_data = {
        "short_code": short_code,
        "original_url": original_url,
        "created_at": str(created_at),
        "clicks": "0",
        "user_id": user_id or ""
    }
    if expires_at:
        url_data["expires_at"] = str(expires_at)

    r.hset(url_key, mapping=url_data)

    if ttl_days:
        r.expire(url_key, ttl_days * 86400)

    if custom_alias:
        r.set(f"url:custom:{custom_alias}", short_code)

    return {
        "short_code": short_code,
        "short_url": f"https://sho.rt/{short_code}",
        "original_url": original_url,
        "expires_at": expires_at
    }
```

## Redirect with Click Tracking

```python
def resolve_url(short_code: str, track: bool = True) -> str | None:
    """Look up original URL and track the click."""
    url_key = f"url:{short_code}"
    url_data = r.hgetall(url_key)

    if not url_data:
        return None

    # Check expiry
    expires_at = url_data.get("expires_at")
    if expires_at and int(expires_at) < int(time.time()):
        return None

    if track:
        track_click(short_code)

    return url_data.get("original_url")

def track_click(
    short_code: str,
    referrer: str = None,
    country: str = None
):
    """Record a click with analytics."""
    pipe = r.pipeline()

    # Increment total click counter
    pipe.hincrby(f"url:{short_code}", "clicks", 1)

    # Hourly click tracking for analytics
    hour_bucket = int(time.time()) // 3600
    pipe.zincrby(f"url:clicks:hourly:{short_code}", 1, str(hour_bucket))
    pipe.expire(f"url:clicks:hourly:{short_code}", 30 * 86400)

    # Daily totals
    day_bucket = int(time.time()) // 86400
    pipe.zincrby(f"url:clicks:daily:{short_code}", 1, str(day_bucket))
    pipe.expire(f"url:clicks:daily:{short_code}", 365 * 86400)

    # Referrer tracking
    if referrer:
        pipe.zincrby(f"url:referrers:{short_code}", 1, referrer)
        pipe.expire(f"url:referrers:{short_code}", 30 * 86400)

    # Global click leaderboard for top-N queries
    pipe.zincrby("url:global:clicks", 1, short_code)

    pipe.execute()
```

## Analytics

```python
def get_url_analytics(short_code: str) -> dict:
    """Get comprehensive analytics for a short URL."""
    url_data = r.hgetall(f"url:{short_code}")
    if not url_data:
        return {}

    # Get last 24 hours of clicks
    now_hour = int(time.time()) // 3600
    hourly_clicks = r.zrangebyscore(
        f"url:clicks:hourly:{short_code}",
        now_hour - 24,
        now_hour,
        withscores=True
    )

    # Top referrers
    top_referrers = r.zrevrange(
        f"url:referrers:{short_code}",
        0, 4,
        withscores=True
    )

    return {
        "short_code": short_code,
        "original_url": url_data.get("original_url"),
        "total_clicks": int(url_data.get("clicks", 0)),
        "created_at": url_data.get("created_at"),
        "hourly_clicks_24h": [
            {"hour": int(h), "clicks": int(c)}
            for h, c in hourly_clicks
        ],
        "top_referrers": [
            {"referrer": ref, "count": int(cnt)}
            for ref, cnt in top_referrers
        ]
    }

def get_top_urls(limit: int = 10) -> list[dict]:
    """Get top URLs by click count."""
    # Use a global clicks sorted set for top-N queries
    top = r.zrevrange("url:global:clicks", 0, limit - 1, withscores=True)
    return [
        {"short_code": code, "total_clicks": int(clicks)}
        for code, clicks in top
    ]
```

## FastAPI Router

```python
from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse

app = FastAPI()

@app.post("/shorten")
def shorten_url(original_url: str, alias: str = None, ttl_days: int = None):
    try:
        result = create_short_url(original_url, custom_alias=alias, ttl_days=ttl_days)
        return result
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

@app.get("/analytics/{short_code}")
def analytics(short_code: str):
    data = get_url_analytics(short_code)
    if not data:
        raise HTTPException(status_code=404)
    return data

@app.get("/{short_code}")
def redirect(short_code: str):
    url = resolve_url(short_code)
    if not url:
        raise HTTPException(status_code=404, detail="Short URL not found or expired")
    return RedirectResponse(url=url, status_code=302)
```

## Summary

Redis powers a URL shortener with sub-millisecond redirects using Hash-based storage for URL metadata and atomic `INCR` for click counting. Base62 encoding of an auto-incrementing Redis counter generates compact, collision-free short codes. Sorted Sets with time-bucketed scores enable hour-by-hour and day-by-day click analytics without additional time-series databases.
