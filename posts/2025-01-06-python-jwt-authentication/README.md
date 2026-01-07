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

This module provides the core JWT functionality: creating access tokens (short-lived for API authentication) and refresh tokens (longer-lived for obtaining new access tokens). Each token includes a unique identifier (jti) for tracking and revocation.

```python
# jwt_handler.py
# Core JWT token creation and validation utilities
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import jwt, JWTError
import os
import secrets

# Configuration - load secret from environment (never hardcode!)
SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY environment variable is required")

# Use HS256 for single-service apps, RS256 for microservices
ALGORITHM = "HS256"
# Short expiry limits damage from stolen tokens
ACCESS_TOKEN_EXPIRE_MINUTES = 15
# Refresh tokens live longer but are rotated on use
REFRESH_TOKEN_EXPIRE_DAYS = 7

def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a short-lived access token for API authentication"""
    to_encode = data.copy()  # Don't modify original data

    # Calculate expiration time
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    # Add standard JWT claims
    to_encode.update({
        "exp": expire,                        # Expiration time
        "iat": datetime.utcnow(),            # Issued at time
        "type": "access",                     # Token type for validation
        "jti": secrets.token_urlsafe(16)     # Unique ID for revocation
    })

    # Sign and return the JWT
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a longer-lived refresh token for obtaining new access tokens"""
    to_encode = data.copy()

    # Refresh tokens have longer expiry
    expire = datetime.utcnow() + (
        expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh",                    # Distinguishes from access tokens
        "jti": secrets.token_urlsafe(16)     # Unique ID for rotation tracking
    })

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT token, raising ValueError on failure"""
    try:
        # This also verifies signature and expiration
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}")
```

---

## Refresh Token Rotation

Rotating refresh tokens on each use is a critical security measure. When a refresh token is used, it is immediately invalidated and a new one is issued. If an attacker steals a refresh token, they can only use it once before detection. The "token family" concept groups related tokens so that reuse of an old token invalidates all tokens in that session.

```python
# token_rotation.py
# Secure refresh token management with rotation and reuse detection
from datetime import datetime, timedelta
import secrets
from typing import Optional, Tuple
import asyncpg

class TokenManager:
    """Manages JWT tokens with rotation and revocation capabilities"""

    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool  # PostgreSQL connection pool

    async def create_token_pair(
        self,
        user_id: str,
        device_info: str = None
    ) -> Tuple[str, str]:
        """Create a new access/refresh token pair for initial login"""

        # Generate both tokens
        access_token = create_access_token({"sub": user_id})
        refresh_token = create_refresh_token({"sub": user_id})

        # Create a "family" to track related refresh tokens
        # All rotations of this login session share the same family_id
        family_id = secrets.token_urlsafe(16)
        jti = decode_token(refresh_token)["jti"]

        # Store refresh token metadata in database for revocation checks
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
        """Exchange a refresh token for a new token pair (with rotation)"""

        # Decode and validate the token
        try:
            payload = decode_token(old_refresh_token)
        except ValueError:
            raise ValueError("Invalid refresh token")

        # Ensure this is actually a refresh token, not an access token
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")

        old_jti = payload["jti"]
        user_id = payload["sub"]

        # Look up the token in our database
        token_record = await self.db.fetchrow("""
            SELECT family_id, revoked, device_info
            FROM refresh_tokens
            WHERE jti = $1 AND user_id = $2
        """, old_jti, user_id)

        if not token_record:
            raise ValueError("Refresh token not found")

        # SECURITY: Detect token reuse (indicates possible theft)
        if token_record["revoked"]:
            # Someone is trying to use an already-rotated token!
            # This could be the attacker or the legitimate user
            # Either way, revoke ALL tokens in this family for safety
            await self._revoke_token_family(token_record["family_id"])
            raise ValueError("Token reuse detected - all sessions revoked")

        # Mark the old token as used (revoked)
        await self.db.execute("""
            UPDATE refresh_tokens SET revoked = true WHERE jti = $1
        """, old_jti)

        # Create new token pair
        new_access = create_access_token({"sub": user_id})
        new_refresh = create_refresh_token({"sub": user_id})

        # Store new refresh token in the SAME family (for reuse detection)
        new_jti = decode_token(new_refresh)["jti"]
        await self.db.execute("""
            INSERT INTO refresh_tokens (jti, family_id, user_id, device_info, expires_at)
            VALUES ($1, $2, $3, $4, $5)
        """, new_jti, token_record["family_id"], user_id,
            token_record["device_info"],
            datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))

        return new_access, new_refresh

    async def _revoke_token_family(self, family_id: str):
        """Revoke all tokens in a family - used when reuse is detected"""
        await self.db.execute("""
            UPDATE refresh_tokens SET revoked = true WHERE family_id = $1
        """, family_id)

    async def revoke_all_user_tokens(self, user_id: str):
        """Revoke all tokens for a user - used for 'logout everywhere'"""
        await self.db.execute("""
            UPDATE refresh_tokens SET revoked = true WHERE user_id = $1
        """, user_id)

    async def revoke_token(self, jti: str):
        """Revoke a specific token - used for single session logout"""
        await self.db.execute("""
            UPDATE refresh_tokens SET revoked = true WHERE jti = $1
        """, jti)
```

