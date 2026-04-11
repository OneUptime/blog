# How to Build a CAPTCHA Challenge Store with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, CAPTCHA, Authentication

Description: Use Redis to store server-side CAPTCHA challenges with automatic expiry - issue challenges, validate responses, prevent replay attacks, and track failure rates per IP.

---

Server-side CAPTCHAs generate a challenge on the server and validate the response without third-party dependencies. Redis stores pending challenges with short TTLs to ensure they expire automatically.

## Data Model

```text
captcha:{challengeId}        -> Hash: answer_hash, ip, created_at
captcha:fails:{ip}           -> String: failure count within time window
captcha:issued:{ip}          -> String: rate limit on challenge issuance
```

## Generating a Challenge

```python
import redis
import uuid
import random
import time
import hashlib

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

CHALLENGE_TTL = 300     # 5 minutes to solve
MAX_FAILURES = 10       # Failures before IP is blocked
ISSUE_RATE_TTL = 60     # Max 5 challenges per minute per IP
MAX_ISSUES_PER_WINDOW = 5

def generate_math_captcha(ip_address):
    # Enforce issuance rate limit
    rate_key = f"captcha:issued:{ip_address}"
    issued = r.incr(rate_key)
    if issued == 1:
        r.expire(rate_key, ISSUE_RATE_TTL)
    if issued > MAX_ISSUES_PER_WINDOW:
        return {"error": "Too many CAPTCHA requests"}

    a = random.randint(1, 20)
    b = random.randint(1, 20)
    question = f"What is {a} + {b}?"
    answer = str(a + b)
    challenge_id = str(uuid.uuid4())

    # Store challenge hash (do not store answer in plaintext if sensitive)
    answer_hash = hashlib.sha256(answer.encode()).hexdigest()
    r.hset(f"captcha:{challenge_id}", mapping={
        "answer_hash": answer_hash,
        "ip": ip_address,
        "created_at": str(time.time()),
    })
    r.expire(f"captcha:{challenge_id}", CHALLENGE_TTL)

    return {"challenge_id": challenge_id, "question": question}
```

## Validating a Response

```python
def validate_captcha(challenge_id, submitted_answer, ip_address):
    key = f"captcha:{challenge_id}"
    data = r.hgetall(key)

    if not data:
        return {"valid": False, "reason": "expired_or_invalid"}

    if data.get("ip") != ip_address:
        return {"valid": False, "reason": "ip_mismatch"}

    answer_hash = hashlib.sha256(submitted_answer.strip().encode()).hexdigest()

    if answer_hash == data["answer_hash"]:
        # Consume the challenge - cannot be reused
        r.delete(key)
        r.delete(f"captcha:fails:{ip_address}")
        return {"valid": True}
    else:
        # Track failures per IP
        fails = r.incr(f"captcha:fails:{ip_address}")
        r.expire(f"captcha:fails:{ip_address}", 600)
        if fails >= MAX_FAILURES:
            return {"valid": False, "reason": "ip_blocked", "failures": fails}
        return {"valid": False, "reason": "wrong_answer", "failures": fails}
```

## Checking If an IP Is Blocked

```python
def is_ip_blocked(ip_address):
    fails = r.get(f"captcha:fails:{ip_address}")
    return int(fails or 0) >= MAX_FAILURES

def reset_ip_failures(ip_address):
    r.delete(f"captcha:fails:{ip_address}")
```

## Issuing Session Tokens on CAPTCHA Pass

After a successful CAPTCHA, issue a short-lived bypass token so the user does not need to solve another CAPTCHA immediately:

```python
def issue_captcha_bypass(ip_address, ttl=3600):
    token = str(uuid.uuid4())
    r.set(f"captcha:bypass:{ip_address}", token, ex=ttl)
    return token

def has_valid_bypass(ip_address, token):
    stored = r.get(f"captcha:bypass:{ip_address}")
    return stored == token
```

## Example Usage

```bash
# Issue challenge
HSET captcha:abc123 answer_hash <sha256> ip 192.168.1.1 created_at 1743360000
EXPIRE captcha:abc123 300

# Validate and consume
DEL captcha:abc123

# Track failures
INCR captcha:fails:192.168.1.1
EXPIRE captcha:fails:192.168.1.1 600
```

## Summary

Redis TTL automatically invalidates unresolved CAPTCHA challenges, and deleting the key on validation prevents replay attacks. Failure counters with TTLs block abusive IPs while resetting automatically over time. Rate limiting challenge issuance prevents attackers from generating and discarding challenges in bulk.
