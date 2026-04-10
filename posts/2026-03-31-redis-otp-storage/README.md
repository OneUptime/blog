# How to Implement OTP (One-Time Password) Storage with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, OTP, Authentication

Description: Store and validate one-time passwords securely in Redis with automatic expiry, attempt limiting, and token rotation to prevent replay attacks and brute-force guessing.

---

One-time passwords are short-lived tokens used for two-factor authentication, login verification, and transaction confirmation. Redis is ideal for OTP storage because of its atomic operations and built-in TTL.

## Data Model

```text
otp:{purpose}:{identifier}      -> String: OTP value
otp:attempts:{purpose}:{identifier} -> String: failed attempt count
```

## Generating and Storing an OTP

```python
import redis
import secrets

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

OTP_TTL = 300        # 5 minutes
MAX_ATTEMPTS = 5
RESEND_COOLDOWN = 60  # 1 minute between resends

def generate_otp(identifier, purpose="login", length=6):
    # Enforce resend cooldown
    cooldown_key = f"otp:cooldown:{purpose}:{identifier}"
    if r.exists(cooldown_key):
        ttl = r.ttl(cooldown_key)
        return {"error": f"Please wait {ttl}s before requesting a new code"}

    otp = "".join([str(secrets.randbelow(10)) for _ in range(length)])
    otp_key = f"otp:{purpose}:{identifier}"
    attempts_key = f"otp:attempts:{purpose}:{identifier}"

    pipe = r.pipeline()
    pipe.set(otp_key, otp, ex=OTP_TTL)
    pipe.delete(attempts_key)  # Reset attempt counter
    pipe.set(cooldown_key, "1", ex=RESEND_COOLDOWN)
    pipe.execute()

    return {"otp": otp, "expires_in": OTP_TTL}
```

## Validating an OTP

```python
def validate_otp(identifier, submitted_otp, purpose="login"):
    otp_key = f"otp:{purpose}:{identifier}"
    attempts_key = f"otp:attempts:{purpose}:{identifier}"

    # Check if locked out
    attempts = int(r.get(attempts_key) or 0)
    if attempts >= MAX_ATTEMPTS:
        return {"valid": False, "reason": "too_many_attempts"}

    stored_otp = r.get(otp_key)
    if not stored_otp:
        return {"valid": False, "reason": "expired_or_not_found"}

    if secrets.compare_digest(stored_otp, submitted_otp):
        # Consume the OTP - delete it so it cannot be reused
        pipe = r.pipeline()
        pipe.delete(otp_key)
        pipe.delete(attempts_key)
        pipe.execute()
        return {"valid": True}
    else:
        r.incr(attempts_key)
        r.expire(attempts_key, OTP_TTL)
        remaining = MAX_ATTEMPTS - attempts - 1
        return {"valid": False, "reason": "invalid_code", "attempts_remaining": remaining}
```

## Getting OTP Status

```python
def get_otp_status(identifier, purpose="login"):
    otp_key = f"otp:{purpose}:{identifier}"
    attempts_key = f"otp:attempts:{purpose}:{identifier}"

    ttl = r.ttl(otp_key)
    attempts = int(r.get(attempts_key) or 0)

    return {
        "exists": ttl > 0,
        "expires_in": max(ttl, 0),
        "attempts_used": attempts,
        "attempts_remaining": max(MAX_ATTEMPTS - attempts, 0),
        "locked": attempts >= MAX_ATTEMPTS,
    }
```

## TOTP Replay Prevention

For TOTP codes that are valid for a 30-second window, prevent the same code from being used twice:

```python
def mark_totp_used(user_id, totp_code, window_seconds=60):
    key = f"totp:used:{user_id}:{totp_code}"
    used = not r.set(key, "1", nx=True, ex=window_seconds)
    return used  # Returns True if already used (replay attack)
```

## Example Usage

```bash
# Store OTP
SET otp:login:user@example.com 482917 EX 300

# Validate (match found)
GET otp:login:user@example.com   # 482917
DEL otp:login:user@example.com   # Consume after use

# Failed attempts
INCR otp:attempts:login:user@example.com
EXPIRE otp:attempts:login:user@example.com 300
```

## Summary

Redis TTL automatically expires OTPs after their valid window, eliminating the need for cleanup jobs. Atomic increment tracks failed attempts for rate limiting, and NX-flagged SET enforces resend cooldowns. Always consume the OTP on successful validation by deleting the key to prevent replay attacks.
