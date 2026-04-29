# How to Log Client IPv4 Addresses in REST API Middleware

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: REST API, IPv4, Logging, Python, Node.js, Middleware

Description: Learn how to log client IPv4 addresses in REST API middleware for Flask, FastAPI, and Express, including structured logging, request IDs, and proxy-aware IP extraction.

## Flask: Request Logging Middleware

```python
import logging
import time
import uuid
from flask import Flask, request, g
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s"
)
log = logging.getLogger(__name__)

@app.before_request
def before():
    g.start   = time.monotonic()
    g.req_id  = request.headers.get("X-Request-Id", str(uuid.uuid4())[:8])

@app.after_request
def after(response):
    elapsed = (time.monotonic() - g.start) * 1000
    log.info(
        "ip=%s method=%s path=%s status=%d ms=%.1f req_id=%s",
        request.remote_addr,   # client IP after ProxyFix when one proxy is trusted
        request.method,
        request.path,
        response.status_code,
        elapsed,
        g.req_id,
    )
    return response
```

## FastAPI: Middleware for Structured Logging

```python
import time
import uuid
import logging
from fastapi import FastAPI, Request

app = FastAPI()
log = logging.getLogger("api")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    req_id = str(uuid.uuid4())[:8]
    client = request.client  # with trusted proxy headers configured in Uvicorn/FastAPI
    ip     = client.host if client else "unknown"

    start    = time.monotonic()
    response = await call_next(request)
    elapsed  = (time.monotonic() - start) * 1000

    log.info(
        "ip=%s method=%s path=%s status=%d ms=%.1f req_id=%s",
        ip, request.method, request.url.path,
        response.status_code, elapsed, req_id
    )
    response.headers["X-Request-Id"] = req_id
    return response
```

## Express: Morgan-Style Custom Logger

```javascript
const express = require("express");
const app = express();
app.set("trust proxy", 1); // trust one reverse-proxy hop

// Minimal structured logger middleware
app.use((req, res, next) => {
    const start = Date.now();
    const reqId = req.headers["x-request-id"] || Math.random().toString(36).slice(2, 10);

    res.setHeader("X-Request-Id", reqId);

    res.on("finish", () => {
        const ms = Date.now() - start;
        process.stdout.write(JSON.stringify({
            time:    new Date().toISOString(),
            ip:      req.ip,
            method:  req.method,
            path:    req.path,
            status:  res.statusCode,
            ms,
            req_id:  reqId,
        }) + "\n");
    });

    next();
});

app.get("/api/test", (req, res) => res.json({ ok: true }));
app.listen(3000);
```

## Structured Log Output

```json
{
  "time": "2026-03-20T10:00:00.000Z",
  "ip": "192.168.1.50",
  "method": "GET",
  "path": "/api/test",
  "status": 200,
  "ms": 12,
  "req_id": "a3f9b1c2"
}
```

## Masking IPv4 Addresses for Privacy

Masking the last octet can reduce identifiability in logs, but by itself it is not guaranteed to fully anonymize the data for GDPR purposes.

```python
import ipaddress

def anonymize_ipv4(ip: str) -> str:
    """Zero out the last octet: 192.168.1.50 → 192.168.1.0"""
    try:
        addr = ipaddress.IPv4Address(ip)
        octets = str(addr).split(".")
        octets[-1] = "0"
        return ".".join(octets)
    except ValueError:
        return "invalid"

print(anonymize_ipv4("192.168.1.50"))  # 192.168.1.0
print(anonymize_ipv4("10.20.30.40"))   # 10.20.30.0
```

## Conclusion

Log client IPs in middleware rather than in individual route handlers to ensure uniform coverage. Use structured (JSON) logging to make logs queryable with tools like Elasticsearch or CloudWatch. Include a request ID to correlate logs across microservices. When privacy requirements apply, masking the last octet can reduce identifiability before logging, but whether that is sufficient for GDPR purposes depends on your context. Always extract the client IP using correctly configured, proxy-aware logic (ProxyFix, trusted proxy headers in Uvicorn/FastAPI, `trust proxy`) before logging - logging the proxy's address is unhelpful for security investigation.
