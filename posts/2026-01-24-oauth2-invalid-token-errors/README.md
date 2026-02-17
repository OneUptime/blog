# How to Fix 'Invalid Token' OAuth2 Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OAuth2, Authentication, Troubleshooting, Token Errors, Security

Description: Learn how to diagnose and fix common 'Invalid Token' errors in OAuth2 implementations including signature mismatches, audience validation failures, and token format issues.

---

"Invalid Token" errors are among the most common and frustrating issues when working with OAuth2. This guide provides a systematic approach to diagnosing and fixing these errors with practical examples and solutions.

## Common Causes of Invalid Token Errors

```mermaid
mindmap
  root((Invalid Token))
    Signature Issues
      Wrong Secret/Key
      Algorithm Mismatch
      Key Rotation
    Claim Validation
      Wrong Issuer
      Wrong Audience
      Missing Claims
    Token Format
      Malformed JWT
      Wrong Encoding
      Truncated Token
    Time Issues
      Expired Token
      Clock Skew
      Future IAT
```

## Diagnostic Flow

```mermaid
flowchart TD
    A[Invalid Token Error] --> B{Can decode header?}
    B -->|No| C[Token Format Issue]
    B -->|Yes| D{Signature Valid?}
    D -->|No| E[Signature/Key Issue]
    D -->|Yes| F{Claims Valid?}
    F -->|No| G[Claim Validation Issue]
    F -->|Yes| H{Token Fresh?}
    H -->|No| I[Expiration Issue]
    H -->|Yes| J[Check Server Config]

    C --> C1[Check encoding]
    C --> C2[Check for truncation]

    E --> E1[Verify signing key]
    E --> E2[Check algorithm]
    E --> E3[Check key rotation]

    G --> G1[Check issuer]
    G --> G2[Check audience]
    G --> G3[Check required claims]
```

## Token Debugging Utility

