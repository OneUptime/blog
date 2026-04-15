# How to Use Dapr Cryptography with JSON Web Key Sets (JWKS)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cryptography, JWKS, JWT, Key Management, Security, JSON Web Key

Description: Learn how to configure Dapr Cryptography with JSON Web Key Sets (JWKS) as the key provider, enabling standards-based key distribution for encryption and signing operations.

---

## What Are JSON Web Key Sets?

JSON Web Key Sets (JWKS) is a standard (RFC 7517) for representing cryptographic keys in JSON format. A JWKS endpoint serves a set of public keys that clients can use to verify signatures or encrypt data. Dapr supports JWKS as a cryptography key provider, enabling you to use keys distributed via a JWKS URL or a local JWKS file.

## When to Use JWKS with Dapr Cryptography

JWKS is a good choice when:
- You already have a JWKS endpoint (from an identity provider like Auth0, Okta, or Keycloak)
- You want to share public keys across multiple services without a centralized vault
- You need to verify JWT tokens or signatures using their issuer's public keys

## Component Configuration: JWKS URL

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: jwks-crypto
spec:
  type: crypto.dapr.jwks
  version: v1
  metadata:
  - name: jwks
    value: "https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys"
  - name: requestTimeout
    value: "10s"
  - name: minRefreshInterval
    value: "1h"
```

## Component Configuration: Local JWKS File

For development or private key scenarios:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: jwks-local-crypto
spec:
  type: crypto.dapr.jwks
  version: v1
  metadata:
  - name: jwks
    value: |
      {
        "keys": [
          {
            "kty": "RSA",
            "kid": "my-signing-key-2026",
            "use": "sig",
            "alg": "RS256",
            "n": "...",
            "e": "AQAB"
          }
        ]
      }
```

## Generating a JWK Key Pair

```bash
# Generate RSA private key
openssl genrsa -out private.pem 2048

# Extract public key
openssl rsa -in private.pem -pubout -out public.pem

# Convert to JWK format using a tool like jwk-cli
npm install -g node-jose-tools
jose newkey --type RSA --size 2048 --use sig --alg RS256 --kid my-key-2026 > keypair.json
```

## Hosting Your Own JWKS Endpoint

```python
from flask import Flask, jsonify
import json

app = Flask(__name__)

# Load public keys (never expose private keys here)
with open("public_keys.jwks.json") as f:
    jwks = json.load(f)

@app.route("/.well-known/jwks.json")
def get_jwks():
    return jsonify(jwks)

if __name__ == "__main__":
    app.run(port=8080)
```

## Encrypting Data with Dapr and JWKS

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._crypto import EncryptOptions

def encrypt_payload(data: bytes, key_id: str = "my-signing-key-2026") -> bytes:
    with DaprClient() as d:
        encrypted = d.encrypt(
            data=data,
            options=EncryptOptions(
                component_name="jwks-local-crypto",
                key_name=key_id,
                key_wrap_algorithm="RSA-OAEP-256",
            ),
        )
        return encrypted.read()
```

## Verifying with the Public JWKS Endpoint

```python
import jwt
import requests

def verify_token(token: str, jwks_url: str, audience: str) -> dict:
    # Fetch JWKS
    jwks = requests.get(jwks_url).json()

    # Decode token header to get key ID
    unverified = jwt.get_unverified_header(token)
    kid = unverified["kid"]

    # Find matching key
    key_data = next((k for k in jwks["keys"] if k["kid"] == kid), None)
    if not key_data:
        raise ValueError(f"Key ID {kid} not found in JWKS")

    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key_data)
    return jwt.decode(token, public_key, algorithms=["RS256"], audience=audience)
```

## Using JWKS for Service-to-Service Token Verification

```go
package main

import (
    "context"
    "io"
    "bytes"
    dapr "github.com/dapr/go-sdk/client"
)

func verifyServiceToken(token []byte) ([]byte, error) {
    client, _ := dapr.NewClient()
    defer client.Close()

    // Use Dapr to decrypt/verify using JWKS public key
    result, err := client.Decrypt(
        context.Background(),
        bytes.NewReader(token),
        dapr.DecryptOptions{
            ComponentName: "jwks-crypto",
            KeyName:       "service-signing-key",
        },
    )
    if err != nil {
        return nil, err
    }
    return io.ReadAll(result)
}
```

## Key Rotation with JWKS

JWKS supports multiple keys simultaneously, enabling zero-downtime key rotation:

```json
{
  "keys": [
    {
      "kid": "key-2026-q1",
      "kty": "RSA",
      "use": "enc",
      "alg": "RSA-OAEP-256",
      "n": "...",
      "e": "AQAB"
    },
    {
      "kid": "key-2026-q2",
      "kty": "RSA",
      "use": "enc",
      "alg": "RSA-OAEP-256",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

Ciphertexts include the key ID, so Dapr selects the correct key for decryption automatically.

## Summary

Dapr Cryptography with JWKS enables standards-based key distribution for encryption and signing. By hosting a JWKS endpoint or using an existing identity provider's JWKS URL, you get interoperable key management that works across polyglot services and integrates naturally with JWT-based authentication flows.
