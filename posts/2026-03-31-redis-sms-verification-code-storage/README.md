# How to Implement SMS Verification Code Storage with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, SMS, Authentication

Description: Store SMS verification codes securely in Redis with TTL expiry, attempt tracking, and rate limiting to prevent SMS pumping fraud and brute-force attacks.

---

SMS verification codes are used for phone number confirmation and two-factor authentication. Redis provides atomic storage, automatic expiry, and rate limiting to prevent SMS fraud.

## Data Model

```text
sms:code:{phone}             -> String: verification code
sms:attempts:{phone}         -> String: failed validation attempts
sms:send_count:{phone}       -> String: SMS send count in current window
sms:verified:{phone}         -> String: verified status with TTL
```

## Sending a Verification Code

```python
import redis
import secrets

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

CODE_TTL = 600          # 10 minutes
MAX_SEND_PER_HOUR = 5   # Max codes per phone per hour
MAX_ATTEMPTS = 5        # Failed attempts before lockout
SEND_WINDOW = 3600      # 1 hour window

def generate_sms_code(phone_number, send_sms_fn):
    # Rate limit SMS sends per phone number
    send_key = f"sms:send_count:{phone_number}"
    count = r.incr(send_key)
    if count == 1:
        r.expire(send_key, SEND_WINDOW)
    if count > MAX_SEND_PER_HOUR:
        ttl = r.ttl(send_key)
        return {"error": f"Too many codes requested. Try again in {ttl}s"}

    code = "".join([str(secrets.randbelow(10)) for _ in range(6)])

    pipe = r.pipeline()
    pipe.set(f"sms:code:{phone_number}", code, ex=CODE_TTL)
    pipe.delete(f"sms:attempts:{phone_number}")  # Reset attempts on new code
    pipe.execute()

    send_sms_fn(phone_number, f"Your verification code is {code}. Valid for 10 minutes.")
    return {"sent": True, "expires_in": CODE_TTL}
```

## Validating the Code

```python
def validate_sms_code(phone_number, submitted_code):
    attempts_key = f"sms:attempts:{phone_number}"
    code_key = f"sms:code:{phone_number}"

    attempts = int(r.get(attempts_key) or 0)
    if attempts >= MAX_ATTEMPTS:
        return {"valid": False, "reason": "too_many_attempts"}

    stored_code = r.get(code_key)
    if not stored_code:
        return {"valid": False, "reason": "expired_or_not_found"}

    if secrets.compare_digest(stored_code, submitted_code.strip()):
        pipe = r.pipeline()
        pipe.delete(code_key)
        pipe.delete(attempts_key)
        # Mark phone as verified for session duration
        pipe.set(f"sms:verified:{phone_number}", "1", ex=86400)
        pipe.execute()
        return {"valid": True}
    else:
        r.incr(attempts_key)
        r.expire(attempts_key, CODE_TTL)
        remaining = MAX_ATTEMPTS - attempts - 1
        return {
            "valid": False,
            "reason": "invalid_code",
            "attempts_remaining": remaining,
        }
```

## Checking Phone Verification Status

```python
def is_phone_verified(phone_number):
    return bool(r.get(f"sms:verified:{phone_number}"))

def get_code_ttl(phone_number):
    return r.ttl(f"sms:code:{phone_number}")
```

## Anti-Fraud: Blocking High-Risk Patterns

Detect SMS pumping by monitoring send rate across many numbers from the same source:

```python
def track_send_source(source_ip, phone_number):
    # Track unique phone numbers per source IP per hour
    key = f"sms:ip_phones:{source_ip}"
    r.sadd(key, phone_number)
    r.expire(key, 3600)
    unique_phones = r.scard(key)
    if unique_phones > 20:
        # Flag potential SMS pumping
        r.set(f"sms:ip_blocked:{source_ip}", "1", ex=86400)
        return False
    return True

def is_ip_blocked(source_ip):
    return bool(r.get(f"sms:ip_blocked:{source_ip}"))
```

## Example Usage

```bash
# Store code
SET sms:code:+15551234567 482917 EX 600

# Validate
GET sms:code:+15551234567    # 482917

# Consume on match
DEL sms:code:+15551234567

# Mark verified
SET sms:verified:+15551234567 1 EX 86400
```

## Summary

Redis TTL automatically expires SMS codes, and attempt counters lock out brute-force guessing after 5 failures. Rate limiting per phone number guards against SMS pumping fraud where attackers generate codes to premium numbers at your expense. Always use constant-time comparison when validating codes to prevent timing attacks.