```javascript
// token-debugger.js
// Utility to diagnose OAuth2 token issues

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class TokenDebugger {
    constructor() {
        this.issues = [];
    }

    // Main diagnostic function
    diagnose(token, expectedConfig = {}) {
        this.issues = [];

        console.log('=== Token Diagnostic Report ===\n');

        // Step 1: Check basic format
        this.checkFormat(token);

        // Step 2: Decode and inspect header
        const decoded = this.decodeToken(token);
        if (!decoded) {
            return this.generateReport();
        }

        // Step 3: Inspect header
        this.inspectHeader(decoded.header, expectedConfig);

        // Step 4: Inspect payload
        this.inspectPayload(decoded.payload, expectedConfig);

        // Step 5: Check signature if key provided
        if (expectedConfig.secret || expectedConfig.publicKey) {
            this.verifySignature(token, expectedConfig);
        }

        return this.generateReport();
    }

    // Check basic token format
    checkFormat(token) {
        console.log('1. Checking Token Format');
        console.log('------------------------');

        if (!token) {
            this.addIssue('CRITICAL', 'Token is empty or undefined');
            return false;
        }

        // Remove Bearer prefix if present
        if (token.startsWith('Bearer ')) {
            token = token.slice(7);
            console.log('   - Bearer prefix found and removed');
        }

        const parts = token.split('.');
        console.log(`   - Token parts: ${parts.length} (expected: 3)`);

        if (parts.length !== 3) {
            this.addIssue('CRITICAL', `Token has ${parts.length} parts instead of 3`);
            return false;
        }

        // Check each part for valid base64url
        const partNames = ['Header', 'Payload', 'Signature'];
        parts.forEach((part, index) => {
            const isValid = /^[A-Za-z0-9_-]+$/.test(part);
            console.log(`   - ${partNames[index]}: ${isValid ? 'Valid' : 'Invalid'} base64url`);
            if (!isValid) {
                this.addIssue('CRITICAL', `${partNames[index]} contains invalid characters`);
            }
        });

        // Check for common issues
        if (token.includes(' ')) {
            this.addIssue('CRITICAL', 'Token contains spaces - may be truncated or corrupted');
        }

        if (token.includes('+') || token.includes('/')) {
            this.addIssue('WARNING', 'Token contains base64 (not base64url) characters');
        }

        console.log('');
        return this.issues.filter(i => i.severity === 'CRITICAL').length === 0;
    }

    // Decode token without verification
    decodeToken(token) {
        console.log('2. Decoding Token');
        console.log('-----------------');

        try {
            const decoded = jwt.decode(token, { complete: true });

            if (!decoded) {
                this.addIssue('CRITICAL', 'Unable to decode token - invalid JSON');
                return null;
            }

            console.log('   - Successfully decoded token');
            console.log(`   - Header: ${JSON.stringify(decoded.header)}`);
            console.log(`   - Payload claims: ${Object.keys(decoded.payload).join(', ')}`);
            console.log('');

            return decoded;
        } catch (error) {
            this.addIssue('CRITICAL', `Decode error: ${error.message}`);
            return null;
        }
    }

    // Inspect header for issues
    inspectHeader(header, expected) {
        console.log('3. Inspecting Header');
        console.log('--------------------');

        // Check algorithm
        const { alg, typ, kid } = header;
        console.log(`   - Algorithm: ${alg}`);
        console.log(`   - Type: ${typ || 'not set'}`);
        console.log(`   - Key ID: ${kid || 'not set'}`);

        // Algorithm validation
        if (alg === 'none') {
            this.addIssue('CRITICAL', 'Token uses "none" algorithm - unsigned token!');
        }

        if (expected.algorithms && !expected.algorithms.includes(alg)) {
            this.addIssue('ERROR',
                `Algorithm mismatch: token uses ${alg}, expected one of: ${expected.algorithms.join(', ')}`
            );
        }

        // Check for algorithm confusion
        if (expected.expectedAlgorithm) {
            if (alg !== expected.expectedAlgorithm) {
                this.addIssue('ERROR',
                    `Algorithm mismatch: token uses ${alg}, server expects ${expected.expectedAlgorithm}`
                );
            }
        }

        // Key ID check for JWKS
        if (alg.startsWith('RS') || alg.startsWith('ES')) {
            if (!kid) {
                this.addIssue('WARNING',
                    'No key ID (kid) in header - may cause issues with JWKS validation'
                );
            }
        }

        console.log('');
    }

    // Inspect payload claims
    inspectPayload(payload, expected) {
        console.log('4. Inspecting Payload Claims');
        console.log('----------------------------');

        const now = Math.floor(Date.now() / 1000);

        // Check issuer
        if (payload.iss) {
            console.log(`   - Issuer (iss): ${payload.iss}`);
            if (expected.issuer && payload.iss !== expected.issuer) {
                this.addIssue('ERROR',
                    `Issuer mismatch: token has "${payload.iss}", expected "${expected.issuer}"`
                );
            }
        } else {
            console.log('   - Issuer (iss): NOT SET');
            this.addIssue('WARNING', 'No issuer claim in token');
        }

        // Check audience
        if (payload.aud) {
            const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
            console.log(`   - Audience (aud): ${audiences.join(', ')}`);
            if (expected.audience && !audiences.includes(expected.audience)) {
                this.addIssue('ERROR',
                    `Audience mismatch: token has "${audiences.join(', ')}", expected "${expected.audience}"`
                );
            }
        } else {
            console.log('   - Audience (aud): NOT SET');
            if (expected.audience) {
                this.addIssue('WARNING', 'No audience claim in token');
            }
        }

        // Check subject
        if (payload.sub) {
            console.log(`   - Subject (sub): ${payload.sub}`);
        } else {
            console.log('   - Subject (sub): NOT SET');
            this.addIssue('WARNING', 'No subject claim in token');
        }

        // Check expiration
        if (payload.exp) {
            const expDate = new Date(payload.exp * 1000);
            const isExpired = payload.exp < now;
            console.log(`   - Expires (exp): ${expDate.toISOString()} (${isExpired ? 'EXPIRED' : 'valid'})`);

            if (isExpired) {
                const expiredAgo = now - payload.exp;
                this.addIssue('ERROR',
                    `Token expired ${this.formatDuration(expiredAgo)} ago`
                );
            }
        } else {
            console.log('   - Expires (exp): NOT SET');
            this.addIssue('WARNING', 'No expiration claim - token never expires');
        }

        // Check issued at
        if (payload.iat) {
            const iatDate = new Date(payload.iat * 1000);
            const isInFuture = payload.iat > now + 60; // 60 second tolerance
            console.log(`   - Issued At (iat): ${iatDate.toISOString()}`);

            if (isInFuture) {
                this.addIssue('ERROR', 'Token issued in the future - clock skew issue');
            }
        }

        // Check not before
        if (payload.nbf) {
            const nbfDate = new Date(payload.nbf * 1000);
            const notYetValid = payload.nbf > now;
            console.log(`   - Not Before (nbf): ${nbfDate.toISOString()} (${notYetValid ? 'NOT YET VALID' : 'valid'})`);

            if (notYetValid) {
                this.addIssue('ERROR', 'Token not yet valid (nbf claim)');
            }
        }

        console.log('');
    }

    // Verify signature
    verifySignature(token, config) {
        console.log('5. Verifying Signature');
        console.log('----------------------');

        try {
            const options = {
                algorithms: config.algorithms || ['RS256', 'HS256']
            };

            // Don't validate claims, just signature
            options.clockTolerance = 999999999;
            options.ignoreExpiration = true;

            const key = config.secret || config.publicKey;
            jwt.verify(token, key, options);

            console.log('   - Signature: VALID');
        } catch (error) {
            console.log(`   - Signature: INVALID - ${error.message}`);

            if (error.message.includes('invalid signature')) {
                this.addIssue('CRITICAL',
                    'Signature verification failed - wrong key or token was tampered with'
                );
            } else if (error.message.includes('invalid algorithm')) {
                this.addIssue('CRITICAL',
                    'Algorithm not allowed by verification options'
                );
            } else {
                this.addIssue('CRITICAL', `Signature error: ${error.message}`);
            }
        }

        console.log('');
    }

    // Add issue to list
    addIssue(severity, message) {
        this.issues.push({ severity, message });
    }

    // Format duration in human-readable form
    formatDuration(seconds) {
        if (seconds < 60) return `${seconds} seconds`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
        return `${Math.floor(seconds / 86400)} days`;
    }

    // Generate final report
    generateReport() {
        console.log('=== Diagnostic Summary ===\n');

        const critical = this.issues.filter(i => i.severity === 'CRITICAL');
        const errors = this.issues.filter(i => i.severity === 'ERROR');
        const warnings = this.issues.filter(i => i.severity === 'WARNING');

        if (critical.length > 0) {
            console.log('CRITICAL ISSUES:');
            critical.forEach(i => console.log(`  - ${i.message}`));
            console.log('');
        }

        if (errors.length > 0) {
            console.log('ERRORS:');
            errors.forEach(i => console.log(`  - ${i.message}`));
            console.log('');
        }

        if (warnings.length > 0) {
            console.log('WARNINGS:');
            warnings.forEach(i => console.log(`  - ${i.message}`));
            console.log('');
        }

        if (this.issues.length === 0) {
            console.log('No issues found - token appears valid');
        }

        return {
            valid: critical.length === 0 && errors.length === 0,
            issues: this.issues
        };
    }
}

module.exports = { TokenDebugger };
```

