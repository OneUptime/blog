# How to Handle JWT Authentication Securely in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, JWT, Authentication, Security, FastAPI, Token Rotation, OAuth2

Description: Learn how to implement secure JWT authentication in Python with refresh token rotation, token revocation, and security best practices. This guide covers common pitfalls and production-ready patterns.

---

> JWT authentication seems simple until you get it wrong. Tokens that never expire, secrets in code, no revocation mechanism - these mistakes turn your authentication into a security vulnerability. This guide shows you how to implement JWT authentication correctly.

JWTs are powerful but require careful implementation. This guide covers the security aspects that are often overlooked.

---

## JWT Security Fundamentals

### What's in a JWT?

```
Header.Payload.Signature

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiJ1c2VyMTIzIiwiZXhwIjoxNjQwMDAwMDAwfQ.
signature_here
```

- **Header**: Algorithm and token type
- **Payload**: Claims (user data, expiration)
- **Signature**: Verification hash

### Security Principles

1. **Short-lived access tokens** (15-30 minutes)
2. **Longer-lived refresh tokens** (days/weeks)
3. **Rotate refresh tokens** on each use
4. **Store secrets securely** (environment variables)
5. **Implement revocation** for logout and security events

---

## Basic JWT Implementation

### Setup

```bash
pip install python-jose[cryptography] passlib[bcrypt]
```

### Token Generation

```python
# jwt_handler.py
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import jwt, JWTError
import os
import secrets

# Configuration
SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY environment variable is required")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a short-lived access token"""
    to_encode = data.copy()

    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access",
        "jti": secrets.token_urlsafe(16)  # Unique token ID
    })

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a longer-lived refresh token"""
    to_encode = data.copy()

    expire = datetime.utcnow() + (
        expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh",
        "jti": secrets.token_urlsafe(16)
    })

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}")
```

---

## Refresh Token Rotation

Rotating refresh tokens on each use prevents token theft:

```python
# token_rotation.py
from datetime import datetime, timedelta
import secrets
from typing import Optional, Tuple
import asyncpg

class TokenManager:
    """Manages JWT tokens with rotation and revocation"""

    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool

    async def create_token_pair(
        self,
        user_id: str,
        device_info: str = None
    ) -> Tuple[str, str]:
        """Create access and refresh token pair"""

        # Create tokens
        access_token = create_access_token({"sub": user_id})
        refresh_token = create_refresh_token({"sub": user_id})

        # Store refresh token family
        family_id = secrets.token_urlsafe(16)
        jti = decode_token(refresh_token)["jti"]

        await self.db.execute("""
            INSERT INTO refresh_tokens (jti, family_id, user_id, device_info, expires_at)
            VALUES ($1, $2, $3, $4, $5)
        """, jti, family_id, user_id, device_info,
            datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))

        return access_token, refresh_token

    async def rotate_refresh_token(
        self,
        old_refresh_token: str
    ) -> Tuple[str, str]:
        """Rotate refresh token and return new pair"""

        try:
            payload = decode_token(old_refresh_token)
        except ValueError:
            raise ValueError("Invalid refresh token")

        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")

        old_jti = payload["jti"]
        user_id = payload["sub"]

        # Check if token exists and is not revoked
        token_record = await self.db.fetchrow("""
            SELECT family_id, revoked, device_info
            FROM refresh_tokens
            WHERE jti = $1 AND user_id = $2
        """, old_jti, user_id)

        if not token_record:
            raise ValueError("Refresh token not found")

        if token_record["revoked"]:
            # Token reuse detected! Revoke entire family
            await self._revoke_token_family(token_record["family_id"])
            raise ValueError("Token reuse detected - all sessions revoked")

        # Revoke old token
        await self.db.execute("""
            UPDATE refresh_tokens SET revoked = true WHERE jti = $1
        """, old_jti)

        # Create new token pair
        new_access = create_access_token({"sub": user_id})
        new_refresh = create_refresh_token({"sub": user_id})

        # Store new refresh token in same family
        new_jti = decode_token(new_refresh)["jti"]
        await self.db.execute("""
            INSERT INTO refresh_tokens (jti, family_id, user_id, device_info, expires_at)
            VALUES ($1, $2, $3, $4, $5)
        """, new_jti, token_record["family_id"], user_id,
            token_record["device_info"],
            datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))

        return new_access, new_refresh

    async def _revoke_token_family(self, family_id: str):
        """Revoke all tokens in a family (security response)"""
        await self.db.execute("""
            UPDATE refresh_tokens SET revoked = true WHERE family_id = $1
        """, family_id)

    async def revoke_all_user_tokens(self, user_id: str):
        """Revoke all tokens for a user (logout everywhere)"""
        await self.db.execute("""
            UPDATE refresh_tokens SET revoked = true WHERE user_id = $1
        """, user_id)

    async def revoke_token(self, jti: str):
        """Revoke a specific token"""
        await self.db.execute("""
            UPDATE refresh_tokens SET revoked = true WHERE jti = $1
        """, jti)
```

