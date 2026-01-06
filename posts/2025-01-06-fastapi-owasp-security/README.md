# How to Secure FastAPI Applications Against OWASP Top 10

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, FastAPI, Security, OWASP, SQL Injection, XSS, Authentication, API Security

Description: A comprehensive guide to securing FastAPI applications against OWASP Top 10 vulnerabilities. Learn input validation, SQL injection prevention, authentication hardening, and security best practices.

---

> Security isn't optional. The OWASP Top 10 represents the most critical security risks to web applications. This guide shows you how to protect your FastAPI applications against each vulnerability with practical code examples.

FastAPI provides good security defaults, but defaults aren't enough. You need to actively implement security measures at every layer of your application.

---

## OWASP Top 10 Overview

| Rank | Vulnerability | FastAPI Risk Level |
|------|---------------|-------------------|
| A01 | Broken Access Control | High |
| A02 | Cryptographic Failures | Medium |
| A03 | Injection | High |
| A04 | Insecure Design | Medium |
| A05 | Security Misconfiguration | Medium |
| A06 | Vulnerable Components | Medium |
| A07 | Authentication Failures | High |
| A08 | Data Integrity Failures | Medium |
| A09 | Security Logging Failures | Medium |
| A10 | Server-Side Request Forgery | Medium |

---

## A01: Broken Access Control

### The Problem

Users accessing resources they shouldn't have access to.

### Solution: Role-Based Access Control

```python
# rbac.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from enum import Enum
from typing import List, Optional
from functools import wraps

app = FastAPI()

class Role(str, Enum):
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"

class User:
    def __init__(self, id: int, username: str, roles: List[Role]):
        self.id = id
        self.username = username
        self.roles = roles

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Decode token and return user"""
    user = decode_and_verify_token(token)  # Implement this
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    return user

def require_roles(allowed_roles: List[Role]):
    """Decorator to check user roles"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User = Depends(get_current_user), **kwargs):
            if not any(role in current_user.roles for role in allowed_roles):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions"
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

# Usage
@app.get("/admin/users")
@require_roles([Role.ADMIN])
async def list_all_users(current_user: User = Depends(get_current_user)):
    return {"users": get_all_users()}

@app.get("/users/{user_id}")
async def get_user(user_id: int, current_user: User = Depends(get_current_user)):
    # Users can only access their own data unless admin
    if user_id != current_user.id and Role.ADMIN not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other user's data"
        )
    return get_user_by_id(user_id)
```

### Object-Level Authorization

```python
# object_auth.py
from fastapi import Depends, HTTPException

async def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user)
):
    """Ensure user can access this specific document"""
    document = await fetch_document(document_id)

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Check ownership or permissions
    if document.owner_id != current_user.id:
        # Check if user has explicit access
        if not await has_document_access(current_user.id, document_id):
            raise HTTPException(
                status_code=403,
                detail="Access denied to this document"
            )

    return document

@app.get("/documents/{document_id}")
async def read_document(document: dict = Depends(get_document)):
    return document
```

---

## A02: Cryptographic Failures

### Password Hashing

```python
# password_security.py
from passlib.context import CryptContext
import secrets

# Use bcrypt for passwords
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12  # Adjust based on your performance needs
)

def hash_password(password: str) -> str:
    """Hash a password securely"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure token"""
    return secrets.token_urlsafe(length)
```

### Secure Data at Rest

```python
# encryption.py
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os

class DataEncryptor:
    """Encrypt sensitive data at rest"""

    def __init__(self, secret_key: str):
        # Derive a key from the secret
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'static_salt_change_this',  # Use env variable
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(secret_key.encode()))
        self._fernet = Fernet(key)

    def encrypt(self, data: str) -> str:
        """Encrypt data"""
        return self._fernet.encrypt(data.encode()).decode()

    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt data"""
        return self._fernet.decrypt(encrypted_data.encode()).decode()

# Usage
encryptor = DataEncryptor(os.environ['ENCRYPTION_KEY'])

# Encrypt PII before storing
encrypted_ssn = encryptor.encrypt("123-45-6789")
# Decrypt when needed
ssn = encryptor.decrypt(encrypted_ssn)
```

---

## A03: Injection

### SQL Injection Prevention

