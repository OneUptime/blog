# How to Use Dapr Secrets Management for Service-to-Service Auth

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret Management, Service Authentication, mTLS, Security

Description: Learn how to use Dapr Secrets Management to store and retrieve shared secrets and tokens used for service-to-service authentication in a microservices mesh.

---

Service-to-service authentication is a layered problem in microservices. Dapr handles mutual TLS (mTLS) automatically between Dapr-enabled services, but you may still need to share API tokens, HMAC signing keys, or JWT secrets between services. Dapr Secrets Management provides a clean way to distribute these credentials without hardcoding them.

## mTLS Is Not Enough Alone

Dapr's built-in mTLS ensures encrypted and authenticated transport between sidecars, but application-level auth tokens add an extra layer. For example, when service A calls service B, the transport is secured by mTLS but service B might also validate a shared HMAC signature on the request body.

## Storing Service Auth Tokens

Store shared secrets in your backend with meaningful names:

```bash
# In HashiCorp Vault
vault kv put secret/service-auth \
  order-to-inventory-token="hvs.shared-token-abc123" \
  gateway-to-order-token="hvs.shared-token-def456" \
  hmac-signing-key="base64-encoded-key-here"
```

## Retrieving Auth Tokens in Go

```go
package middleware

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/base64"
    "encoding/hex"
    "io"
    "net/http"
)

func getHMACKey() ([]byte, error) {
    resp, err := http.Get("http://localhost:3500/v1.0/secrets/vault-store/service-auth")
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    // Parse JSON and extract hmac-signing-key
    // ... (omitted for brevity)
    keyB64 := "extracted-key-from-json"
    return base64.StdEncoding.DecodeString(keyB64)
}

func SignRequest(body []byte) (string, error) {
    key, err := getHMACKey()
    if err != nil {
        return "", err
    }
    mac := hmac.New(sha256.New, key)
    mac.Write(body)
    return hex.EncodeToString(mac.Sum(nil)), nil
}
```

## JWT Shared Secret for Service Auth

Store the JWT signing key in Dapr secrets and use it to issue and verify tokens:

```python
import httpx
import jwt
from datetime import datetime, timedelta, timezone

async def get_jwt_secret() -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "http://localhost:3500/v1.0/secrets/vault-store/service-auth"
        )
        return resp.json()["jwt-signing-key"]

async def create_service_token(caller_service: str) -> str:
    secret = await get_jwt_secret()
    payload = {
        "sub": caller_service,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5)
    }
    return jwt.encode(payload, secret, algorithm="HS256")

async def verify_service_token(token: str) -> dict:
    secret = await get_jwt_secret()
    return jwt.decode(token, secret, algorithms=["HS256"])
```

## Using Secrets in Dapr Service Invocation Headers

Inject an auth header when invoking another Dapr service:

```javascript
const { DaprClient, HttpMethod } = require('@dapr/dapr');

const client = new DaprClient();

async function callInventoryService(orderId) {
  const secrets = await client.secret.get('vault-store', 'service-auth');
  const token = secrets['order-to-inventory-token'];

  return client.invoker.invoke(
    'inventory-service',
    'check-stock',
    HttpMethod.POST,
    { orderId },
    { headers: { 'X-Service-Token': token } }
  );
}
```

## Summary

Dapr Secrets Management complements built-in mTLS by providing a secure way to distribute application-level auth tokens, HMAC keys, and JWT secrets between services. Storing these credentials in a centralized backend and fetching them at runtime ensures they are never hardcoded in service configuration while still enabling flexible service-to-service authentication patterns.
