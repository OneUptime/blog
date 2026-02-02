# How to Understand JWT Structure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: JWT, Authentication, Security, Tokens, API

Description: A practical guide to understanding JSON Web Token structure, including the header, payload, and signature components, with code examples for creating and validating JWTs.

---

JSON Web Tokens (JWTs) are everywhere in modern web development. You'll find them in API authentication, single sign-on systems, and stateless session management. But many developers treat JWTs as magic strings without understanding what's actually inside them. This guide breaks down the JWT structure piece by piece so you can work with them confidently.

---

## Table of Contents

1. What is a JWT?
2. The Three Parts of a JWT
3. Header Explained
4. Payload (Claims) Explained
5. Signature Explained
6. How the Parts Connect
7. Creating JWTs in Code
8. Decoding JWTs in Code
9. Validating JWTs
10. Common Mistakes to Avoid
11. When to Use JWTs

---

## 1. What is a JWT?

A JWT is a compact, URL-safe token format defined in RFC 7519. It lets you transmit information between parties as a JSON object in a way that can be verified and trusted.

Here's what a JWT looks like in the wild:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

Looks like gibberish, right? But there's a clear structure here. Notice the two dots separating three sections. Each section is base64url-encoded, and together they form a complete token.

---

## 2. The Three Parts of a JWT

Every JWT consists of three parts separated by dots (`.`):

```
HEADER.PAYLOAD.SIGNATURE
```

Here's a visual breakdown:

```mermaid
flowchart LR
    subgraph JWT["JWT Token"]
        direction LR
        H["Header<br/>(Algorithm + Type)"]
        P["Payload<br/>(Claims/Data)"]
        S["Signature<br/>(Verification)"]
    end
    H --> |"."| P --> |"."| S
```

| Part | Purpose | Encoded? | Can be read by anyone? |
|------|---------|----------|------------------------|
| Header | Describes the token type and signing algorithm | Yes (base64url) | Yes |
| Payload | Contains the claims (data) | Yes (base64url) | Yes |
| Signature | Verifies the token wasn't tampered with | Yes (base64url) | Yes, but can't be forged without the secret |

The first two parts are just encoded, not encrypted. Anyone can decode them and read the contents. The signature is what provides integrity, not confidentiality.

---

## 3. Header Explained

The header is a JSON object that describes how the token is signed. It typically contains two fields:

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

| Field | Description | Common Values |
|-------|-------------|---------------|
| `alg` | Signing algorithm | `HS256`, `HS384`, `HS512`, `RS256`, `RS384`, `RS512`, `ES256`, `ES384`, `ES512` |
| `typ` | Token type | `JWT` |

The `alg` field is critical for security. It tells the receiver which algorithm to use when verifying the signature. The most common algorithms fall into two categories:

**Symmetric (HMAC):**
- `HS256` - HMAC with SHA-256
- `HS384` - HMAC with SHA-384
- `HS512` - HMAC with SHA-512

**Asymmetric (RSA/ECDSA):**
- `RS256` - RSA with SHA-256
- `ES256` - ECDSA with P-256 curve

This code shows how to decode the header from a JWT.

```javascript
// Decode the header from a JWT
const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

// Split the token by dots and grab the first part
const headerBase64 = jwt.split('.')[0];

// Decode from base64url to a string
// Note: atob() works for base64, but JWT uses base64url which replaces + with - and / with _
const headerJson = atob(headerBase64.replace(/-/g, '+').replace(/_/g, '/'));

// Parse the JSON
const header = JSON.parse(headerJson);

console.log(header);
// Output: { alg: 'HS256', typ: 'JWT' }
```

---

## 4. Payload (Claims) Explained

The payload contains the claims, which are statements about the user or additional metadata. Claims are the actual data you're transmitting.

```json
{
  "sub": "1234567890",
  "name": "John Doe",
  "iat": 1516239022,
  "exp": 1516242622,
  "role": "admin"
}
```

Claims come in three types:

### Registered Claims (Predefined)

These are standardized claims defined in the JWT spec:

| Claim | Name | Description |
|-------|------|-------------|
| `iss` | Issuer | Who created the token |
| `sub` | Subject | Who the token is about (usually user ID) |
| `aud` | Audience | Who the token is intended for |
| `exp` | Expiration Time | Unix timestamp when token expires |
| `nbf` | Not Before | Unix timestamp when token becomes valid |
| `iat` | Issued At | Unix timestamp when token was created |
| `jti` | JWT ID | Unique identifier for the token |

### Public Claims

Claims that you define, but should use collision-resistant names (often URIs):

```json
{
  "https://myapp.com/roles": ["admin", "user"],
  "https://myapp.com/tenant_id": "acme-corp"
}
```