```python
# sql_injection.py
from fastapi import FastAPI, Query, HTTPException
import asyncpg
from typing import Optional

app = FastAPI()

# BAD: SQL Injection Vulnerable
async def bad_search_users(search_term: str):
    query = f"SELECT * FROM users WHERE name LIKE '%{search_term}%'"  # VULNERABLE!
    return await db.fetch(query)

# GOOD: Parameterized Queries
async def good_search_users(pool: asyncpg.Pool, search_term: str):
    """Use parameterized queries to prevent SQL injection"""
    query = "SELECT * FROM users WHERE name LIKE $1"
    return await pool.fetch(query, f"%{search_term}%")

# With SQLAlchemy ORM (inherently safe)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

async def orm_search_users(session: AsyncSession, search_term: str):
    """ORM queries are parameterized by default"""
    stmt = select(User).where(User.name.ilike(f"%{search_term}%"))
    result = await session.execute(stmt)
    return result.scalars().all()

@app.get("/users/search")
async def search_users(
    q: str = Query(..., min_length=1, max_length=100)
):
    # Input is validated by Pydantic
    return await good_search_users(pool, q)
```

### Command Injection Prevention

```python
# command_injection.py
import subprocess
import shlex

# BAD: Command Injection Vulnerable
def bad_ping(host: str):
    result = subprocess.run(f"ping -c 1 {host}", shell=True)  # VULNERABLE!
    return result.returncode == 0

# GOOD: Use list arguments, never shell=True
def good_ping(host: str) -> bool:
    """Safe command execution"""
    # Validate input
    if not is_valid_hostname(host):
        raise ValueError("Invalid hostname")

    # Use list arguments
    result = subprocess.run(
        ["ping", "-c", "1", host],
        capture_output=True,
        timeout=5
    )
    return result.returncode == 0

def is_valid_hostname(hostname: str) -> bool:
    """Validate hostname format"""
    import re
    pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$'
    return bool(re.match(pattern, hostname)) and len(hostname) <= 253
```

---

## A04: Insecure Design

### Input Validation with Pydantic

```python
# input_validation.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
import re

app = FastAPI()

class UserCreate(BaseModel):
    """Validated user creation model"""

    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        regex=r'^[a-zA-Z0-9_]+$',
        description="Alphanumeric and underscore only"
    )

    email: EmailStr

    password: str = Field(
        ...,
        min_length=12,
        max_length=128
    )

    phone: Optional[str] = Field(
        None,
        regex=r'^\+?[1-9]\d{1,14}$'
    )

    @validator('password')
    def password_strength(cls, v):
        """Enforce password complexity"""
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain special character')
        return v

    @validator('username')
    def username_not_reserved(cls, v):
        """Block reserved usernames"""
        reserved = ['admin', 'root', 'system', 'administrator']
        if v.lower() in reserved:
            raise ValueError('Username is reserved')
        return v

class Config:
    # Forbid extra fields to prevent mass assignment
    extra = 'forbid'

@app.post("/users")
async def create_user(user: UserCreate):
    # Input is fully validated by Pydantic
    return await save_user(user)
```

### Rate Limiting Sensitive Operations

```python
# sensitive_ops.py
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
import time
from collections import defaultdict

app = FastAPI()

# Simple in-memory rate limiter for sensitive operations
class SensitiveOpLimiter:
    def __init__(self, max_attempts: int, window_seconds: int):
        self.max_attempts = max_attempts
        self.window = window_seconds
        self.attempts = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        # Clean old attempts
        self.attempts[key] = [
            t for t in self.attempts[key]
            if now - t < self.window
        ]
        # Check limit
        if len(self.attempts[key]) >= self.max_attempts:
            return False
        self.attempts[key].append(now)
        return True

# 5 password reset attempts per hour
password_reset_limiter = SensitiveOpLimiter(5, 3600)

@app.post("/password-reset")
async def request_password_reset(request: Request, email: str):
    client_ip = request.client.host

    if not password_reset_limiter.is_allowed(f"{client_ip}:{email}"):
        raise HTTPException(
            status_code=429,
            detail="Too many password reset attempts. Try again later."
        )

    # Always return success to prevent email enumeration
    await send_reset_email_if_exists(email)
    return {"message": "If the email exists, a reset link has been sent"}
```

---

## A05: Security Misconfiguration

### Secure Headers Middleware

