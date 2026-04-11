# How to Build an Email Verification System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, Authentication, Email

Description: Build a secure email verification system with Redis - generate verification tokens, enforce expiry, track verification status, and prevent duplicate registrations.

---

Email verification confirms that a user owns the address they registered with. Redis handles token storage with automatic TTL expiry and tracks verification status without adding load to your primary database.

## Data Model

```text
verify:email:{token}         -> Hash: user_id, email, created_at
verify:user_token:{userId}   -> String: token (current token for user)
verify:status:{userId}       -> String: verified/pending
verify:pending:{email}       -> String: user_id (prevent duplicate registrations)
verify:resend:{userId}       -> String: cooldown key
```

## Generating a Verification Token

```python
import redis
import secrets
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

VERIFY_TTL = 86400      # 24 hours
RESEND_COOLDOWN = 300   # 5 minutes between resends

def create_verification_token(user_id, email):
    # Enforce resend cooldown
    resend_key = f"verify:resend:{user_id}"
    if r.exists(resend_key):
        ttl = r.ttl(resend_key)
        return {"error": f"Please wait {ttl}s before requesting a new verification email"}

    # Prevent duplicate pending verifications for the same email
    existing = r.get(f"verify:pending:{email}")
    if existing and existing != user_id:
        return {"error": "Email already registered to another account"}

    # Invalidate any previous token for this user
    old_token = r.get(f"verify:user_token:{user_id}")
    if old_token:
        r.delete(f"verify:email:{old_token}")

    token = secrets.token_urlsafe(32)

    pipe = r.pipeline()
    pipe.hset(f"verify:email:{token}", mapping={
        "user_id": user_id,
        "email": email,
        "created_at": str(time.time()),
    })
    pipe.expire(f"verify:email:{token}", VERIFY_TTL)
    pipe.set(f"verify:user_token:{user_id}", token, ex=VERIFY_TTL)
    pipe.set(f"verify:pending:{email}", user_id, ex=VERIFY_TTL)
    pipe.set(f"verify:status:{user_id}", "pending")
    pipe.set(resend_key, "1", ex=RESEND_COOLDOWN)
    pipe.execute()

    return {"token": token, "expires_in": VERIFY_TTL}
```

## Verifying the Token

```python
def verify_email_token(token):
    data = r.hgetall(f"verify:email:{token}")
    if not data:
        return {"success": False, "reason": "expired_or_invalid"}

    user_id = data["user_id"]
    email = data["email"]

    pipe = r.pipeline()
    pipe.set(f"verify:status:{user_id}", "verified")
    pipe.delete(f"verify:email:{token}")
    pipe.delete(f"verify:user_token:{user_id}")
    pipe.delete(f"verify:pending:{email}")
    pipe.execute()

    return {"success": True, "user_id": user_id, "email": email}
```

## Checking Verification Status

```python
def is_email_verified(user_id):
    status = r.get(f"verify:status:{user_id}")
    return status == "verified"

def get_verification_status(user_id):
    status = r.get(f"verify:status:{user_id}")
    if status == "verified":
        return {"status": "verified"}
    token = r.get(f"verify:user_token:{user_id}")
    ttl = r.ttl(f"verify:email:{token}") if token else 0
    return {
        "status": status or "unverified",
        "token_expires_in": max(ttl, 0),
    }
```

## Resending Verification Email

```python
def resend_verification(user_id, email, send_email_fn):
    result = create_verification_token(user_id, email)
    if "error" in result:
        return result
    send_email_fn(email, result["token"])
    return {"sent": True}
```

## Example Usage

```bash
# Create token
HSET verify:email:<token> user_id user:1 email alice@example.com created_at 1743360000
EXPIRE verify:email:<token> 86400
SET verify:status:user:1 pending

# After user clicks link
DEL verify:email:<token>
SET verify:status:user:1 verified

# Check status
GET verify:status:user:1   # verified
```

## Summary

Redis manages email verification tokens with automatic TTL-based expiry, eliminating scheduled cleanup jobs. Cooldown keys prevent email spam and pending-email keys block duplicate registrations. Verification status is stored in Redis for fast middleware checks before redirecting unverified users, and can be synced to the primary database on verification.