## Common Fixes for Invalid Token Errors

### Fix 1: Algorithm Mismatch

```javascript
// Problem: Server expects RS256 but token uses HS256
// This can be a security vulnerability (algorithm confusion attack)

// BAD: Accepting any algorithm
const decoded = jwt.verify(token, publicKey);

// GOOD: Explicitly specify allowed algorithms
const decoded = jwt.verify(token, publicKey, {
    algorithms: ['RS256'] // Only accept RS256
});

// For servers that need to support multiple algorithms
const decoded = jwt.verify(token, getKeyForAlgorithm(header.alg), {
    algorithms: ['RS256', 'ES256'], // Whitelist of allowed algorithms
});

function getKeyForAlgorithm(alg) {
    // Return appropriate key based on algorithm
    if (alg === 'RS256' || alg === 'ES256') {
        return publicKey;
    }
    throw new Error('Unsupported algorithm');
}
```

### Fix 2: Issuer Validation Failure

```javascript
// Problem: Token issuer doesn't match expected value

// Common causes:
// 1. Trailing slash mismatch
// 2. HTTP vs HTTPS
// 3. Different environment URLs

// BAD: Hardcoded issuer that may not match
const decoded = jwt.verify(token, key, {
    issuer: 'https://auth.example.com' // Missing trailing slash
});

// GOOD: Normalize and handle variations
function normalizeIssuer(issuer) {
    // Remove trailing slash for comparison
    return issuer.replace(/\/$/, '').toLowerCase();
}

const expectedIssuers = [
    'https://auth.example.com',
    'https://auth.example.com/',
    process.env.AUTH_ISSUER
].map(normalizeIssuer);

// Verify without issuer check, then validate manually
const decoded = jwt.verify(token, key, { algorithms: ['RS256'] });
const tokenIssuer = normalizeIssuer(decoded.iss || '');

if (!expectedIssuers.includes(tokenIssuer)) {
    throw new Error(`Invalid issuer: ${decoded.iss}`);
}
```

