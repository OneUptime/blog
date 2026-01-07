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

Implement a complete RBAC system with role checking decorators and user authentication:

```python
# rbac.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from enum import Enum
from typing import List, Optional
from functools import wraps

app = FastAPI()

# Define user roles as an enum for type safety
class Role(str, Enum):
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"

# User model with role information
class User:
    def __init__(self, id: int, username: str, roles: List[Role]):
        self.id = id
        self.username = username
        self.roles = roles

# OAuth2 scheme for token-based authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Decode JWT token and return the authenticated user"""
    user = decode_and_verify_token(token)  # Implement this with your JWT library
    if not user:
        # Return 401 for invalid credentials (authentication failure)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    return user

def require_roles(allowed_roles: List[Role]):
    """Decorator to enforce role-based access control on endpoints"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User = Depends(get_current_user), **kwargs):
            # Check if user has at least one of the required roles
            if not any(role in current_user.roles for role in allowed_roles):
                # Return 403 for insufficient permissions (authorization failure)
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions"
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

# Admin-only endpoint example
@app.get("/admin/users")
@require_roles([Role.ADMIN])
async def list_all_users(current_user: User = Depends(get_current_user)):
    """Only administrators can list all users"""
    return {"users": get_all_users()}

# Endpoint with ownership check
@app.get("/users/{user_id}")
async def get_user(user_id: int, current_user: User = Depends(get_current_user)):
    """Users can only access their own data unless they're an admin"""
    # Ownership check: user can only view their own profile
    if user_id != current_user.id and Role.ADMIN not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other user's data"
        )
    return get_user_by_id(user_id)
```

### Object-Level Authorization

Implement authorization checks at the object level to ensure users can only access resources they own or have explicit permissions for:

```python
# object_auth.py
from fastapi import Depends, HTTPException

async def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user)
):
    """Dependency that fetches a document and verifies user has access"""
    # First, fetch the document
    document = await fetch_document(document_id)

    if not document:
        # Return 404 if document doesn't exist
        raise HTTPException(status_code=404, detail="Document not found")

    # Check if the current user is the owner
    if document.owner_id != current_user.id:
        # If not owner, check for explicit shared access
        if not await has_document_access(current_user.id, document_id):
            # Deny access if no ownership or explicit permission
            raise HTTPException(
                status_code=403,
                detail="Access denied to this document"
            )

    return document

# Use the dependency to ensure authorization is checked before handler runs
@app.get("/documents/{document_id}")
async def read_document(document: dict = Depends(get_document)):
    """Document is already authorized via the dependency"""
    return document
```

---

## A02: Cryptographic Failures

### Password Hashing

Use bcrypt for secure password hashing - it's slow by design to prevent brute force attacks:

```python
# password_security.py
from passlib.context import CryptContext
import secrets

# Configure password hashing context with bcrypt
# 'deprecated="auto"' handles algorithm upgrades automatically
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12  # Work factor - higher is slower but more secure
)

def hash_password(password: str) -> str:
    """Hash a password securely using bcrypt

    The hash includes a random salt, so identical passwords
    produce different hashes.
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash

    Uses constant-time comparison to prevent timing attacks.
    """
    return pwd_context.verify(plain_password, hashed_password)

def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token

    Suitable for password reset tokens, API keys, etc.
    """
    return secrets.token_urlsafe(length)
```

### Secure Data at Rest

Encrypt sensitive data before storing it in the database:

```python
# encryption.py
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os

class DataEncryptor:
    """Encrypt sensitive data at rest using Fernet symmetric encryption"""

    def __init__(self, secret_key: str):
        # Derive a 256-bit key from the secret using PBKDF2
        # This allows using a human-readable secret while getting a proper key
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'static_salt_change_this',  # Use env variable in production!
            iterations=100000,  # High iteration count for security
        )
        key = base64.urlsafe_b64encode(kdf.derive(secret_key.encode()))
        self._fernet = Fernet(key)

    def encrypt(self, data: str) -> str:
        """Encrypt a string and return base64-encoded ciphertext"""
        return self._fernet.encrypt(data.encode()).decode()

    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt base64-encoded ciphertext back to original string"""
        return self._fernet.decrypt(encrypted_data.encode()).decode()

# Initialize encryptor with secret from environment
encryptor = DataEncryptor(os.environ['ENCRYPTION_KEY'])

# Example: Encrypt PII before storing in database
encrypted_ssn = encryptor.encrypt("123-45-6789")
# Decrypt when needed for display
ssn = encryptor.decrypt(encrypted_ssn)
```

---

## A03: Injection

### SQL Injection Prevention

Never concatenate user input into SQL queries - always use parameterized queries:

