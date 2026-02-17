# How to Fix 'Claims Missing' JWT Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: JWT, Authentication, Security, Claims, Token Validation, Debugging

Description: Learn how to diagnose and fix JWT claims missing errors with practical debugging techniques and code examples.

---

> JWT claims are the payload data that make tokens useful. When claims are missing, your authentication breaks, access control fails, and users get frustrated. Let us fix that.

This guide covers the common causes of missing JWT claims, how to debug them effectively, and how to implement robust claim validation in your applications.

---

## Understanding JWT Claims

A JWT consists of three parts: header, payload (claims), and signature. Claims are the key-value pairs in the payload that carry information about the user and token.

```mermaid
flowchart LR
    subgraph JWT Structure
        A[Header] --> B[Payload/Claims]
        B --> C[Signature]
    end

    subgraph Claims
        D[Registered Claims]
        E[Public Claims]
        F[Private Claims]
    end

    B --> D
    B --> E
    B --> F
```

### Types of Claims

| Claim Type | Description | Examples |
|------------|-------------|----------|
| **Registered** | Predefined in JWT spec | `iss`, `sub`, `aud`, `exp`, `nbf`, `iat`, `jti` |
| **Public** | Registered in IANA registry | `name`, `email`, `picture` |
| **Private** | Custom application claims | `user_id`, `roles`, `tenant_id` |

---

## Common "Claims Missing" Errors

```mermaid
flowchart TD
    A[Claims Missing Error] --> B{Where is it missing?}
    B --> C[Token Generation]
    B --> D[Token Transmission]
    B --> E[Token Validation]

    C --> C1[Claims not added to payload]
    C --> C2[Wrong signing algorithm]
    C --> C3[Library serialization issue]

    D --> D1[Token truncated]
    D --> D2[Wrong encoding]
    D --> D3[Middleware stripping claims]

    E --> E1[Wrong secret/key]
    E --> E2[Strict validation rejecting]
    E --> E3[Parsing with wrong algorithm]
```

---

## Debugging JWT Claims

### Step 1: Decode the Token

First, examine what is actually in your token. Never decode tokens containing sensitive data on public websites in production.

```python
import jwt
import json
import base64
from datetime import datetime

def decode_jwt_parts(token: str) -> dict:
    """
    Decode JWT parts without verification.
    Useful for debugging only - never use unverified tokens in production.
    """
    parts = token.split('.')

    if len(parts) != 3:
        return {'error': f'Invalid JWT: expected 3 parts, got {len(parts)}'}

    # Decode header
    header_b64 = parts[0]
    # Add padding if needed (JWT uses base64url without padding)
    header_b64 += '=' * (4 - len(header_b64) % 4)
    header = json.loads(base64.urlsafe_b64decode(header_b64))

    # Decode payload
    payload_b64 = parts[1]
    payload_b64 += '=' * (4 - len(payload_b64) % 4)
    payload = json.loads(base64.urlsafe_b64decode(payload_b64))

    # Convert timestamps to readable format
    for claim in ['exp', 'iat', 'nbf']:
        if claim in payload:
            payload[f'{claim}_readable'] = datetime.fromtimestamp(
                payload[claim]
            ).isoformat()

    return {
        'header': header,
        'payload': payload,
        'signature': parts[2][:20] + '...'  # Truncate signature for display
    }


def validate_required_claims(token: str, required_claims: list) -> dict:
    """
    Check if all required claims are present in the token.
    """
    decoded = decode_jwt_parts(token)

    if 'error' in decoded:
        return decoded

    payload = decoded['payload']
    missing = []
    present = []

    for claim in required_claims:
        if claim in payload:
            present.append({
                'claim': claim,
                'value': payload[claim]
            })
        else:
            missing.append(claim)

    return {
        'valid': len(missing) == 0,
        'missing_claims': missing,
        'present_claims': present,
        'all_claims': list(payload.keys())
    }


# Example usage
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

# Decode and inspect
result = decode_jwt_parts(token)
print(json.dumps(result, indent=2))

# Validate required claims
validation = validate_required_claims(token, ['sub', 'email', 'roles'])
print(json.dumps(validation, indent=2))
```