### Fix 3: Audience Validation Failure

```javascript
// Problem: Token audience doesn't match server's expected audience

// Common causes:
// 1. API identifier mismatch
// 2. Multiple audiences
// 3. Environment-specific audiences

// GOOD: Handle multiple valid audiences
const validAudiences = [
    'https://api.example.com',
    'https://staging-api.example.com',
    process.env.API_AUDIENCE
].filter(Boolean);

const decoded = jwt.verify(token, key, {
    algorithms: ['RS256'],
    audience: validAudiences // Accept any of these audiences
});

// For tokens with multiple audiences
function validateAudience(tokenAudience, expected) {
    const audiences = Array.isArray(tokenAudience)
        ? tokenAudience
        : [tokenAudience];

    return audiences.some(aud => expected.includes(aud));
}
```

### Fix 4: Key ID (kid) Not Found

```javascript
// Problem: JWKS doesn't contain the key ID from token header

const jwksClient = require('jwks-rsa');

const client = jwksClient({
    jwksUri: 'https://auth.example.com/.well-known/jwks.json',
    cache: true,
    cacheMaxAge: 600000, // 10 minutes
    rateLimit: true,
    jwksRequestsPerMinute: 10
});

async function getSigningKey(header) {
    try {
        const key = await client.getSigningKey(header.kid);
        return key.getPublicKey();
    } catch (error) {
        if (error.message.includes('Unable to find')) {
            // Key not found - might need to refresh cache
            console.error(`Key ${header.kid} not found in JWKS`);

            // Force cache refresh and retry
            client.getSigningKeys((err, keys) => {
                if (err) {
                    console.error('Failed to refresh JWKS:', err);
                } else {
                    console.log('Available key IDs:', keys.map(k => k.kid));
                }
            });
        }
        throw error;
    }
}
```

### Fix 5: Clock Skew Issues

```javascript
// Problem: Server clock is out of sync, causing iat/exp validation failures

// GOOD: Allow reasonable clock tolerance
const decoded = jwt.verify(token, key, {
    algorithms: ['RS256'],
    clockTolerance: 60, // Allow 60 seconds of clock skew
    clockTimestamp: Math.floor(Date.now() / 1000) // Use current time
});

// For distributed systems, use NTP and add tolerance
const CLOCK_TOLERANCE_SECONDS = 300; // 5 minutes for distributed systems

function validateTimeConstraints(payload) {
    const now = Math.floor(Date.now() / 1000);

    // Check expiration with tolerance
    if (payload.exp && payload.exp + CLOCK_TOLERANCE_SECONDS < now) {
        throw new Error('Token expired');
    }

    // Check not before with tolerance
    if (payload.nbf && payload.nbf - CLOCK_TOLERANCE_SECONDS > now) {
        throw new Error('Token not yet valid');
    }

    // Check issued at with tolerance
    if (payload.iat && payload.iat - CLOCK_TOLERANCE_SECONDS > now) {
        throw new Error('Token issued in the future');
    }
}
```

## Token Validation Error Handler