```python
# sql_injection.py
from fastapi import FastAPI, Query, HTTPException
import asyncpg
from typing import Optional

app = FastAPI()

# BAD EXAMPLE - VULNERABLE TO SQL INJECTION
# Never do this - user input is directly interpolated into the query
async def bad_search_users(search_term: str):
    query = f"SELECT * FROM users WHERE name LIKE '%{search_term}%'"  # VULNERABLE!
    return await db.fetch(query)

# GOOD EXAMPLE - Use parameterized queries
async def good_search_users(pool: asyncpg.Pool, search_term: str):
    """Use parameterized queries to prevent SQL injection

    The $1 placeholder is replaced by the driver, properly escaping
    any special characters in the user input.
    """
    query = "SELECT * FROM users WHERE name LIKE $1"
    return await pool.fetch(query, f"%{search_term}%")

# GOOD EXAMPLE - SQLAlchemy ORM (inherently safe)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

async def orm_search_users(session: AsyncSession, search_term: str):
    """ORM queries use parameterization by default

    The ilike() method safely handles the search term.
    """
    stmt = select(User).where(User.name.ilike(f"%{search_term}%"))
    result = await session.execute(stmt)
    return result.scalars().all()

# Endpoint with Pydantic validation for additional safety
@app.get("/users/search")
async def search_users(
    q: str = Query(..., min_length=1, max_length=100)  # Validated by Pydantic
):
    """Input is validated by Pydantic before reaching the handler"""
    return await good_search_users(pool, q)
```

### Command Injection Prevention

Never use shell=True with user input - always use list arguments:

```python
# command_injection.py
import subprocess
import shlex

# BAD EXAMPLE - VULNERABLE TO COMMAND INJECTION
# An attacker could pass "; rm -rf /" as the host parameter
def bad_ping(host: str):
    result = subprocess.run(f"ping -c 1 {host}", shell=True)  # VULNERABLE!
    return result.returncode == 0

# GOOD EXAMPLE - Use list arguments and validate input
def good_ping(host: str) -> bool:
    """Safe command execution with input validation"""
    # First validate the input format
    if not is_valid_hostname(host):
        raise ValueError("Invalid hostname")

    # Use list arguments - each element is a separate argument
    # This prevents shell metacharacter interpretation
    result = subprocess.run(
        ["ping", "-c", "1", host],
        capture_output=True,
        timeout=5  # Prevent hanging on unresponsive hosts
    )
    return result.returncode == 0

def is_valid_hostname(hostname: str) -> bool:
    """Validate hostname format using regex

    Only allows alphanumeric characters, hyphens, and dots.
    """
    import re
    # RFC 1123 hostname pattern
    pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$'
    return bool(re.match(pattern, hostname)) and len(hostname) <= 253
```

---

## A04: Insecure Design

### Input Validation with Pydantic

Use Pydantic models to validate and sanitize all user input:

```python
# input_validation.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
import re

app = FastAPI()

class UserCreate(BaseModel):
    """Validated user creation model with comprehensive input validation"""

    # Username with regex pattern - only alphanumeric and underscore
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        regex=r'^[a-zA-Z0-9_]+$',
        description="Alphanumeric and underscore only"
    )

    # Email validation using Pydantic's EmailStr type
    email: EmailStr

    # Password with length requirements
    password: str = Field(
        ...,
        min_length=12,  # NIST recommends at least 8, we use 12 for extra security
        max_length=128
    )

    # Optional phone with E.164 format validation
    phone: Optional[str] = Field(
        None,
        regex=r'^\+?[1-9]\d{1,14}$'
    )

    @validator('password')
    def password_strength(cls, v):
        """Enforce password complexity requirements"""
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
        """Block reserved usernames that could be used for impersonation"""
        reserved = ['admin', 'root', 'system', 'administrator']
        if v.lower() in reserved:
            raise ValueError('Username is reserved')
        return v

class Config:
    # Forbid extra fields to prevent mass assignment attacks
    extra = 'forbid'

@app.post("/users")
async def create_user(user: UserCreate):
    """Input is fully validated by Pydantic before this code runs"""
    return await save_user(user)
```

### Rate Limiting Sensitive Operations

Protect sensitive operations like password reset from brute force attacks:

```python
# sensitive_ops.py
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
import time
from collections import defaultdict

app = FastAPI()

class SensitiveOpLimiter:
    """Simple in-memory rate limiter for sensitive operations"""

    def __init__(self, max_attempts: int, window_seconds: int):
        self.max_attempts = max_attempts
        self.window = window_seconds
        # Track attempts per key (IP + email combination)
        self.attempts = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        """Check if operation is allowed under rate limit"""
        now = time.time()

        # Remove attempts outside the current window
        self.attempts[key] = [
            t for t in self.attempts[key]
            if now - t < self.window
        ]

        # Check if limit exceeded
        if len(self.attempts[key]) >= self.max_attempts:
            return False

        # Record this attempt
        self.attempts[key].append(now)
        return True

# Allow 5 password reset attempts per hour per IP+email
password_reset_limiter = SensitiveOpLimiter(5, 3600)

@app.post("/password-reset")
async def request_password_reset(request: Request, email: str):
    """Password reset with rate limiting and email enumeration prevention"""
    client_ip = request.client.host

    # Rate limit by IP + email to prevent both brute force and enumeration
    if not password_reset_limiter.is_allowed(f"{client_ip}:{email}"):
        raise HTTPException(
            status_code=429,
            detail="Too many password reset attempts. Try again later."
        )

    # Always return success to prevent email enumeration attacks
    # This way attackers can't determine which emails exist in the system
    await send_reset_email_if_exists(email)
    return {"message": "If the email exists, a reset link has been sent"}
```

---

## A05: Security Misconfiguration

### Secure Headers Middleware

Add security headers to all HTTP responses to prevent common attacks:

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

        # Prevent clickjacking by disallowing iframe embedding
        response.headers["X-Frame-Options"] = "DENY"

        # Prevent MIME type sniffing attacks
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Enable browser's XSS filter (legacy browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Content Security Policy - restrict resource loading
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "  # Default to same-origin only
            "script-src 'self'; "    # Scripts from same origin
            "style-src 'self' 'unsafe-inline'; "  # Styles with inline allowed
            "img-src 'self' data: https:; "  # Images from same origin, data URIs, HTTPS
            "font-src 'self'; "  # Fonts from same origin
            "frame-ancestors 'none';"  # Prevent embedding in iframes
        )

        # Strict Transport Security - force HTTPS for 1 year
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )

        # Control referrer information sent with requests
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Disable browser features that aren't needed
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )

        return response

# Add the middleware to the application
app.add_middleware(SecurityHeadersMiddleware)
```

### CORS Configuration

Configure CORS properly - never use wildcards in production:

```python
# cors_config.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# Get allowed origins from environment variable
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",")

# Security check - prevent wildcard CORS in production
if "*" in ALLOWED_ORIGINS:
    raise ValueError("Wildcard CORS origin not allowed in production")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Specific origins only, never "*"
    allow_credentials=True,  # Allow cookies/auth headers
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Specific methods only
    allow_headers=["Authorization", "Content-Type"],  # Specific headers only
    max_age=600,  # Cache preflight response for 10 minutes
)
```

---

## A06: Vulnerable Components

### Dependency Scanning

Regularly scan your dependencies for known vulnerabilities:

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

Automate dependency scanning in your CI/CD pipeline:

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

Implement JWT authentication with short-lived tokens and refresh token rotation:

```python
# jwt_auth.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os

app = FastAPI()