### Database Schema

This schema stores refresh token metadata for revocation tracking. The family_id links related tokens from the same login session, enabling bulk revocation when suspicious activity is detected.

```sql
-- Table for tracking refresh tokens and their revocation status
CREATE TABLE refresh_tokens (
    jti VARCHAR(255) PRIMARY KEY,        -- Unique token identifier (from JWT)
    family_id VARCHAR(255) NOT NULL,     -- Groups tokens from same login session
    user_id VARCHAR(255) NOT NULL,       -- Owner of the token
    device_info VARCHAR(500),            -- User-Agent for session management UI
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- When token was issued
    expires_at TIMESTAMP NOT NULL,       -- When token becomes invalid
    revoked BOOLEAN DEFAULT FALSE,       -- Whether token has been invalidated

    -- Indexes for efficient lookups
    INDEX idx_user_id (user_id),         -- For 'logout everywhere'
    INDEX idx_family_id (family_id),     -- For family revocation
    INDEX idx_expires_at (expires_at)    -- For cleanup queries
);

-- Run periodically to remove old tokens and keep table size manageable
DELETE FROM refresh_tokens WHERE expires_at < NOW() - INTERVAL '30 days';
```

---

## FastAPI Integration

This complete FastAPI authentication implementation includes login, token refresh with rotation, and logout endpoints. It uses FastAPI's dependency injection to validate tokens and protect routes.

```python
# auth_routes.py
# Complete FastAPI JWT authentication routes
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

# OAuth2PasswordBearer extracts token from Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

class TokenResponse(BaseModel):
    """Response model for token endpoints"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    """Request model for token refresh"""
    refresh_token: str

# Global token manager - initialized at startup
token_manager: TokenManager = None

@app.on_event("startup")
async def startup():
    """Initialize database pool and token manager at app startup"""
    global token_manager
    pool = await asyncpg.create_pool(os.environ["DATABASE_URL"])
    token_manager = TokenManager(pool)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Dependency that validates access token and returns the user object"""
    # Standard OAuth2 error response
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token)

        # Ensure this is an access token, not a refresh token
        if payload.get("type") != "access":
            raise credentials_exception

        # Extract user ID from 'sub' (subject) claim
        user_id = payload.get("sub")
        if not user_id:
            raise credentials_exception

        # Optional: Check if token is blacklisted for immediate revocation
        # if await is_token_blacklisted(payload["jti"]):
        #     raise credentials_exception

    except ValueError:
        raise credentials_exception

    # Fetch user from database
    user = await get_user_by_id(user_id)
    if not user:
        raise credentials_exception

    return user

@app.post("/auth/token", response_model=TokenResponse)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """Authenticate user and return access/refresh token pair"""
    # Verify credentials against database
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Store device info for session management UI
    device_info = request.headers.get("User-Agent", "Unknown")

    # Generate tokens and store refresh token metadata
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
    """Exchange refresh token for new access/refresh token pair"""
    try:
        # Rotate tokens (old refresh token is invalidated)
        access_token, refresh_token = await token_manager.rotate_refresh_token(
            request.refresh_token
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token
        )
    except ValueError as e:
        # Token invalid, expired, or reuse detected
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

@app.post("/auth/logout")
async def logout(
    token: str = Depends(oauth2_scheme),
    current_user = Depends(get_current_user)
):
    """Logout current session by revoking the refresh token"""
    payload = decode_token(token)
    await token_manager.revoke_token(payload["jti"])
    return {"message": "Logged out successfully"}

@app.post("/auth/logout-all")
async def logout_all_sessions(current_user = Depends(get_current_user)):
    """Logout all sessions for current user (all devices)"""
    await token_manager.revoke_all_user_tokens(current_user.id)
    return {"message": "All sessions logged out"}
```