### Database Schema

```sql
CREATE TABLE refresh_tokens (
    jti VARCHAR(255) PRIMARY KEY,
    family_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    device_info VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,

    INDEX idx_user_id (user_id),
    INDEX idx_family_id (family_id),
    INDEX idx_expires_at (expires_at)
);

-- Cleanup job
DELETE FROM refresh_tokens WHERE expires_at < NOW() - INTERVAL '30 days';
```

---

## FastAPI Integration

```python
# auth_routes.py
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

# Initialize token manager
token_manager: TokenManager = None

@app.on_event("startup")
async def startup():
    global token_manager
    pool = await asyncpg.create_pool(os.environ["DATABASE_URL"])
    token_manager = TokenManager(pool)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Validate access token and return user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token)

        if payload.get("type") != "access":
            raise credentials_exception

        user_id = payload.get("sub")
        if not user_id:
            raise credentials_exception

        # Optionally check if token is blacklisted
        # if await is_token_blacklisted(payload["jti"]):
        #     raise credentials_exception

    except ValueError:
        raise credentials_exception

    user = await get_user_by_id(user_id)
    if not user:
        raise credentials_exception

    return user

@app.post("/auth/token", response_model=TokenResponse)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """Login and get token pair"""
    # Authenticate user
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get device info for tracking
    device_info = request.headers.get("User-Agent", "Unknown")

    # Create token pair
    access_token, refresh_token = await token_manager.create_token_pair(
        user_id=user.id,
        device_info=device_info
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )

@app.post("/auth/refresh", response_model=TokenResponse)
async def refresh_tokens(request: RefreshRequest):
    """Refresh access token using refresh token"""
    try:
        access_token, refresh_token = await token_manager.rotate_refresh_token(
            request.refresh_token
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

@app.post("/auth/logout")
async def logout(
    token: str = Depends(oauth2_scheme),
    current_user = Depends(get_current_user)
):
    """Logout current session"""
    payload = decode_token(token)
    await token_manager.revoke_token(payload["jti"])
    return {"message": "Logged out successfully"}

@app.post("/auth/logout-all")
async def logout_all_sessions(current_user = Depends(get_current_user)):
    """Logout all sessions for current user"""
    await token_manager.revoke_all_user_tokens(current_user.id)
    return {"message": "All sessions logged out"}
```

---

## Access Token Blacklisting

For immediate access token revocation:

```python
# token_blacklist.py
from datetime import datetime, timedelta
from typing import Set
import asyncio

class TokenBlacklist:
    """In-memory blacklist for revoked access tokens"""

    def __init__(self, cleanup_interval: int = 300):
        self._blacklist: dict = {}  # jti -> expiry
        self._cleanup_interval = cleanup_interval
        self._cleanup_task = None

    async def start(self):
        """Start cleanup task"""
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def stop(self):
        """Stop cleanup task"""
        if self._cleanup_task:
            self._cleanup_task.cancel()

    async def _cleanup_loop(self):
        """Periodically remove expired tokens"""
        while True:
            await asyncio.sleep(self._cleanup_interval)
            now = datetime.utcnow()
            self._blacklist = {
                jti: exp for jti, exp in self._blacklist.items()
                if exp > now
            }

    def add(self, jti: str, expiry: datetime):
        """Add token to blacklist"""
        self._blacklist[jti] = expiry

    def is_blacklisted(self, jti: str) -> bool:
        """Check if token is blacklisted"""
        expiry = self._blacklist.get(jti)
        if not expiry:
            return False
        if expiry < datetime.utcnow():
            del self._blacklist[jti]
            return False
        return True

# Global blacklist
blacklist = TokenBlacklist()

async def revoke_access_token(token: str):
    """Revoke an access token immediately"""
    payload = decode_token(token)
    exp = datetime.fromtimestamp(payload["exp"])
    blacklist.add(payload["jti"], exp)

async def get_current_user_strict(token: str = Depends(oauth2_scheme)):
    """Get current user with blacklist check"""
    try:
        payload = decode_token(token)

        if blacklist.is_blacklisted(payload["jti"]):
            raise HTTPException(status_code=401, detail="Token revoked")

        # ... rest of validation
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

---

## Secure Cookie Storage

For browser applications, store tokens in HTTP-only cookies:

```python
# cookie_auth.py
from fastapi import FastAPI, Response, Request, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()