---

## Fixing Token Generation Issues

### Issue: Claims Not Being Added

```python
import jwt
from datetime import datetime, timedelta
from typing import Optional

class JWTGenerator:
    """
    JWT generator with comprehensive claim management.
    """

    def __init__(self, secret_key: str, algorithm: str = 'HS256'):
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.issuer = "myapp.com"
        self.audience = "myapp-users"

    def create_token(
        self,
        user_id: str,
        email: str,
        roles: list,
        custom_claims: Optional[dict] = None,
        expires_in_hours: int = 24
    ) -> str:
        """
        Create a JWT with all required claims.

        Args:
            user_id: Unique identifier for the user
            email: User's email address
            roles: List of user roles
            custom_claims: Additional application-specific claims
            expires_in_hours: Token validity period
        """
        now = datetime.utcnow()

        # Build the payload with registered claims
        payload = {
            # Registered claims (RFC 7519)
            'iss': self.issuer,           # Issuer
            'sub': user_id,                # Subject (user identifier)
            'aud': self.audience,          # Audience
            'exp': now + timedelta(hours=expires_in_hours),  # Expiration
            'nbf': now,                    # Not before
            'iat': now,                    # Issued at
            'jti': self._generate_jti(),   # JWT ID (unique identifier)

            # Public claims
            'email': email,

            # Private/custom claims
            'roles': roles,
        }

        # Add custom claims if provided
        if custom_claims:
            # Prevent overwriting registered claims
            reserved = {'iss', 'sub', 'aud', 'exp', 'nbf', 'iat', 'jti'}
            for key, value in custom_claims.items():
                if key not in reserved:
                    payload[key] = value

        # Generate token
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

        return token

    def _generate_jti(self) -> str:
        """Generate unique JWT ID."""
        import uuid
        return str(uuid.uuid4())


# Common mistake: Not adding claims correctly
# WRONG - Claims added after encoding have no effect
def wrong_way():
    payload = {'sub': '123'}
    token = jwt.encode(payload, 'secret', algorithm='HS256')
    # This does NOTHING - token is already encoded
    payload['email'] = 'user@example.com'
    return token

# CORRECT - Add all claims before encoding
def correct_way():
    payload = {
        'sub': '123',
        'email': 'user@example.com'  # Add before encoding
    }
    token = jwt.encode(payload, 'secret', algorithm='HS256')
    return token
```

### Issue: Claims Serialization Problems

Some claim values may not serialize correctly:

```python
import jwt
import json
from datetime import datetime
from decimal import Decimal
from enum import Enum

class UserRole(Enum):
    ADMIN = "admin"
    USER = "user"

class ClaimSerializer:
    """
    Handles proper serialization of claim values.
    """

    @staticmethod
    def serialize_claims(claims: dict) -> dict:
        """
        Convert claim values to JSON-serializable types.
        """
        serialized = {}

        for key, value in claims.items():
            serialized[key] = ClaimSerializer._serialize_value(value)

        return serialized

    @staticmethod
    def _serialize_value(value):
        """
        Recursively serialize a value to JSON-compatible type.
        """
        if value is None:
            return None

        if isinstance(value, (str, int, float, bool)):
            return value

        if isinstance(value, datetime):
            # Convert to Unix timestamp for JWT
            return int(value.timestamp())

        if isinstance(value, Decimal):
            return float(value)

        if isinstance(value, Enum):
            return value.value

        if isinstance(value, (list, tuple)):
            return [ClaimSerializer._serialize_value(v) for v in value]

        if isinstance(value, dict):
            return {
                k: ClaimSerializer._serialize_value(v)
                for k, v in value.items()
            }

        if hasattr(value, '__dict__'):
            # Convert objects to dict
            return ClaimSerializer._serialize_value(value.__dict__)

        # Fallback to string representation
        return str(value)


# Example: Handling problematic claim values
def create_token_with_complex_claims():
    raw_claims = {
        'sub': '12345',
        'role': UserRole.ADMIN,  # Enum - needs serialization
        'balance': Decimal('99.99'),  # Decimal - needs conversion
        'created_at': datetime.utcnow(),  # datetime - needs timestamp
        'metadata': {
            'nested': UserRole.USER,  # Nested enum
            'count': 42
        }
    }

    # Serialize claims before encoding
    serialized_claims = ClaimSerializer.serialize_claims(raw_claims)

    token = jwt.encode(
        serialized_claims,
        'secret',
        algorithm='HS256'
    )

    return token
```

