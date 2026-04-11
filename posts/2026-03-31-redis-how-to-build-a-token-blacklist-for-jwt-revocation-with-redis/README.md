# How to Build a Token Blacklist for JWT Revocation with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, JWT, Token Blacklist, Authentication, Security

Description: Learn how to implement JWT token revocation using a Redis blacklist that automatically expires entries when the token's TTL expires.

---

## The JWT Revocation Problem

JWTs are stateless - once issued, they are valid until expiry. If a user logs out, changes their password, or is banned, their existing token keeps working. A Redis blacklist solves this by storing revoked token IDs (JTI claims) with TTL matching the token's remaining validity.

## Token Blacklist Strategy

Rather than storing full tokens (which are large), store only the `jti` (JWT ID) claim. This is a compact UUID that uniquely identifies each token. Set the Redis key TTL to match the token's remaining lifetime so the blacklist entry automatically cleans up when the token would have expired anyway.

## Implementation

```python
import redis
import jwt
import time
import uuid
from datetime import datetime, timedelta

r = redis.Redis(decode_responses=True)

SECRET_KEY = "your-secret-key"
TOKEN_TTL = 3600  # 1 hour

def create_token(user_id: int, username: str) -> str:
    now = datetime.utcnow()
    payload = {
        "sub": str(user_id),
        "username": username,
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + timedelta(seconds=TOKEN_TTL)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def revoke_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        jti = payload["jti"]
        exp = payload["exp"]
        remaining_ttl = max(0, int(exp - time.time()))
        if remaining_ttl > 0:
            r.set(f"blacklist:jti:{jti}", "revoked", ex=remaining_ttl)
    except jwt.ExpiredSignatureError:
        pass  # Already expired, no need to blacklist

def is_token_revoked(jti: str) -> bool:
    return r.exists(f"blacklist:jti:{jti}") > 0

def verify_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        if is_token_revoked(payload["jti"]):
            return None
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None
```

## Revoking All Tokens for a User

When a user changes their password, all existing tokens should be invalidated. Store a per-user "issued before" timestamp:

```python
def revoke_all_user_tokens(user_id: int):
    r.set(f"blacklist:user:{user_id}:revoke_before", int(time.time()), ex=TOKEN_TTL)

def verify_token_with_user_check(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        jti = payload["jti"]
        user_id = payload["sub"]
        issued_at = payload["iat"]

        # Check individual token blacklist
        if is_token_revoked(jti):
            return None

        # Check user-level revocation
        revoke_before = r.get(f"blacklist:user:{user_id}:revoke_before")
        if revoke_before and issued_at < int(revoke_before):
            return None

        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None
```

## FastAPI Integration

```python
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

app = FastAPI()
bearer = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    token = credentials.credentials
    payload = verify_token_with_user_check(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or revoked token")
    return payload

@app.post("/auth/login")
def login(username: str, password: str):
    # Validate credentials (simplified)
    user_id = authenticate_user(username, password)
    if not user_id:
        raise HTTPException(status_code=401)
    token = create_token(user_id, username)
    return {"access_token": token, "token_type": "bearer"}

@app.post("/auth/logout")
def logout(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    revoke_token(credentials.credentials)
    return {"message": "Logged out successfully"}

@app.post("/auth/revoke-all")
def revoke_all(current_user: dict = Depends(get_current_user)):
    revoke_all_user_tokens(int(current_user["sub"]))
    return {"message": "All sessions revoked"}

@app.get("/protected")
def protected_endpoint(current_user: dict = Depends(get_current_user)):
    return {"user": current_user["username"]}
```

## Using Bloom Filters for Large-Scale Blacklists

For very high token volumes, a Bloom filter can serve as a fast negative check to reduce key lookups. Since Bloom filters have no false negatives, a "not found" result is definitive. On a Bloom positive, confirm against an exact key to eliminate false positives:

```python
def revoke_token_bloom(jti: str, ttl: int):
    # Add to Bloom filter (no TTL support - periodically rebuild)
    r.bf().add("bloom:blacklisted_jtis", jti)
    # Also add to exact set with TTL for authoritative check on Bloom hit
    r.set(f"blacklist:jti:{jti}", "1", ex=ttl)

def is_token_revoked_bloom(jti: str) -> bool:
    if not r.bf().exists("bloom:blacklisted_jtis", jti):
        return False  # Definite negative - not revoked
    return r.exists(f"blacklist:jti:{jti}") > 0  # Confirm Bloom positive
```

## Summary

Redis token blacklists store revoked JWT IDs (JTI claims) with TTL matching the token's remaining validity, ensuring automatic cleanup without manual maintenance. Per-user "revoke before" timestamps enable instant revocation of all user sessions on password change. Using a Bloom filter as a first-pass filter reduces Redis memory for very high-volume token revocation.