### Private Claims

Custom claims agreed upon between parties:

```json
{
  "user_id": 42,
  "role": "admin",
  "permissions": ["read", "write", "delete"]
}
```

Here's how the payload fits in the token lifecycle:

```mermaid
flowchart TD
    A["User Authenticates"] --> B["Server Creates Claims"]
    B --> C["Claims Encoded as Payload"]
    C --> D["JWT Signed & Returned"]
    D --> E["Client Stores JWT"]
    E --> F["Client Sends JWT with Request"]
    F --> G["Server Decodes Payload"]
    G --> H["Server Uses Claims for Authorization"]
```

---

## 5. Signature Explained

The signature is what makes a JWT trustworthy. It ensures the token hasn't been tampered with since it was created.

The signature is created by:

1. Taking the encoded header
2. Concatenating a dot
3. Adding the encoded payload
4. Signing that string with a secret key using the algorithm specified in the header

```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

Here's a diagram showing how signature creation works:

```mermaid
flowchart TB
    H["Encoded Header"] --> C["Concatenate"]
    P["Encoded Payload"] --> C
    C --> |"header.payload"| S["Sign with Secret/Key"]
    A["Algorithm (from header)"] --> S
    K["Secret Key"] --> S
    S --> SIG["Signature"]
```

The signature serves two purposes:

1. **Integrity**: If anyone modifies the header or payload, the signature won't match when verified
2. **Authentication**: Only someone with the secret key can create a valid signature

This is why you should never put sensitive data in a JWT. The payload is readable by anyone who intercepts the token. The signature only prevents modification, not snooping.

---

## 6. How the Parts Connect

Let's walk through creating a complete JWT step by step.

This code demonstrates the complete JWT creation process using Node.js and the crypto module.

```javascript
const crypto = require('crypto');

// Step 1: Create the header
const header = {
  alg: 'HS256',
  typ: 'JWT'
};

// Step 2: Create the payload with claims
const payload = {
  sub: '1234567890',
  name: 'John Doe',
  role: 'admin',
  iat: Math.floor(Date.now() / 1000),           // Current time
  exp: Math.floor(Date.now() / 1000) + 3600     // Expires in 1 hour
};