---

## Fixing Token Validation Issues

### Issue: Wrong Validation Options

```python
import jwt
from jwt.exceptions import InvalidTokenError, MissingRequiredClaimError

class JWTValidator:
    """
    JWT validator with proper claim checking.
    """

    def __init__(self, secret_key: str, algorithm: str = 'HS256'):
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.issuer = "myapp.com"
        self.audience = "myapp-users"

    def validate_token(self, token: str) -> dict:
        """
        Validate token and return claims.
        """
        try:
            # Decode with full validation
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],  # Always specify allowed algorithms
                options={
                    'require': ['exp', 'iat', 'sub'],  # Required claims
                    'verify_exp': True,
                    'verify_iat': True,
                    'verify_aud': True,
                    'verify_iss': True,
                },
                audience=self.audience,
                issuer=self.issuer,
            )

            return {'valid': True, 'payload': payload}

        except MissingRequiredClaimError as e:
            # Specific error for missing required claims
            return {
                'valid': False,
                'error': 'missing_claim',
                'message': str(e),
                'claim': str(e).split("'")[1] if "'" in str(e) else None
            }

        except InvalidTokenError as e:
            return {
                'valid': False,
                'error': 'invalid_token',
                'message': str(e)
            }

    def validate_with_custom_claims(
        self,
        token: str,
        required_claims: list
    ) -> dict:
        """
        Validate token including custom claim requirements.
        """
        # First, basic validation
        result = self.validate_token(token)

        if not result['valid']:
            return result

        payload = result['payload']

        # Check custom required claims
        missing = []
        for claim in required_claims:
            if claim not in payload:
                missing.append(claim)
            elif payload[claim] is None:
                missing.append(f"{claim} (null value)")

        if missing:
            return {
                'valid': False,
                'error': 'missing_claims',
                'missing': missing,
                'present': list(payload.keys())
            }

        return result


# Common validation mistakes

# WRONG - Not specifying required claims
def wrong_validation(token, secret):
    # This accepts tokens even if missing expected claims
    payload = jwt.decode(token, secret, algorithms=['HS256'])
    # Crashes later when accessing missing claim
    user_id = payload['user_id']  # KeyError if missing!

# CORRECT - Specify required claims upfront
def correct_validation(token, secret):
    payload = jwt.decode(
        token,
        secret,
        algorithms=['HS256'],
        options={'require': ['sub', 'email', 'roles']}
    )
    # Safe to access - validation ensures presence
    user_id = payload['sub']
```

### Issue: Algorithm Confusion

```python
def validate_with_algorithm_check(token: str, secret: str) -> dict:
    """
    Validate token with proper algorithm handling.

    Algorithm confusion attacks occur when:
    1. Server accepts 'none' algorithm
    2. Server uses public key as HMAC secret
    """

    # First, check the header without verification
    try:
        header = jwt.get_unverified_header(token)
    except jwt.exceptions.DecodeError:
        return {'valid': False, 'error': 'Invalid token format'}

    # Reject 'none' algorithm
    if header.get('alg', '').lower() == 'none':
        return {'valid': False, 'error': 'Algorithm "none" not allowed'}

    # Only allow expected algorithms
    allowed_algorithms = ['HS256', 'HS384', 'HS512']

    if header.get('alg') not in allowed_algorithms:
        return {
            'valid': False,
            'error': f"Algorithm {header.get('alg')} not allowed"
        }

    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=allowed_algorithms,  # Whitelist only
            options={'require': ['sub', 'exp']}
        )
        return {'valid': True, 'payload': payload}
    except jwt.exceptions.InvalidTokenError as e:
        return {'valid': False, 'error': str(e)}
```

---

## Fixing Transmission Issues

### Issue: Token Truncation

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