```javascript
// error-handler.js
// Comprehensive error handling for OAuth2 token validation

class OAuth2ErrorHandler {
    // Map validation errors to appropriate responses
    static handleError(error, req, res) {
        const errorResponse = this.classifyError(error);

        // Log for debugging (but not in production)
        if (process.env.NODE_ENV !== 'production') {
            console.error('Token validation error:', {
                type: errorResponse.type,
                message: error.message,
                token: req.headers.authorization?.substring(0, 50) + '...'
            });
        }

        // Set WWW-Authenticate header as per RFC 6750
        res.setHeader('WWW-Authenticate',
            `Bearer realm="api", error="${errorResponse.error}", error_description="${errorResponse.description}"`
        );

        return res.status(errorResponse.status).json({
            error: errorResponse.error,
            error_description: errorResponse.description,
            error_uri: errorResponse.uri
        });
    }

    static classifyError(error) {
        // JWT library specific errors
        if (error.name === 'TokenExpiredError') {
            return {
                status: 401,
                type: 'expired',
                error: 'invalid_token',
                description: 'The access token has expired',
                uri: 'https://tools.ietf.org/html/rfc6750#section-3.1'
            };
        }

        if (error.name === 'JsonWebTokenError') {
            // Further classify JWT errors
            if (error.message.includes('invalid signature')) {
                return {
                    status: 401,
                    type: 'signature',
                    error: 'invalid_token',
                    description: 'Token signature verification failed',
                    uri: 'https://tools.ietf.org/html/rfc6750#section-3.1'
                };
            }

            if (error.message.includes('jwt malformed')) {
                return {
                    status: 400,
                    type: 'format',
                    error: 'invalid_request',
                    description: 'Token is malformed',
                    uri: 'https://tools.ietf.org/html/rfc6750#section-3.1'
                };
            }

            if (error.message.includes('invalid algorithm')) {
                return {
                    status: 401,
                    type: 'algorithm',
                    error: 'invalid_token',
                    description: 'Token uses an unsupported algorithm',
                    uri: 'https://tools.ietf.org/html/rfc6750#section-3.1'
                };
            }
        }

        if (error.name === 'NotBeforeError') {
            return {
                status: 401,
                type: 'not_before',
                error: 'invalid_token',
                description: 'Token is not yet valid',
                uri: 'https://tools.ietf.org/html/rfc6750#section-3.1'
            };
        }

        // Custom validation errors
        if (error.message.includes('issuer')) {
            return {
                status: 401,
                type: 'issuer',
                error: 'invalid_token',
                description: 'Token issuer is not trusted',
                uri: 'https://tools.ietf.org/html/rfc6750#section-3.1'
            };
        }

        if (error.message.includes('audience')) {
            return {
                status: 401,
                type: 'audience',
                error: 'invalid_token',
                description: 'Token audience does not match',
                uri: 'https://tools.ietf.org/html/rfc6750#section-3.1'
            };
        }

        // Default error
        return {
            status: 401,
            type: 'unknown',
            error: 'invalid_token',
            description: 'Token validation failed',
            uri: 'https://tools.ietf.org/html/rfc6750#section-3.1'
        };
    }
}

module.exports = { OAuth2ErrorHandler };
```

## Python Token Debugger

