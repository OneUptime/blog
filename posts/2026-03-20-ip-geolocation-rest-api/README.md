# How to Implement IP-Based Geolocation in REST APIs Using IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: REST API, IPv4, Geolocation, Python, Node.js, Networking

Description: Learn how to implement IPv4 address-based geolocation in REST APIs using external APIs and local databases like MaxMind GeoLite2, with caching and fallback strategies.

## Using ipapi.co (Free, No Install)

```python
import httpx
from flask import Flask, request, jsonify

app = Flask(__name__)

async def geolocate(ip: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"https://ipapi.co/{ip}/json/")
            data = resp.json()
            if resp.status_code == 200 and not data.get("error"):
                return {
                    "ip":      data.get("ip"),
                    "country": data.get("country_name"),
                    "city":    data.get("city"),
                    "region":  data.get("region"),
                    "lat":     data.get("latitude"),
                    "lon":     data.get("longitude"),
                    "org":     data.get("org"),
                }
            return {"ip": ip, "error": data.get("reason", "lookup failed")}
    except (httpx.HTTPError, ValueError):
        return {"ip": ip, "error": "lookup failed"}
```

## MaxMind GeoLite2 (Local Database - No API Calls)

```bash
# Install geoip2 library

pip install geoip2

# Download GeoLite2-City.mmdb from https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
# (requires a MaxMind account and license key)
```

```python
import geoip2.database
import geoip2.errors
from flask import Flask, request, jsonify
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)

# Load once at startup
_reader = geoip2.database.Reader("/opt/GeoLite2-City.mmdb")

def geolocate_local(ip: str) -> dict:
    try:
        response = _reader.city(ip)
        return {
            "ip":         ip,
            "country":    response.country.name,
            "country_iso":response.country.iso_code,
            "city":       response.city.name,
            "region":     response.subdivisions.most_specific.name,
            "lat":        response.location.latitude,
            "lon":        response.location.longitude,
            "timezone":   response.location.time_zone,
        }
    except geoip2.errors.AddressNotFoundError:
        return {"ip": ip, "error": "not found"}
    except Exception as e:
        return {"ip": ip, "error": str(e)}

@app.get("/api/geo")
def geo_endpoint():
    ip = request.remote_addr
    return jsonify(geolocate_local(ip))
```

## Node.js with @maxmind/geoip2-node

```javascript
const { AddressNotFoundError, Reader, ValueError } = require("@maxmind/geoip2-node");
const express = require("express");

const app = express();
app.set("trust proxy", 1);

let dbReader;

app.get("/api/geo", (req, res) => {
    const ip = req.ip;
    try {
        const result = dbReader.city(ip);
        res.json({
            ip,
            country:  result.country?.names?.en,
            city:     result.city?.names?.en,
            lat:      result.location?.latitude,
            lon:      result.location?.longitude,
            timezone: result.location?.timeZone,
        });
    } catch (err) {
        if (err instanceof AddressNotFoundError) {
            return res.status(404).json({ ip, error: "not found" });
        }
        if (err instanceof ValueError) {
            return res.status(400).json({ ip, error: "invalid IP address" });
        }
        return res.status(500).json({ ip, error: "lookup failed" });
    }
});

Reader.open("/opt/GeoLite2-City.mmdb")
    .then((reader) => {
        dbReader = reader;
        app.listen(3000);
    })
    .catch((err) => {
        console.error("Failed to open GeoLite2 database:", err);
        process.exit(1);
    });
```

## Caching Geolocation Results

```python
from functools import lru_cache
import geoip2.database

_reader = geoip2.database.Reader("/opt/GeoLite2-City.mmdb")

@lru_cache(maxsize=10_000)
def cached_geolocate(ip: str) -> tuple:
    """Cache up to 10 000 IP lookups in memory."""
    try:
        r = _reader.city(ip)
        return (r.country.iso_code, r.country.name, r.city.name)
    except Exception:
        return (None, None, None)
```

## Conclusion

For high-volume APIs, use a local MaxMind GeoLite2 MMDB database - lookups are fast and require no network call. External services (ipapi.co, ip-api.com) are convenient for low traffic but add latency and rate limits. Cache results aggressively with `lru_cache` or Redis since IP-to-geo mappings change rarely. Always extract the real client IP using proxy-aware logic before calling the geolocation function, and skip private/loopback addresses which won't have geolocation data.