def extract_token_safely(request) -> tuple:
    """
    Safely extract JWT from various sources with validation.
    Returns (token, error) tuple.
    """
    token = None
    source = None

    # Check Authorization header first (preferred)
    auth_header = request.headers.get('Authorization', '')

    if auth_header.startswith('Bearer '):
        token = auth_header[7:]  # Remove 'Bearer ' prefix
        source = 'header'

    # Fallback to cookie
    if not token:
        token = request.cookies.get('access_token')
        source = 'cookie'

    # Fallback to query parameter (least preferred)
    if not token:
        token = request.args.get('token')
        source = 'query'

    if not token:
        return None, 'No token provided'

    # Validate token format
    parts = token.split('.')

    if len(parts) != 3:
        return None, f'Invalid token format: expected 3 parts, got {len(parts)}'

    # Check for truncation (common issue with headers/cookies size limits)
    for i, part in enumerate(parts):
        if len(part) < 4:  # Minimum base64 length
            return None, f'Token part {i} appears truncated'

    # Check for common transmission issues
    if token.endswith('...'):
        return None, 'Token appears to be truncated (ends with ...)'

    if '%' in token:
        # URL encoding issue
        from urllib.parse import unquote
        token = unquote(token)

    return token, None


@app.before_request
def validate_token():
    """
    Middleware to validate JWT on protected routes.
    """
    # Skip auth for public routes
    public_routes = ['/health', '/login', '/register']
    if request.path in public_routes:
        return None

    token, error = extract_token_safely(request)

    if error:
        return jsonify({
            'error': 'authentication_failed',
            'message': error,
            'hint': 'Ensure token is sent in Authorization header as "Bearer <token>"'
        }), 401

    # Validate token
    validator = JWTValidator(app.config['JWT_SECRET'])
    result = validator.validate_token(token)

    if not result['valid']:
        return jsonify({
            'error': 'invalid_token',
            'details': result
        }), 401

    # Store claims for route handlers
    request.jwt_claims = result['payload']
```

---

## Claim Validation Patterns

### Pattern: Claim Validators

```python
from typing import Callable, Any
from abc import ABC, abstractmethod

class ClaimValidator(ABC):
    """Base class for claim validators."""

    @abstractmethod
    def validate(self, value: Any) -> tuple:
        """
        Validate a claim value.
        Returns (is_valid, error_message).
        """
        pass

class RequiredClaimValidator(ClaimValidator):
    """Validates that a claim exists and is not null."""

    def validate(self, value: Any) -> tuple:
        if value is None:
            return False, "Claim is required but was null"
        return True, None

class StringClaimValidator(ClaimValidator):
    """Validates string claims."""

    def __init__(self, min_length: int = 0, max_length: int = None,
                 pattern: str = None):
        self.min_length = min_length
        self.max_length = max_length
        self.pattern = pattern

    def validate(self, value: Any) -> tuple:
        if not isinstance(value, str):
            return False, f"Expected string, got {type(value).__name__}"

        if len(value) < self.min_length:
            return False, f"String too short (min {self.min_length})"

        if self.max_length and len(value) > self.max_length:
            return False, f"String too long (max {self.max_length})"

        if self.pattern:
            import re
            if not re.match(self.pattern, value):
                return False, f"String does not match pattern {self.pattern}"

        return True, None

class ListClaimValidator(ClaimValidator):
    """Validates list/array claims."""

    def __init__(self, allowed_values: list = None, min_items: int = 0):
        self.allowed_values = allowed_values
        self.min_items = min_items

    def validate(self, value: Any) -> tuple:
        if not isinstance(value, list):
            return False, f"Expected list, got {type(value).__name__}"

        if len(value) < self.min_items:
            return False, f"List must have at least {self.min_items} items"

        if self.allowed_values:
            invalid = [v for v in value if v not in self.allowed_values]
            if invalid:
                return False, f"Invalid values: {invalid}"

        return True, None