// Step 3: Base64url encode both parts
// Regular base64 uses + and /, but URLs don't like those
// Base64url replaces + with - and / with _
function base64UrlEncode(obj) {
  const json = JSON.stringify(obj);
  const base64 = Buffer.from(json).toString('base64');
  // Convert base64 to base64url by replacing characters and removing padding
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

const encodedHeader = base64UrlEncode(header);
const encodedPayload = base64UrlEncode(payload);

// Step 4: Create the signature input
const signatureInput = `${encodedHeader}.${encodedPayload}`;

// Step 5: Sign with HMAC-SHA256
const secret = 'your-256-bit-secret';
const signature = crypto
  .createHmac('sha256', secret)
  .update(signatureInput)
  .digest('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '');

// Step 6: Combine all parts
const jwt = `${encodedHeader}.${encodedPayload}.${signature}`;

console.log('Complete JWT:');
console.log(jwt);
```

Running this produces something like:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzA2ODg0ODAwLCJleHAiOjE3MDY4ODg0MDB9.abc123signature...
```

---

## 7. Creating JWTs in Code

In practice, you'll use a library instead of implementing JWT creation yourself. Here are examples in popular languages.

### Node.js with jsonwebtoken

```javascript
const jwt = require('jsonwebtoken');

// Your secret key - in production, load from environment variables
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

// Create a token with user data
function createToken(userId, role) {
  const payload = {
    sub: userId,
    role: role,
    // Don't add the timestamps manually - the library handles iat
  };

  const options = {
    expiresIn: '1h',        // Token expires in 1 hour
    issuer: 'myapp.com',    // Who issued this token
    audience: 'myapp-api'   // Who should accept this token
  };

  return jwt.sign(payload, SECRET_KEY, options);
}

// Usage
const token = createToken('user_123', 'admin');
console.log(token);
```

### Python with PyJWT

```python
import jwt
import datetime
import os

# Load secret from environment
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key')

def create_token(user_id: str, role: str) -> str:
    """Create a JWT for the given user."""

    # Calculate expiration time (1 hour from now)
    expiration = datetime.datetime.utcnow() + datetime.timedelta(hours=1)

    payload = {
        'sub': user_id,
        'role': role,
        'iat': datetime.datetime.utcnow(),
        'exp': expiration,
        'iss': 'myapp.com',
        'aud': 'myapp-api'
    }

    # Create and return the token
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    return token

# Usage
token = create_token('user_123', 'admin')
print(token)
```

### Go with golang-jwt

```go
package main

import (
    "fmt"
    "os"
    "time"

    "github.com/golang-jwt/jwt/v5"
)

// Custom claims structure embedding standard claims
type CustomClaims struct {
    Role string `json:"role"`
    jwt.RegisteredClaims
}

func createToken(userID string, role string) (string, error) {
    // Get secret from environment
    secretKey := os.Getenv("JWT_SECRET")
    if secretKey == "" {
        secretKey = "your-secret-key"
    }

    // Create claims with expiration
    claims := CustomClaims{
        Role: role,
        RegisteredClaims: jwt.RegisteredClaims{
            Subject:   userID,
            Issuer:    "myapp.com",
            Audience:  jwt.ClaimStrings{"myapp-api"},
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
        },
    }

    // Create token with claims
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

    // Sign the token with the secret
    signedToken, err := token.SignedString([]byte(secretKey))
    if err != nil {
        return "", err
    }

    return signedToken, nil
}

func main() {
    token, err := createToken("user_123", "admin")
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }
    fmt.Println(token)
}
```

---

## 8. Decoding JWTs in Code

Decoding means reading the claims without verifying the signature. This is useful for debugging or when you just need to peek at the payload.

### Node.js

```javascript
const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// Decode without verification - useful for debugging
// WARNING: Do not trust this data for authorization decisions
const decoded = jwt.decode(token, { complete: true });

console.log('Header:', decoded.header);
// Output: { alg: 'HS256', typ: 'JWT' }

console.log('Payload:', decoded.payload);
// Output: { sub: '1234567890', name: 'John Doe', iat: 1516239022 }
```

### Python

```python
import jwt

token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

# Decode without verification
# Set options to skip verification - only use for debugging
decoded = jwt.decode(token, options={"verify_signature": False})

print(decoded)
# Output: {'sub': '1234567890', 'name': 'John Doe', 'iat': 1516239022}

# Get the header separately
header = jwt.get_unverified_header(token)
print(header)
# Output: {'alg': 'HS256', 'typ': 'JWT'}
```

---

## 9. Validating JWTs

Validation is where security happens. You must verify the signature and check claims before trusting any JWT.

Here's what proper validation looks like:

```mermaid
flowchart TD
    A["Receive JWT"] --> B{"Valid Format?<br/>3 parts, proper encoding"}
    B -->|No| REJECT["Reject Token"]
    B -->|Yes| C{"Signature Valid?"}
    C -->|No| REJECT
    C -->|Yes| D{"Token Expired?<br/>Check exp claim"}
    D -->|Yes| REJECT
    D -->|No| E{"Token Active?<br/>Check nbf claim"}
    E -->|No| REJECT
    E -->|Yes| F{"Issuer Correct?<br/>Check iss claim"}
    F -->|No| REJECT
    F -->|Yes| G{"Audience Correct?<br/>Check aud claim"}
    G -->|No| REJECT
    G -->|Yes| ACCEPT["Accept Token<br/>Extract Claims"]
```

### Node.js Validation

```javascript
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

function validateToken(token) {
  try {
    // verify() checks signature AND standard claims like exp
    const decoded = jwt.verify(token, SECRET_KEY, {
      issuer: 'myapp.com',         // Verify the issuer matches
      audience: 'myapp-api',       // Verify the audience matches
      algorithms: ['HS256']        // Only allow specific algorithms
    });

    return {
      valid: true,
      payload: decoded
    };

  } catch (error) {
    // Different error types for different failures
    if (error.name === 'TokenExpiredError') {
      return { valid: false, error: 'Token has expired' };
    }
    if (error.name === 'JsonWebTokenError') {
      return { valid: false, error: 'Invalid token' };
    }
    if (error.name === 'NotBeforeError') {
      return { valid: false, error: 'Token not yet active' };
    }
    return { valid: false, error: 'Unknown error' };
  }
}

// Express middleware example
function authMiddleware(req, res, next) {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const result = validateToken(token);

  if (!result.valid) {
    return res.status(401).json({ error: result.error });
  }

  // Attach user info to request for downstream handlers
  req.user = result.payload;
  next();
}
```

### Python Validation

```python
import jwt
from functools import wraps
from flask import request, jsonify

SECRET_KEY = 'your-secret-key'

def validate_token(token: str) -> dict:
    """Validate a JWT and return the payload or error."""
    try:
        # decode() verifies signature and checks exp by default
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=['HS256'],      # Only allow specific algorithms
            issuer='myapp.com',        # Verify issuer
            audience='myapp-api'       # Verify audience
        )
        return {'valid': True, 'payload': payload}

    except jwt.ExpiredSignatureError:
        return {'valid': False, 'error': 'Token has expired'}

    except jwt.InvalidIssuerError:
        return {'valid': False, 'error': 'Invalid issuer'}

    except jwt.InvalidAudienceError:
        return {'valid': False, 'error': 'Invalid audience'}

    except jwt.InvalidTokenError as e:
        return {'valid': False, 'error': f'Invalid token: {str(e)}'}


# Flask decorator for protected routes
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')

        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'No token provided'}), 401

        token = auth_header.split(' ')[1]
        result = validate_token(token)

        if not result['valid']:
            return jsonify({'error': result['error']}), 401

        # Make payload available to the route handler
        request.user = result['payload']
        return f(*args, **kwargs)

    return decorated


# Usage
@app.route('/protected')
@require_auth
def protected_route():
    user_id = request.user['sub']
    return jsonify({'message': f'Hello, user {user_id}'})
```

---

## 10. Common Mistakes to Avoid

### Storing Sensitive Data in the Payload

JWTs are not encrypted. Anyone can decode the payload.

```javascript
// BAD - Don't do this
const payload = {
  sub: 'user_123',
  password: 'secret123',           // Never store passwords
  ssn: '123-45-6789',              // No sensitive PII
  credit_card: '4111111111111111'  // No payment data
};

// GOOD - Store only references
const payload = {
  sub: 'user_123',
  role: 'admin',
  permissions: ['read', 'write']
};
```

### Accepting the Algorithm from the Token

The "alg" header attack is a classic JWT vulnerability.

```javascript
// BAD - Trusting the algorithm from the token itself
const decoded = jwt.verify(token, SECRET_KEY);

// GOOD - Explicitly specify allowed algorithms
const decoded = jwt.verify(token, SECRET_KEY, {
  algorithms: ['HS256']  // Only accept this algorithm
});
```

### Using Weak Secrets

```javascript
// BAD - Easy to guess or brute force
const SECRET_KEY = 'secret';
const SECRET_KEY = '12345678';
const SECRET_KEY = 'password';

// GOOD - Use a strong, random secret
// Generate with: openssl rand -base64 32
const SECRET_KEY = 'K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=';
```

### Not Validating Expiration

```javascript
// BAD - Decoding without verification
const payload = jwt.decode(token);
// Now using payload for authorization decisions - dangerous!

// GOOD - Always verify
const payload = jwt.verify(token, SECRET_KEY);
// Expiration is checked automatically by verify()
```

### Making Tokens Live Forever

```javascript
// BAD - No expiration
const token = jwt.sign({ sub: 'user_123' }, SECRET_KEY);

// GOOD - Always set expiration
const token = jwt.sign({ sub: 'user_123' }, SECRET_KEY, {
  expiresIn: '1h'  // or '7d', '30m', etc.
});
```

---

## 11. When to Use JWTs

JWTs are great for some use cases and terrible for others.

### Good Use Cases

| Use Case | Why JWTs Work Well |
|----------|-------------------|
| API authentication | Stateless, can verify without database lookup |
| Single Sign-On (SSO) | Token can be shared across domains |
| Microservices | Services can verify tokens independently |
| Short-lived access tokens | Self-contained expiration |
| Mobile apps | Works well with stateless backends |

### Bad Use Cases

| Use Case | Why JWTs Are Not Ideal |
|----------|------------------------|
| Session management requiring logout | Can't invalidate JWTs without extra infrastructure |
| Storing lots of data | JWTs add overhead to every request |
| Sensitive data storage | JWTs are not encrypted by default |
| Long-lived tokens | Harder to revoke if compromised |

### JWT vs Session Tokens Decision Tree

```mermaid
flowchart TD
    A["Need stateless authentication?"] -->|Yes| B["JWT"]
    A -->|No| C["Need immediate logout/revocation?"]
    C -->|Yes| D["Server-side sessions"]
    C -->|No| E["Either works"]
    B --> F["Consider short expiration<br/>+ refresh tokens"]
    D --> G["Use Redis or DB<br/>for session storage"]
```

---

## Summary

| Concept | Key Points |
|---------|------------|
| Structure | Three base64url-encoded parts: header.payload.signature |
| Header | Contains algorithm (alg) and token type (typ) |
| Payload | Contains claims - registered, public, or private |
| Signature | Created by signing header + payload with a secret |
| Security | JWTs are signed, not encrypted - don't store secrets in them |
| Validation | Always verify signature, expiration, issuer, and audience |

JWTs give you a portable, verifiable way to pass claims between parties. Understanding their structure helps you use them correctly and avoid common security pitfalls. Remember: the payload is readable by anyone, the signature only prevents tampering.

---

*Need to monitor your authentication system and catch issues before users do? [OneUptime](https://oneuptime.com) provides real-time monitoring, alerting, and incident management to keep your APIs and authentication flows running smoothly.*