```python
# security_headers.py
from fastapi import FastAPI
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

app = FastAPI()

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""

    async def dispatch(self, request, call_next):
        response = await call_next(request)

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Enable XSS filter
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "frame-ancestors 'none';"
        )

        # Strict Transport Security (HTTPS only)
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )

        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions Policy
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )

        return response

app.add_middleware(SecurityHeadersMiddleware)
```

### CORS Configuration

```python
# cors_config.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# Get allowed origins from environment
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",")

# Don't use "*" in production!
if "*" in ALLOWED_ORIGINS:
    raise ValueError("Wildcard CORS origin not allowed in production")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Specific origins only
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Specific methods
    allow_headers=["Authorization", "Content-Type"],  # Specific headers
    max_age=600,  # Cache preflight for 10 minutes
)
```

---

## A06: Vulnerable Components

### Dependency Scanning

```bash
# Use safety to check for known vulnerabilities
pip install safety
safety check

# Use pip-audit for comprehensive scanning
pip install pip-audit
pip-audit

# In CI/CD (GitHub Actions example)
# .github/workflows/security.yml
```

```yaml
name: Security Scan
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install safety pip-audit

      - name: Run safety check
        run: safety check

      - name: Run pip-audit
        run: pip-audit
```

---

## A07: Authentication Failures

### Secure JWT Implementation

```python
# jwt_auth.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os

app = FastAPI()

# Configuration
SECRET_KEY = os.environ["JWT_SECRET_KEY"]  # Use strong random key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15  # Short-lived access tokens
REFRESH_TOKEN_EXPIRE_DAYS = 7

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a short-lived access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({
        "exp": expire,
        "type": "access",
        "iat": datetime.utcnow()
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict):
    """Create a longer-lived refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({
        "exp": expire,
        "type": "refresh",
        "iat": datetime.utcnow()
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Validate access token and return user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # Verify token type
        if payload.get("type") != "access":
            raise credentials_exception

        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception

        # Check if token is blacklisted (for logout)
        if await is_token_blacklisted(token):
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = await get_user(username)
    if user is None:
        raise credentials_exception

    return user

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login endpoint with rate limiting"""
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        # Use constant-time comparison to prevent timing attacks
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username})
    refresh_token = create_refresh_token(data={"sub": user.username})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@app.post("/token/refresh")
async def refresh_access_token(refresh_token: str):
    """Get new access token using refresh token"""
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")

        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Verify user still exists and is active
        user = await get_user(username)
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")

        # Create new access token
        new_access_token = create_access_token(data={"sub": username})

        return {"access_token": new_access_token, "token_type": "bearer"}

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@app.post("/logout")
async def logout(token: str = Depends(oauth2_scheme)):
    """Logout by blacklisting the token"""
    await blacklist_token(token)
    return {"message": "Successfully logged out"}
```

---

## A08: Data Integrity Failures

### Request Signing

```python
# request_signing.py
import hmac
import hashlib
import time
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

WEBHOOK_SECRET = os.environ["WEBHOOK_SECRET"]

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify HMAC signature"""
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)

@app.post("/webhooks/payment")
async def payment_webhook(request: Request):
    """Verify webhook signature before processing"""
    signature = request.headers.get("X-Signature")
    timestamp = request.headers.get("X-Timestamp")

    if not signature or not timestamp:
        raise HTTPException(status_code=400, detail="Missing signature headers")

    # Check timestamp to prevent replay attacks
    if abs(time.time() - int(timestamp)) > 300:  # 5 minute window
        raise HTTPException(status_code=400, detail="Request too old")

    body = await request.body()
    payload_to_verify = f"{timestamp}.{body.decode()}"

    if not verify_signature(payload_to_verify.encode(), signature, WEBHOOK_SECRET):
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Process verified webhook
    data = await request.json()
    await process_payment_webhook(data)

    return {"status": "processed"}
```

---

## A09: Security Logging

### Security Event Logging