---

## Access Token Blacklisting

Since access tokens are stateless, they remain valid until expiration even after logout. For immediate revocation (e.g., security incidents), maintain an in-memory blacklist of revoked token IDs. The blacklist automatically cleans up expired entries to prevent memory growth.

```python
# token_blacklist.py
# In-memory blacklist for immediate access token revocation
from datetime import datetime, timedelta
from typing import Set
import asyncio

class TokenBlacklist:
    """In-memory blacklist for revoked access tokens

    Use this when you need to immediately revoke access tokens
    (e.g., user changes password, security incident)
    """

    def __init__(self, cleanup_interval: int = 300):
        self._blacklist: dict = {}  # jti -> expiry timestamp
        self._cleanup_interval = cleanup_interval  # Cleanup every 5 minutes
        self._cleanup_task = None

    async def start(self):
        """Start background cleanup task - call at app startup"""
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def stop(self):
        """Stop cleanup task - call at app shutdown"""
        if self._cleanup_task:
            self._cleanup_task.cancel()

    async def _cleanup_loop(self):
        """Periodically remove expired tokens to prevent memory growth"""
        while True:
            await asyncio.sleep(self._cleanup_interval)
            now = datetime.utcnow()
            # Keep only tokens that haven't expired yet
            self._blacklist = {
                jti: exp for jti, exp in self._blacklist.items()
                if exp > now
            }

    def add(self, jti: str, expiry: datetime):
        """Add token to blacklist - remains until original expiry"""
        self._blacklist[jti] = expiry

    def is_blacklisted(self, jti: str) -> bool:
        """Check if token is blacklisted (revoked)"""
        expiry = self._blacklist.get(jti)
        if not expiry:
            return False  # Not in blacklist
        if expiry < datetime.utcnow():
            # Token expired anyway, remove from blacklist
            del self._blacklist[jti]
            return False
        return True  # Token is revoked

# Global blacklist singleton
blacklist = TokenBlacklist()

async def revoke_access_token(token: str):
    """Immediately revoke an access token"""
    payload = decode_token(token)
    # Keep in blacklist until token would have expired naturally
    exp = datetime.fromtimestamp(payload["exp"])
    blacklist.add(payload["jti"], exp)

async def get_current_user_strict(token: str = Depends(oauth2_scheme)):
    """Get current user with blacklist check for immediate revocation"""
    try:
        payload = decode_token(token)

        # Check if token was revoked
        if blacklist.is_blacklisted(payload["jti"]):
            raise HTTPException(status_code=401, detail="Token revoked")

        # ... rest of validation
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

---

## Secure Cookie Storage

For browser-based applications, HTTP-only cookies are more secure than localStorage because they cannot be accessed by JavaScript (protecting against XSS attacks). The refresh token is restricted to the refresh endpoint path to minimize exposure.

```python
# cookie_auth.py
# Secure cookie-based JWT authentication for browser applications
from fastapi import FastAPI, Response, Request, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()