# Configuration - use strong, random secret key from environment
SECRET_KEY = os.environ["JWT_SECRET_KEY"]
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15  # Short-lived for security
REFRESH_TOKEN_EXPIRE_DAYS = 7

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a short-lived access token

    Short expiration (15 minutes) limits damage from token theft.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({
        "exp": expire,
        "type": "access",  # Token type for validation
        "iat": datetime.utcnow()  # Issued at time
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict):
    """Create a longer-lived refresh token

    Used to obtain new access tokens without re-authentication.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({
        "exp": expire,
        "type": "refresh",  # Different type from access token
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
        # Decode and validate the token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # Verify this is an access token, not a refresh token
        if payload.get("type") != "access":
            raise credentials_exception

        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception

        # Check if token has been blacklisted (for logout support)
        if await is_token_blacklisted(token):
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    # Fetch user from database
    user = await get_user(username)
    if user is None:
        raise credentials_exception

    return user

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login endpoint - returns access and refresh tokens"""
    # Authenticate user
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        # Generic error message to prevent username enumeration
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate both token types
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

        # Verify this is a refresh token
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

Verify webhook signatures to ensure requests haven't been tampered with:

```python
# request_signing.py
import hmac
import hashlib
import time
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

WEBHOOK_SECRET = os.environ["WEBHOOK_SECRET"]

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify HMAC-SHA256 signature

    Uses constant-time comparison to prevent timing attacks.
    """
    # Compute expected signature
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    # Use constant-time comparison
    return hmac.compare_digest(signature, expected)

@app.post("/webhooks/payment")
async def payment_webhook(request: Request):
    """Verify webhook signature before processing"""
    # Extract signature headers
    signature = request.headers.get("X-Signature")
    timestamp = request.headers.get("X-Timestamp")

    if not signature or not timestamp:
        raise HTTPException(status_code=400, detail="Missing signature headers")

    # Check timestamp to prevent replay attacks
    # Reject requests older than 5 minutes
    if abs(time.time() - int(timestamp)) > 300:
        raise HTTPException(status_code=400, detail="Request too old")

    # Get raw request body
    body = await request.body()

    # Include timestamp in signature verification
    payload_to_verify = f"{timestamp}.{body.decode()}"

    # Verify the signature
    if not verify_signature(payload_to_verify.encode(), signature, WEBHOOK_SECRET):
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Process the verified webhook
    data = await request.json()
    await process_payment_webhook(data)

    return {"status": "processed"}
```

---

## A09: Security Logging

### Security Event Logging

Log security-relevant events for monitoring and incident response:

```python
# security_logging.py
import logging
import json
from datetime import datetime
from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware

# Configure dedicated security logger
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
    """Log security-relevant events in structured JSON format"""
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

        # Log authentication failures (401)
        if response.status_code == 401:
            log_security_event("auth_failure", request)

        # Log authorization failures (403)
        if response.status_code == 403:
            log_security_event("authz_failure", request)

        # Log rate limit violations (429)
        if response.status_code == 429:
            log_security_event("rate_limit_exceeded", request)

        return response

app = FastAPI()
app.add_middleware(SecurityLoggingMiddleware)

# Log successful and failed logins explicitly
@app.post("/login")
async def login(request: Request, credentials: LoginCredentials):
    user = await authenticate(credentials)
    if user:
        # Log successful login with user ID
        log_security_event("login_success", request, user_id=user.id)
        return create_session(user)
    else:
        # Log failed login with attempted username
        log_security_event("login_failure", request, details={
            "username": credentials.username
        })
        raise HTTPException(status_code=401)
```

---

## A10: Server-Side Request Forgery (SSRF)

### SSRF Prevention

Validate and restrict URLs before making server-side requests:

```python
# ssrf_prevention.py
from fastapi import FastAPI, HTTPException
import httpx
import ipaddress
from urllib.parse import urlparse

app = FastAPI()

# Define blocked IP ranges (internal networks)
BLOCKED_RANGES = [
    ipaddress.ip_network("10.0.0.0/8"),      # Private Class A
    ipaddress.ip_network("172.16.0.0/12"),   # Private Class B
    ipaddress.ip_network("192.168.0.0/16"),  # Private Class C
    ipaddress.ip_network("127.0.0.0/8"),     # Loopback
    ipaddress.ip_network("169.254.0.0/16"),  # Link-local
    ipaddress.ip_network("::1/128"),         # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),        # IPv6 private
]

# Restrict to safe schemes and ports
ALLOWED_SCHEMES = ["http", "https"]
ALLOWED_PORTS = [80, 443, 8080, 8443]

def is_safe_url(url: str) -> bool:
    """Validate URL is safe to fetch - prevents SSRF attacks"""
    try:
        parsed = urlparse(url)

        # Check scheme is HTTP or HTTPS
        if parsed.scheme not in ALLOWED_SCHEMES:
            return False

        # Check port is allowed
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        if port not in ALLOWED_PORTS:
            return False

        # Get hostname for validation
        import socket
        hostname = parsed.hostname
        if not hostname:
            return False

        # Block localhost variations
        if hostname in ["localhost", "127.0.0.1", "::1", "0.0.0.0"]:
            return False

        # Resolve hostname and check if IP is in blocked ranges
        try:
            ip = ipaddress.ip_address(socket.gethostbyname(hostname))
            for blocked in BLOCKED_RANGES:
                if ip in blocked:
                    return False
        except socket.gaierror:
            return False  # DNS resolution failed

        return True

    except Exception:
        return False

@app.post("/fetch-url")
async def fetch_external_url(url: str):
    """Safely fetch external URL with SSRF protection"""
    # Validate URL before fetching
    if not is_safe_url(url):
        raise HTTPException(
            status_code=400,
            detail="URL not allowed"
        )

    async with httpx.AsyncClient(
        follow_redirects=False,  # Don't follow redirects automatically
        timeout=10.0
    ) as client:
        response = await client.get(url)

        # Validate redirect targets as well
        if response.is_redirect:
            redirect_url = response.headers.get("location")
            if not is_safe_url(redirect_url):
                raise HTTPException(
                    status_code=400,
                    detail="Redirect URL not allowed"
                )

        # Limit response size to prevent resource exhaustion
        return {"content": response.text[:1000]}
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