```python
# security_logging.py
import logging
import json
from datetime import datetime
from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware

# Configure security logger
security_logger = logging.getLogger("security")
security_logger.setLevel(logging.INFO)
handler = logging.FileHandler("security.log")
handler.setFormatter(logging.Formatter('%(message)s'))
security_logger.addHandler(handler)

def log_security_event(
    event_type: str,
    request: Request,
    user_id: str = None,
    details: dict = None
):
    """Log security-relevant events"""
    event = {
        "timestamp": datetime.utcnow().isoformat(),
        "event_type": event_type,
        "ip_address": request.client.host,
        "user_agent": request.headers.get("user-agent"),
        "path": request.url.path,
        "method": request.method,
        "user_id": user_id,
        "details": details or {}
    }
    security_logger.info(json.dumps(event))

class SecurityLoggingMiddleware(BaseHTTPMiddleware):
    """Log all authentication failures and suspicious activity"""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Log authentication failures
        if response.status_code == 401:
            log_security_event("auth_failure", request)

        # Log authorization failures
        if response.status_code == 403:
            log_security_event("authz_failure", request)

        # Log rate limit violations
        if response.status_code == 429:
            log_security_event("rate_limit_exceeded", request)

        return response

app = FastAPI()
app.add_middleware(SecurityLoggingMiddleware)

# Log successful logins
@app.post("/login")
async def login(request: Request, credentials: LoginCredentials):
    user = await authenticate(credentials)
    if user:
        log_security_event("login_success", request, user_id=user.id)
        return create_session(user)
    else:
        log_security_event("login_failure", request, details={
            "username": credentials.username
        })
        raise HTTPException(status_code=401)
```

---

## A10: Server-Side Request Forgery (SSRF)

### SSRF Prevention

```python
# ssrf_prevention.py
from fastapi import FastAPI, HTTPException
import httpx
import ipaddress
from urllib.parse import urlparse

app = FastAPI()

# Blocked IP ranges
BLOCKED_RANGES = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
]

ALLOWED_SCHEMES = ["http", "https"]
ALLOWED_PORTS = [80, 443, 8080, 8443]

def is_safe_url(url: str) -> bool:
    """Validate URL is safe to fetch"""
    try:
        parsed = urlparse(url)

        # Check scheme
        if parsed.scheme not in ALLOWED_SCHEMES:
            return False

        # Check port
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        if port not in ALLOWED_PORTS:
            return False

        # Resolve hostname and check IP
        import socket
        hostname = parsed.hostname
        if not hostname:
            return False

        # Block localhost variations
        if hostname in ["localhost", "127.0.0.1", "::1", "0.0.0.0"]:
            return False

        # Resolve and check IP
        try:
            ip = ipaddress.ip_address(socket.gethostbyname(hostname))
            for blocked in BLOCKED_RANGES:
                if ip in blocked:
                    return False
        except socket.gaierror:
            return False

        return True

    except Exception:
        return False

@app.post("/fetch-url")
async def fetch_external_url(url: str):
    """Safely fetch external URL"""
    if not is_safe_url(url):
        raise HTTPException(
            status_code=400,
            detail="URL not allowed"
        )

    async with httpx.AsyncClient(
        follow_redirects=False,  # Don't follow redirects
        timeout=10.0
    ) as client:
        response = await client.get(url)

        # Validate redirect targets too
        if response.is_redirect:
            redirect_url = response.headers.get("location")
            if not is_safe_url(redirect_url):
                raise HTTPException(
                    status_code=400,
                    detail="Redirect URL not allowed"
                )

        return {"content": response.text[:1000]}  # Limit response size
```

---

## Security Checklist

- [ ] Input validation on all endpoints (Pydantic)
- [ ] Parameterized database queries
- [ ] Password hashing with bcrypt
- [ ] JWT with short expiration
- [ ] Rate limiting on sensitive endpoints
- [ ] Security headers middleware
- [ ] CORS properly configured
- [ ] HTTPS enforced
- [ ] Dependency scanning in CI/CD
- [ ] Security event logging
- [ ] SSRF prevention for URL fetching

---

## Conclusion

Securing FastAPI applications requires attention to each OWASP Top 10 vulnerability. Key takeaways:

- **Validate all input** with Pydantic models
- **Use parameterized queries** to prevent injection
- **Implement proper authentication** with short-lived tokens
- **Add security headers** and configure CORS properly
- **Log security events** for monitoring and incident response
- **Keep dependencies updated** and scanned for vulnerabilities

Security is an ongoing process, not a one-time setup.

---

*Need to monitor security events in your applications? [OneUptime](https://oneuptime.com) provides comprehensive logging and alerting to help you detect and respond to security incidents quickly.*

**Related Reading:**
- [Secure Your Status Page Authentication Options](https://oneuptime.com/blog/post/2025-11-20-secure-your-status-page-authentication-options/view)