class JWTClaimValidator:
    """
    Comprehensive JWT claim validator.
    """

    def __init__(self):
        self.validators = {}

    def require(self, claim: str, validator: ClaimValidator = None):
        """Add a required claim with optional validator."""
        self.validators[claim] = validator or RequiredClaimValidator()
        return self

    def validate(self, payload: dict) -> dict:
        """
        Validate all registered claims.
        Returns validation result with detailed errors.
        """
        errors = {}
        validated_claims = {}

        for claim, validator in self.validators.items():
            value = payload.get(claim)

            # Check presence
            if claim not in payload:
                errors[claim] = "Claim is missing"
                continue

            # Run validator
            is_valid, error = validator.validate(value)

            if not is_valid:
                errors[claim] = error
            else:
                validated_claims[claim] = value

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'claims': validated_claims
        }


# Usage example
def validate_user_token(token: str, secret: str) -> dict:
    """
    Validate a user token with specific claim requirements.
    """
    # First decode the token
    try:
        payload = jwt.decode(token, secret, algorithms=['HS256'])
    except jwt.exceptions.InvalidTokenError as e:
        return {'valid': False, 'error': str(e)}

    # Then validate claims
    validator = JWTClaimValidator()
    validator.require('sub', StringClaimValidator(min_length=1))
    validator.require('email', StringClaimValidator(
        pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$'
    ))
    validator.require('roles', ListClaimValidator(
        allowed_values=['admin', 'user', 'guest'],
        min_items=1
    ))

    return validator.validate(payload)
```

---

## Error Response Patterns

```python
from flask import Flask, jsonify
from functools import wraps

def jwt_required(required_claims: list = None):
    """
    Decorator for routes requiring JWT authentication.
    Provides detailed error responses for debugging.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            token, extract_error = extract_token_safely(request)

            if extract_error:
                return jsonify({
                    'error': 'token_extraction_failed',
                    'message': extract_error,
                    'code': 'AUTH001'
                }), 401

            # Decode token
            try:
                payload = jwt.decode(
                    token,
                    current_app.config['JWT_SECRET'],
                    algorithms=['HS256']
                )
            except jwt.ExpiredSignatureError:
                return jsonify({
                    'error': 'token_expired',
                    'message': 'The token has expired',
                    'code': 'AUTH002',
                    'action': 'Please refresh your token or log in again'
                }), 401
            except jwt.InvalidTokenError as e:
                return jsonify({
                    'error': 'token_invalid',
                    'message': str(e),
                    'code': 'AUTH003'
                }), 401

            # Validate required claims
            if required_claims:
                missing = [c for c in required_claims if c not in payload]
                if missing:
                    return jsonify({
                        'error': 'claims_missing',
                        'message': f'Required claims missing: {missing}',
                        'code': 'AUTH004',
                        'missing_claims': missing,
                        'present_claims': list(payload.keys())
                    }), 401

            request.jwt_payload = payload
            return f(*args, **kwargs)

        return decorated_function
    return decorator


# Usage
@app.route('/api/admin/users')
@jwt_required(required_claims=['sub', 'email', 'roles'])
def list_users():
    """Admin endpoint requiring specific claims."""
    claims = request.jwt_payload

    if 'admin' not in claims.get('roles', []):
        return jsonify({
            'error': 'insufficient_permissions',
            'message': 'Admin role required',
            'code': 'AUTH005'
        }), 403

    return jsonify({'users': get_all_users()})
```

---

## Debugging Checklist

```mermaid
flowchart TD
    A[Claims Missing Error] --> B[Decode token without verification]
    B --> C{All expected claims present?}

    C -->|No| D[Check token generation code]
    D --> D1[Verify claims added before encoding]
    D --> D2[Check serialization of complex types]
    D --> D3[Verify no claims overwritten]

    C -->|Yes| E[Check transmission]
    E --> E1[Verify Authorization header format]
    E --> E2[Check for truncation]
    E --> E3[Verify encoding/decoding]

    E --> F[Check validation code]
    F --> F1[Verify correct secret/key]
    F --> F2[Check algorithm settings]
    F --> F3[Review claim requirements]
```

---

## Complete Debugging Script

```python
#!/usr/bin/env python3
"""
JWT Claims Debugging Script