```python
# token_debugger.py
# Python utility to diagnose OAuth2 token issues

import jwt
import json
import base64
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field


@dataclass
class DiagnosticIssue:
    severity: str  # CRITICAL, ERROR, WARNING
    message: str


@dataclass
class DiagnosticReport:
    valid: bool
    issues: List[DiagnosticIssue] = field(default_factory=list)
    header: Optional[Dict[str, Any]] = None
    payload: Optional[Dict[str, Any]] = None


class TokenDebugger:
    """Diagnose OAuth2 JWT token issues."""

    def __init__(self):
        self.issues: List[DiagnosticIssue] = []

    def diagnose(
        self,
        token: str,
        expected_issuer: Optional[str] = None,
        expected_audience: Optional[str] = None,
        secret_or_key: Optional[str] = None,
        algorithms: List[str] = None
    ) -> DiagnosticReport:
        """
        Diagnose a JWT token and return a report of issues.
        """
        self.issues = []

        print("=== Token Diagnostic Report ===\n")

        # Step 1: Check format
        if not self._check_format(token):
            return DiagnosticReport(valid=False, issues=self.issues)

        # Step 2: Decode token
        decoded = self._decode_token(token)
        if not decoded:
            return DiagnosticReport(valid=False, issues=self.issues)

        header, payload = decoded

        # Step 3: Inspect header
        self._inspect_header(header, algorithms or ["RS256", "HS256"])

        # Step 4: Inspect payload
        self._inspect_payload(payload, expected_issuer, expected_audience)

        # Step 5: Verify signature if key provided
        if secret_or_key:
            self._verify_signature(token, secret_or_key, algorithms)

        # Generate report
        return self._generate_report(header, payload)

    def _check_format(self, token: str) -> bool:
        """Check basic token format."""
        print("1. Checking Token Format")
        print("-" * 24)

        if not token:
            self._add_issue("CRITICAL", "Token is empty or None")
            return False

        # Remove Bearer prefix
        if token.startswith("Bearer "):
            token = token[7:]
            print("   - Bearer prefix found and removed")

        parts = token.split(".")
        print(f"   - Token parts: {len(parts)} (expected: 3)")

        if len(parts) != 3:
            self._add_issue("CRITICAL", f"Token has {len(parts)} parts instead of 3")
            return False

        # Check for truncation
        if " " in token:
            self._add_issue("CRITICAL", "Token contains spaces - may be truncated")

        print()
        return True

    def _decode_token(self, token: str) -> Optional[tuple]:
        """Decode token without verification."""
        print("2. Decoding Token")
        print("-" * 17)

        try:
            # Decode header
            header = jwt.get_unverified_header(token)
            print(f"   - Header: {json.dumps(header)}")

            # Decode payload
            payload = jwt.decode(token, options={"verify_signature": False})
            print(f"   - Payload claims: {', '.join(payload.keys())}")
            print()

            return header, payload

        except jwt.DecodeError as e:
            self._add_issue("CRITICAL", f"Decode error: {str(e)}")
            print()
            return None

    def _inspect_header(self, header: Dict[str, Any], allowed_algorithms: List[str]):
        """Inspect token header."""
        print("3. Inspecting Header")
        print("-" * 20)

        alg = header.get("alg")
        typ = header.get("typ")
        kid = header.get("kid")

        print(f"   - Algorithm: {alg}")
        print(f"   - Type: {typ or 'not set'}")
        print(f"   - Key ID: {kid or 'not set'}")

        if alg == "none":
            self._add_issue("CRITICAL", 'Token uses "none" algorithm - unsigned!')

        if alg not in allowed_algorithms:
            self._add_issue("ERROR",
                f"Algorithm {alg} not in allowed list: {allowed_algorithms}")

        if alg and alg.startswith("RS") and not kid:
            self._add_issue("WARNING", "No key ID (kid) for RS algorithm")

        print()

    def _inspect_payload(
        self,
        payload: Dict[str, Any],
        expected_issuer: Optional[str],
        expected_audience: Optional[str]
    ):
        """Inspect token payload claims."""
        print("4. Inspecting Payload Claims")
        print("-" * 28)

        now = datetime.now(timezone.utc).timestamp()

        # Check issuer
        iss = payload.get("iss")
        if iss:
            print(f"   - Issuer (iss): {iss}")
            if expected_issuer and iss != expected_issuer:
                self._add_issue("ERROR",
                    f'Issuer mismatch: "{iss}" vs expected "{expected_issuer}"')
        else:
            print("   - Issuer (iss): NOT SET")
            self._add_issue("WARNING", "No issuer claim")

        # Check audience
        aud = payload.get("aud")
        if aud:
            audiences = aud if isinstance(aud, list) else [aud]
            print(f"   - Audience (aud): {', '.join(audiences)}")
            if expected_audience and expected_audience not in audiences:
                self._add_issue("ERROR",
                    f'Audience mismatch: expected "{expected_audience}"')
        else:
            print("   - Audience (aud): NOT SET")

        # Check expiration
        exp = payload.get("exp")
        if exp:
            exp_date = datetime.fromtimestamp(exp, timezone.utc)
            is_expired = exp < now
            status = "EXPIRED" if is_expired else "valid"
            print(f"   - Expires (exp): {exp_date.isoformat()} ({status})")

            if is_expired:
                expired_ago = int(now - exp)
                self._add_issue("ERROR", f"Token expired {expired_ago} seconds ago")
        else:
            print("   - Expires (exp): NOT SET")
            self._add_issue("WARNING", "No expiration - token never expires")

        # Check issued at
        iat = payload.get("iat")
        if iat:
            iat_date = datetime.fromtimestamp(iat, timezone.utc)
            print(f"   - Issued At (iat): {iat_date.isoformat()}")

            if iat > now + 60:
                self._add_issue("ERROR", "Token issued in the future - clock skew")

        print()

    def _verify_signature(
        self,
        token: str,
        key: str,
        algorithms: Optional[List[str]]
    ):
        """Verify token signature."""
        print("5. Verifying Signature")
        print("-" * 22)

        try:
            jwt.decode(
                token,
                key,
                algorithms=algorithms or ["RS256", "HS256"],
                options={
                    "verify_exp": False,
                    "verify_iat": False,
                    "verify_nbf": False
                }
            )
            print("   - Signature: VALID")
        except jwt.InvalidSignatureError:
            print("   - Signature: INVALID")
            self._add_issue("CRITICAL", "Signature verification failed")
        except Exception as e:
            print(f"   - Signature: ERROR - {str(e)}")
            self._add_issue("CRITICAL", f"Signature error: {str(e)}")

        print()

    def _add_issue(self, severity: str, message: str):
        """Add an issue to the list."""
        self.issues.append(DiagnosticIssue(severity=severity, message=message))

    def _generate_report(
        self,
        header: Dict[str, Any],
        payload: Dict[str, Any]
    ) -> DiagnosticReport:
        """Generate final diagnostic report."""
        print("=== Diagnostic Summary ===\n")

        critical = [i for i in self.issues if i.severity == "CRITICAL"]
        errors = [i for i in self.issues if i.severity == "ERROR"]
        warnings = [i for i in self.issues if i.severity == "WARNING"]

        if critical:
            print("CRITICAL ISSUES:")
            for issue in critical:
                print(f"  - {issue.message}")
            print()

        if errors:
            print("ERRORS:")
            for issue in errors:
                print(f"  - {issue.message}")
            print()

        if warnings:
            print("WARNINGS:")
            for issue in warnings:
                print(f"  - {issue.message}")
            print()

        if not self.issues:
            print("No issues found - token appears valid")

        is_valid = len(critical) == 0 and len(errors) == 0

        return DiagnosticReport(
            valid=is_valid,
            issues=self.issues,
            header=header,
            payload=payload
        )


# Usage example
if __name__ == "__main__":
    debugger = TokenDebugger()

    # Example token (expired)
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj3UFYzPUVaVF43FmMab6RlaQD8A9V8wFzzht"

    report = debugger.diagnose(
        token,
        expected_issuer="https://auth.example.com",
        expected_audience="https://api.example.com"
    )

    print(f"\nFinal result: {'VALID' if report.valid else 'INVALID'}")
```

## Troubleshooting Checklist

```mermaid
flowchart LR
    subgraph Client Side
        A1[Check token storage]
        A2[Verify token not truncated]
        A3[Check Bearer prefix]
        A4[Verify correct token used]
    end

    subgraph Server Side
        B1[Check signing key]
        B2[Verify algorithm config]
        B3[Check issuer/audience]
        B4[Verify clock sync]
    end

    subgraph Network
        C1[Check TLS/SSL]
        C2[Verify no proxy modification]
        C3[Check header encoding]
    end
```

## Summary

Invalid token errors can stem from many sources including format issues, signature mismatches, claim validation failures, and timing problems. Use the diagnostic tools provided to systematically identify the root cause, then apply the appropriate fix. Always ensure your validation logic handles errors gracefully and provides helpful feedback for debugging while not exposing sensitive information in production environments.
