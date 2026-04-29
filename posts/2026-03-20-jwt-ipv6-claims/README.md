# How to Handle IPv6 in JWT Token Claims

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: JWT, IPv6, Authentication, Security, API

Description: Include, validate, and use IPv6 client addresses in JWT token claims for IP-binding security and audit trails.

## Why Include IPv6 in JWT Claims?

Including the client's IP address in JWT claims can support:
- **IP binding**: Applications can invalidate tokens if they are used from a different IP
- **Audit trail**: Track which IPv6 address was used during authentication
- **Fraud detection**: Detect token theft by monitoring IP changes

## Creating JWTs with IPv6 Claims

```javascript
// jwt-utils.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const net = require('node:net');

const SECRET_KEY = process.env.JWT_SECRET || 'your-256-bit-secret';

function createToken(userId, clientIP) {
    // Normalize IPv4-mapped IPv6 addresses
    const normalizedIP = normalizeIP(clientIP);

    const payload = {
        sub: userId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        // Custom claims
        client_ip: normalizedIP,
        ip_version: normalizedIP ? (normalizedIP.includes(':') ? 'ipv6' : 'ipv4') : undefined,
        // Hash of IP for privacy (optional)
        ip_hash: normalizedIP
            ? crypto.createHash('sha256').update(normalizedIP).digest('hex').slice(0, 16)
            : undefined,
    };

    return jwt.sign(payload, SECRET_KEY, { algorithm: 'HS256' });
}

function normalizeIP(ip) {
    if (!ip) return null;
    // Convert IPv4-mapped IPv6: ::ffff:192.168.1.1 -> 192.168.1.1
    const ipv4Mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (ipv4Mapped) {
        return ipv4Mapped[1];
    }

    // Canonicalize IPv6 so equivalent forms compare the same way
    if (net.isIPv6(ip)) {
        return new net.SocketAddress({ address: ip, family: 'ipv6', port: 0 }).address;
    }

    return net.isIPv4(ip) ? ip : null;
}

module.exports = { createToken, normalizeIP };
```

## Validating JWT with IP Binding

```javascript
// auth-middleware.js
const jwt = require('jsonwebtoken');
const { normalizeIP } = require('./jwt-utils');

const SECRET_KEY = process.env.JWT_SECRET || 'your-256-bit-secret';

function validateTokenWithIPBinding(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.slice(7);
    const clientIP = normalizeIP(req.socket.remoteAddress);

    try {
        const decoded = jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] });

        // Check IP binding (optional but adds security)
        if (decoded.client_ip && decoded.client_ip !== clientIP) {
            // Log the IP mismatch as a potential security event
            console.warn(`JWT IP mismatch: token=${decoded.client_ip}, request=${clientIP}`);

            // For strict IP binding, reject the token
            // return res.status(401).json({ error: 'Token IP mismatch' });

            // For lenient mode, just log it
        }

        req.user = decoded;
        req.clientIP = clientIP;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

module.exports = { validateTokenWithIPBinding };
```

## Python JWT with IPv6

```python
# jwt_ipv6.py

import jwt
import ipaddress
import time

SECRET_KEY = "your-256-bit-secret"

def create_token(user_id: str, client_ip: str) -> str:
    """Create JWT with IPv6 client address embedded."""
    # Normalize IPv4-mapped IPv6
    normalized_ip = normalize_ip(client_ip)
    is_ipv6 = ":" in normalized_ip

    payload = {
        "sub": user_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
        "client_ip": normalized_ip,
        "ip_version": "ipv6" if is_ipv6 else "ipv4",
    }

    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def normalize_ip(ip: str) -> str:
    """Canonicalize IPv6 and remove IPv4-mapped prefixes."""
    parsed = ipaddress.ip_address(ip)
    if isinstance(parsed, ipaddress.IPv6Address) and parsed.ipv4_mapped:
        return str(parsed.ipv4_mapped)
    return parsed.compressed

def decode_and_validate(token: str, current_ip: str) -> dict:
    """Decode JWT and optionally validate IP."""
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    token_ip = payload.get("client_ip")
    current_normalized = normalize_ip(current_ip)

    if token_ip and token_ip != current_normalized:
        print(f"IP changed: token={token_ip}, current={current_normalized}")
        # Decide whether to reject or just log

    return payload
```

## Testing JWT IPv6 Claims

```bash
# Create a token with IPv6 claim
TOKEN=$(curl -6 -X POST http://[::1]:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test"}' | jq -r '.token')

# Decode and inspect the JWT payload (JWT uses base64url, not plain base64)
python3 - <<'PY' "$TOKEN"
import base64
import json
import sys

payload = sys.argv[1].split(".")[1]
payload += "=" * (-len(payload) % 4)
print(json.dumps(json.loads(base64.urlsafe_b64decode(payload)), indent=2))
PY

# Use the token on an IPv6 endpoint
curl -6 http://[::1]:3000/api/profile \
  -H "Authorization: Bearer $TOKEN"

# To test an IP mismatch, repeat the request from a different client network or host
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor authentication endpoints over IPv6. Set up synthetic monitors that obtain JWTs and validate them, ensuring the IP claim handling works correctly from IPv6 vantage points.

## Conclusion

Including IPv6 addresses in JWT claims can support IP-binding checks and audit capabilities. Normalize IPv4-mapped IPv6 addresses before storing in claims, and canonicalize IPv6 so equivalent representations compare correctly. For strict security, validate that the requesting IP matches the token's `client_ip` claim, but consider logging rather than rejecting for users with dynamic IPv6 addresses.