Usage: python debug_jwt.py <token> [secret]
"""

import sys
import json
import jwt
import base64
from datetime import datetime

def debug_jwt(token: str, secret: str = None):
    """
    Comprehensive JWT debugging.
    """
    print("=" * 60)
    print("JWT Claims Debugger")
    print("=" * 60)

    # 1. Basic structure check
    print("\n[1] Structure Analysis")
    parts = token.split('.')
    print(f"    Parts found: {len(parts)} (expected: 3)")

    if len(parts) != 3:
        print("    ERROR: Invalid JWT structure")
        return

    # 2. Decode header
    print("\n[2] Header")
    try:
        header_padded = parts[0] + '=' * (4 - len(parts[0]) % 4)
        header = json.loads(base64.urlsafe_b64decode(header_padded))
        print(f"    Algorithm: {header.get('alg')}")
        print(f"    Type: {header.get('typ')}")
        print(f"    Full header: {json.dumps(header, indent=4)}")
    except Exception as e:
        print(f"    ERROR decoding header: {e}")
        return

    # 3. Decode payload
    print("\n[3] Payload (Claims)")
    try:
        payload_padded = parts[1] + '=' * (4 - len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_padded))

        print("    Registered claims:")
        registered = ['iss', 'sub', 'aud', 'exp', 'nbf', 'iat', 'jti']
        for claim in registered:
            if claim in payload:
                value = payload[claim]
                if claim in ['exp', 'nbf', 'iat']:
                    dt = datetime.fromtimestamp(value)
                    print(f"      {claim}: {value} ({dt.isoformat()})")
                else:
                    print(f"      {claim}: {value}")
            else:
                print(f"      {claim}: NOT PRESENT")

        print("\n    Custom claims:")
        custom = {k: v for k, v in payload.items() if k not in registered}
        if custom:
            for key, value in custom.items():
                print(f"      {key}: {value}")
        else:
            print("      (none)")

        # Check for null values
        null_claims = [k for k, v in payload.items() if v is None]
        if null_claims:
            print(f"\n    WARNING: Claims with null values: {null_claims}")

    except Exception as e:
        print(f"    ERROR decoding payload: {e}")
        return

    # 4. Verify signature (if secret provided)
    print("\n[4] Signature Verification")
    if not secret:
        print("    SKIPPED (no secret provided)")
    else:
        try:
            verified_payload = jwt.decode(
                token,
                secret,
                algorithms=[header.get('alg', 'HS256')]
            )
            print("    SUCCESS: Signature valid")
        except jwt.ExpiredSignatureError:
            print("    WARNING: Token has expired (signature is valid)")
        except jwt.InvalidSignatureError:
            print("    ERROR: Invalid signature (wrong secret?)")
        except jwt.InvalidTokenError as e:
            print(f"    ERROR: {e}")

    # 5. Token age and expiry
    print("\n[5] Token Timing")
    now = datetime.utcnow().timestamp()

    if 'iat' in payload:
        age = now - payload['iat']
        print(f"    Age: {age:.0f} seconds ({age/3600:.1f} hours)")

    if 'exp' in payload:
        remaining = payload['exp'] - now
        if remaining > 0:
            print(f"    Expires in: {remaining:.0f} seconds ({remaining/3600:.1f} hours)")
        else:
            print(f"    EXPIRED: {abs(remaining):.0f} seconds ago")

    print("\n" + "=" * 60)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python debug_jwt.py <token> [secret]")
        sys.exit(1)

    token = sys.argv[1]
    secret = sys.argv[2] if len(sys.argv) > 2 else None
    debug_jwt(token, secret)
```

---

## Summary

When facing "claims missing" JWT errors:

1. **Decode first** - Use debugging tools to see what is actually in the token
2. **Check generation** - Ensure all claims are added before encoding
3. **Verify transmission** - Look for truncation, encoding issues, or middleware interference
4. **Review validation** - Confirm correct secret, algorithm, and claim requirements
5. **Handle serialization** - Complex types need proper conversion before encoding

The most common causes are:
- Claims added after token encoding (too late)
- Wrong secret or algorithm during validation
- Token truncation in headers or cookies
- Null values being treated as missing

Always implement proper error handling that tells you exactly which claims are missing and why validation failed.
