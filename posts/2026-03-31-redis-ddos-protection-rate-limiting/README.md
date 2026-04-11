# How to Implement DDoS Protection with Redis Rate Limiting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, Rate Limiting

Description: Use Redis rate limiting with automatic IP blocklisting and request pattern detection to defend against DDoS attacks at the application layer.

---

Application-layer DDoS attacks overwhelm your backend with high request volumes from many source IPs. While network-layer DDoS mitigation belongs with CDN and firewall solutions, Redis-backed rate limiting provides a fast, low-overhead defense at the application edge that can absorb large attack volumes.

## Multi-Layer Rate Limiting Strategy

Combine per-IP limits, global request rate tracking, and automatic blocklisting:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Thresholds
PER_IP_LIMIT_PER_SECOND = 50
GLOBAL_LIMIT_PER_SECOND = 5000
BLOCK_THRESHOLD_VIOLATIONS = 3
BLOCK_DURATION = 3600  # 1 hour

def is_ip_blocked(ip: str) -> bool:
    return r.exists(f"blocked:{ip}") > 0

def block_ip(ip: str, duration: int = BLOCK_DURATION):
    r.setex(f"blocked:{ip}", duration, "ddos")
    log_blocked_ip(ip)

def check_per_ip_limit(ip: str) -> bool:
    window = int(time.time())  # 1-second window
    key = f"ddos:ip:{ip}:{window}"
    count = r.incr(key)
    r.expire(key, 5)
    return count <= PER_IP_LIMIT_PER_SECOND
```

## Automatic Blocklisting on Repeat Violations

Track violation counts and auto-block persistent offenders:

```python
def handle_ip_violation(ip: str):
    violation_key = f"violations:{ip}"
    violations = r.incr(violation_key)
    r.expire(violation_key, 3600)

    if violations >= BLOCK_THRESHOLD_VIOLATIONS:
        block_ip(ip)
        return True
    return False

def check_request(ip: str) -> dict:
    # Check blocklist first (cheapest check)
    if is_ip_blocked(ip):
        return {"allowed": False, "reason": "blocked"}

    # Check per-IP rate
    if not check_per_ip_limit(ip):
        blocked = handle_ip_violation(ip)
        return {"allowed": False, "reason": "rate_limit_exceeded", "blocked": blocked}

    return {"allowed": True}
```

## Global Rate Limit Guard

Protect the entire application from aggregate overload:

```python
def check_global_rate() -> bool:
    window = int(time.time())
    key = f"ddos:global:{window}"
    count = r.incr(key)
    r.expire(key, 5)
    return count <= GLOBAL_LIMIT_PER_SECOND
```

## Request Pattern Detection

Detect obvious bot patterns (identical User-Agent or unusually high rate from ASN):

```python
def check_user_agent_pattern(ip: str, user_agent: str) -> bool:
    ua_key = f"ua:{user_agent[:64]}"
    count = r.incr(ua_key)
    r.expire(ua_key, 10)

    # Block if >1000 requests in 10s from same UA
    if count > 1000:
        block_ip(ip, duration=600)
        return False
    return True
```

## Middleware Integration

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.before_request
def ddos_protection():
    ip = request.headers.get('X-Forwarded-For', request.remote_addr).split(',')[0].strip()

    if not check_global_rate():
        return jsonify({"error": "Service temporarily unavailable"}), 503

    result = check_request(ip)
    if not result["allowed"]:
        return jsonify({"error": "Forbidden"}), 403
```

## Monitoring the Attack

```bash
# Current blocked IPs
redis-cli --scan --pattern "blocked:*" | wc -l

# Top offending IPs by violation count
redis-cli --scan --pattern "violations:*" | \
  xargs -I{} sh -c 'echo "$(redis-cli GET {}) {}"' | sort -rn | head -10

# Global request rate right now
redis-cli GET "ddos:global:$(date +%s)"
```

## Summary

Redis-based DDoS protection at the application layer combines per-IP rate limiting, global rate guards, and automatic blocklisting to absorb attack traffic with sub-millisecond overhead per request. While not a replacement for network-layer mitigation, it provides an effective and easily tunable defense for application-layer attacks. Pairing Redis with your CDN's IP blocking API enables automated escalation from application-layer blocking to network-layer blocking.