# Security settings for auth cookies
COOKIE_SETTINGS = {
    "httponly": True,   # Not accessible via JavaScript (XSS protection)
    "secure": True,     # Only sent over HTTPS
    "samesite": "lax",  # CSRF protection (strict for maximum security)
    "path": "/",        # Available to all routes
}

@app.post("/auth/login")
async def login_cookie(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """Login and set tokens in HTTP-only cookies"""
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401)

    access_token, refresh_token = await token_manager.create_token_pair(user.id)

    # Set access token cookie (short-lived, available to all routes)
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Convert to seconds
        **COOKIE_SETTINGS
    )

    # Set refresh token cookie (longer-lived, restricted to refresh endpoint)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,  # Convert to seconds
        path="/auth/refresh",  # IMPORTANT: Only sent to refresh endpoint
        **COOKIE_SETTINGS
    )

    return {"message": "Logged in"}

async def get_current_user_cookie(request: Request):
    """Extract and validate user from cookie-based token"""
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
    """Logout by clearing auth cookies"""
    # Delete both cookies (must match paths used when setting)
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/auth/refresh")
    return {"message": "Logged out"}
```

---

## Security Best Practices

### 1. Use Strong Secrets

Never use weak or predictable secrets. Generate a cryptographically secure random string of at least 256 bits (32 bytes).

```python
# Generate a secure secret - run once and store in environment variable
import secrets
secret = secrets.token_urlsafe(32)  # 256-bit random string
print(f"JWT_SECRET_KEY={secret}")
```

### 2. Validate All Claims

Always validate all JWT claims, not just the signature. Check expiration, issued-at time (to detect tokens from the future), token type, and required claims.

```python
def validate_token_claims(payload: dict):
    """Comprehensive JWT claim validation"""
    now = datetime.utcnow()

    # Check expiration time
    exp = datetime.fromtimestamp(payload["exp"])
    if now > exp:
        raise ValueError("Token expired")

    # Check issued-at time (detect tokens from future - possible clock manipulation)
    iat = datetime.fromtimestamp(payload["iat"])
    if iat > now + timedelta(minutes=5):  # Allow 5 min clock skew
        raise ValueError("Token issued in future")

    # Verify token type matches expected type
    if payload.get("type") not in ["access", "refresh"]:
        raise ValueError("Invalid token type")

    # Ensure required claims are present
    if not payload.get("sub"):
        raise ValueError("Missing subject claim")
```

### 3. Use RS256 for Distributed Systems

HS256 requires sharing the secret with all services that verify tokens. RS256 uses asymmetric keys: only the auth service needs the private key, other services only need the public key.

```python
# For microservices, use asymmetric keys (RS256)
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

# Generate key pair ONCE, store securely
private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048  # Minimum 2048 bits for security
)
public_key = private_key.public_key()

# Auth service: Sign with PRIVATE key (keep secret!)
token = jwt.encode(payload, private_key, algorithm="RS256")

# Any service: Verify with PUBLIC key (can be shared freely)
payload = jwt.decode(token, public_key, algorithms=["RS256"])
```

### 4. Include Security Headers

Add headers to prevent token leakage through referrers and browser caching of authenticated responses.

```python
@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Add security headers to all responses"""
    response = await call_next(request)

    # Prevent token leakage via referrer header
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Prevent caching of authenticated responses (could leak tokens)
    if "Authorization" in request.headers:
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"

    return response
```

### 5. Rate Limit Auth Endpoints

Rate limiting prevents brute force attacks on login and token refresh endpoints.

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

# Rate limit by client IP address
limiter = Limiter(key_func=get_remote_address)

@app.post("/auth/token")
@limiter.limit("5/minute")  # Max 5 login attempts per minute
async def login(request: Request, ...):
    pass

@app.post("/auth/refresh")
@limiter.limit("10/minute")  # Max 10 refreshes per minute
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