COOKIE_SETTINGS = {
    "httponly": True,
    "secure": True,  # HTTPS only
    "samesite": "lax",
    "path": "/",
}

@app.post("/auth/login")
async def login_cookie(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """Login and set tokens in cookies"""
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401)

    access_token, refresh_token = await token_manager.create_token_pair(user.id)

    # Set access token cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **COOKIE_SETTINGS
    )

    # Set refresh token cookie with longer expiry
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/auth/refresh",  # Only sent to refresh endpoint
        **COOKIE_SETTINGS
    )

    return {"message": "Logged in"}

async def get_current_user_cookie(request: Request):
    """Get user from cookie token"""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = decode_token(token)
        user = await get_user_by_id(payload["sub"])
        return user
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/auth/logout")
async def logout_cookie(response: Response):
    """Logout by clearing cookies"""
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/auth/refresh")
    return {"message": "Logged out"}
```

---

## Security Best Practices

### 1. Use Strong Secrets

```python
# Generate a secure secret
import secrets
secret = secrets.token_urlsafe(32)
print(f"JWT_SECRET_KEY={secret}")
```

### 2. Validate All Claims

```python
def validate_token_claims(payload: dict):
    """Validate all token claims"""
    now = datetime.utcnow()

    # Check expiration
    exp = datetime.fromtimestamp(payload["exp"])
    if now > exp:
        raise ValueError("Token expired")

    # Check issued at (not from future)
    iat = datetime.fromtimestamp(payload["iat"])
    if iat > now + timedelta(minutes=5):  # Allow 5 min clock skew
        raise ValueError("Token issued in future")

    # Check token type
    if payload.get("type") not in ["access", "refresh"]:
        raise ValueError("Invalid token type")

    # Check required claims
    if not payload.get("sub"):
        raise ValueError("Missing subject claim")
```

### 3. Use RS256 for Distributed Systems

```python
# For microservices, use asymmetric keys
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

# Generate keys (do once)
private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048
)
public_key = private_key.public_key()

# Sign with private key (auth service)
token = jwt.encode(payload, private_key, algorithm="RS256")

# Verify with public key (any service)
payload = jwt.decode(token, public_key, algorithms=["RS256"])
```

### 4. Include Security Headers

```python
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)

    # Prevent token leakage via referrer
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Prevent caching of authenticated pages
    if "Authorization" in request.headers:
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"

    return response
```

### 5. Rate Limit Auth Endpoints

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/auth/token")
@limiter.limit("5/minute")  # 5 attempts per minute
async def login(request: Request, ...):
    pass

@app.post("/auth/refresh")
@limiter.limit("10/minute")  # 10 refreshes per minute
async def refresh(request: Request, ...):
    pass
```

---

## Common Mistakes to Avoid

### 1. Long-Lived Access Tokens

```python
# BAD: Access tokens that last days
expires = timedelta(days=30)

# GOOD: Short-lived access tokens
expires = timedelta(minutes=15)
```

### 2. No Token Rotation

```python
# BAD: Same refresh token used forever
return old_refresh_token

# GOOD: Rotate on each use
new_refresh = create_refresh_token(...)
revoke(old_refresh_token)
return new_refresh
```

### 3. Storing Secrets in Code

```python
# BAD: Hardcoded secret
SECRET_KEY = "mysecretkey123"

# GOOD: Environment variable
SECRET_KEY = os.environ["JWT_SECRET_KEY"]
```

### 4. No Revocation Mechanism

```python
# BAD: No way to invalidate tokens
def logout():
    pass  # Token still valid!

# GOOD: Proper revocation
async def logout():
    await blacklist.add(token_jti)
    await revoke_refresh_token(refresh_jti)
```

---

## Conclusion

Secure JWT implementation requires:

- **Short-lived access tokens** (15-30 minutes)
- **Refresh token rotation** on every use
- **Proper revocation** for logout and security events
- **Secure storage** (HTTP-only cookies for browsers)
- **Rate limiting** on auth endpoints

With these patterns, your JWT authentication will be secure and production-ready.

---

*Need to monitor authentication events? [OneUptime](https://oneuptime.com) provides security logging and alerting for authentication failures, suspicious activity, and token issues.*

**Related Reading:**
- [How to Secure FastAPI Applications Against OWASP Top 10](https://oneuptime.com/blog/post/2025-01-06-fastapi-owasp-security/view)
