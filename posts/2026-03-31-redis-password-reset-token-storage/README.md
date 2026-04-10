# How to Implement Password Reset Token Storage with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, Authentication, Token

Description: Store secure password reset tokens in Redis with automatic expiry, single-use enforcement, and per-user token invalidation to prevent token reuse and account takeover.

---

Password reset tokens must be secure, short-lived, and single-use. Redis pairs well with cryptographic token generation (via Python's `secrets` module) by providing automatic TTL-based expiry and atomic deletion on use.

## Data Model

```text
reset:{token}           -> Hash: user_id, email, created_at, ip
user:reset:{userId}     -> String: current active reset token (for single-token enforcement)
```

## Generating a Reset Token

```python
import redis
import secrets
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

RESET_TTL = 3600        # 1 hour
RATE_LIMIT_TTL = 300    # 5 minutes between requests

def generate_reset_token(user_id, email, ip_address):
    # Rate limit reset requests per user
    rate_key = f"reset:rate:{user_id}"
    if r.exists(rate_key):
        ttl = r.ttl(rate_key)
        return {"error": f"Please wait {ttl}s before requesting another reset"}

    # Invalidate any existing reset token for this user
    old_token = r.get(f"user:reset:{user_id}")
    if old_token:
        r.delete(f"reset:{old_token}")

    token = secrets.token_urlsafe(32)  # 256-bit token

    pipe = r.pipeline()
    pipe.hset(f"reset:{token}", mapping={
        "user_id": user_id,
        "email": email,
        "created_at": str(time.time()),
        "ip": ip_address,
    })
    pipe.expire(f"reset:{token}", RESET_TTL)
    pipe.set(f"user:reset:{user_id}", token, ex=RESET_TTL)
    pipe.set(rate_key, "1", ex=RATE_LIMIT_TTL)
    pipe.execute()

    return {"token": token, "expires_in": RESET_TTL}
```

## Validating and Consuming the Token

```python
def validate_reset_token(token):
    data = r.hgetall(f"reset:{token}")
    if not data:
        return {"valid": False, "reason": "expired_or_invalid"}

    return {
        "valid": True,
        "user_id": data["user_id"],
        "email": data["email"],
    }

def consume_reset_token(token):
    """
    Call this after the password has been successfully changed.
    Deletes the token so it cannot be reused.
    """
    data = r.hgetall(f"reset:{token}")
    if not data:
        return False

    pipe = r.pipeline()
    pipe.delete(f"reset:{token}")
    pipe.delete(f"user:reset:{data['user_id']}")
    pipe.execute()
    return True
```

## Revoking All Tokens for a User

On suspicious activity (e.g., login from new device), revoke outstanding reset tokens:

```python
def revoke_all_reset_tokens(user_id):
    token = r.get(f"user:reset:{user_id}")
    if token:
        pipe = r.pipeline()
        pipe.delete(f"reset:{token}")
        pipe.delete(f"user:reset:{user_id}")
        pipe.execute()
```

## Atomic Token Validation and Consumption

Use a Lua script to validate and consume atomically, preventing race conditions:

```python
VALIDATE_AND_CONSUME = """
local data = redis.call('HGETALL', KEYS[1])
if #data == 0 then return nil end
redis.call('DEL', KEYS[1])
local user_id = nil
for i=1,#data,2 do
    if data[i] == 'user_id' then user_id = data[i+1] end
end
if user_id then redis.call('DEL', 'user:reset:' .. user_id) end
return data
"""

def atomic_validate_and_consume(token):
    result = r.eval(VALIDATE_AND_CONSUME, 1, f"reset:{token}")
    if not result:
        return None
    return dict(zip(result[::2], result[1::2]))
```

## Example Usage

```bash
# Generate token
SET user:reset:user:1 <token_value> EX 3600
HSET reset:<token> user_id user:1 email user@example.com created_at 1743360000
EXPIRE reset:<token> 3600

# Validate (check token exists)
HGETALL reset:<token>

# Consume after password change
DEL reset:<token>
DEL user:reset:user:1
```

## Summary

Redis TTL ensures reset tokens expire automatically without cleanup jobs. Storing the active token per user enforces single-token-per-user policy, automatically invalidating old tokens when a new one is requested. Atomic Lua scripts prevent race conditions where two concurrent requests might both validate the same token.
