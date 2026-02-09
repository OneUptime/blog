# How to Implement Kong JWT Authentication Plugin for API Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kong, JWT, API Security

Description: Learn how to configure Kong's JWT authentication plugin to secure APIs with JSON Web Tokens, implementing stateless authentication that scales horizontally while maintaining security.

---

JSON Web Tokens provide a stateless authentication mechanism ideal for distributed API architectures. Kong's JWT plugin validates tokens at the gateway layer, offloading authentication from backend services and enabling centralized security policy enforcement. This approach scales horizontally without shared session state while maintaining strong security guarantees.

## Understanding JWT Authentication Flow

The JWT authentication pattern works as follows:

1. Client obtains JWT from authentication service (login endpoint)
2. Client includes JWT in Authorization header for subsequent requests
3. Kong validates JWT signature and claims without contacting upstream
4. Valid requests are proxied to backend with consumer identity context
5. Invalid or expired tokens receive immediate 401 response

This stateless design means Kong nodes don't need to share session data or query databases for each request, enabling unlimited horizontal scaling.

## Deploying Kong with JWT Plugin

First, ensure Kong Ingress Controller is running:

```bash
helm install kong kong/kong \
  --namespace kong \
  --create-namespace \
  --set ingressController.enabled=true \
  --set ingressController.installCRDs=true
```

Create a Kong consumer to represent API clients:

```yaml
# jwt-consumer.yaml
apiVersion: configuration.konghq.com/v1
kind: KongConsumer
metadata:
  name: mobile-app
  namespace: default
  annotations:
    kubernetes.io/ingress.class: kong
username: mobile-app
custom_id: "mobile-app-v1"
```

Apply the consumer:

```bash
kubectl apply -f jwt-consumer.yaml
```

## Configuring JWT Credentials

Create JWT credentials for the consumer. Kong needs to know the public key or shared secret to verify tokens:

```yaml
# jwt-credential.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mobile-app-jwt-secret
  namespace: default
  labels:
    konghq.com/credential: jwt
stringData:
  kongCredType: jwt
  key: "mobile-app-key"  # JWT issuer identifier
  algorithm: RS256
  rsa_public_key: |
    -----BEGIN PUBLIC KEY-----
    MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xfn/ygWz
    vl4qNyqZhx7RI3aHwJGWVCDWfC4nqPpLpF4yJYJOY0bRkqBD2mYFCr8VN7p8u3qf
    Example_Public_Key_Content_Here_Replace_With_Real_Key
    -----END PUBLIC KEY-----
  # For HMAC algorithms, use 'secret' instead:
  # algorithm: HS256
  # secret: your-shared-secret-here
---
# Link credential to consumer
apiVersion: v1
kind: Secret
metadata:
  name: mobile-app-jwt-secret
  namespace: default
  annotations:
    konghq.com/consumer: mobile-app
```

For symmetric algorithms (HS256), use shared secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: web-app-jwt-secret
  namespace: default
  labels:
    konghq.com/credential: jwt
  annotations:
    konghq.com/consumer: web-app
stringData:
  kongCredType: jwt
  key: "web-app-key"
  algorithm: HS256
  secret: "super-secret-shared-key-minimum-32-characters"
```

Apply credentials:

```bash
kubectl apply -f jwt-credential.yaml
```

## Enabling JWT Plugin on Routes

Create a JWT plugin and attach it to an Ingress:

```yaml
# jwt-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: jwt-auth
  namespace: default
config:
  # URI parameter names to check for token
  uri_param_names:
  - jwt
  # Cookie names to check for token
  cookie_names:
  - jwt-token
  # Header names (default is Authorization)
  header_names:
  - Authorization
  # Claims to verify
  claims_to_verify:
  - exp  # Expiration time
  - nbf  # Not before time
  # Key claim name (identifies which credential to use)
  key_claim_name: iss
  # Allow tokens from anonymous consumers
  anonymous: false
  # Run even if authentication fails (for optional auth)
  run_on_preflight: true
plugin: jwt
---
# protected-api-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: protected-api
  namespace: default
  annotations:
    konghq.com/plugins: jwt-auth
spec:
  ingressClassName: kong
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /protected
        pathType: Prefix
        backend:
          service:
            name: backend-api
            port:
              number: 8080
```

Apply the configuration:

```bash
kubectl apply -f jwt-plugin.yaml
```

## Generating JWT Tokens

Create a script to generate valid JWTs for testing:

```python
#!/usr/bin/env python3
# generate-jwt.py

import jwt
import datetime
import sys

def generate_jwt(key, algorithm, secret_or_private_key):
    """Generate a JWT token for Kong authentication"""

    payload = {
        'iss': key,  # Must match the 'key' in JWT credential
        'sub': 'mobile-app',  # Subject (user identifier)
        'aud': 'api.example.com',  # Audience
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1),  # Expires in 1 hour
        'nbf': datetime.datetime.utcnow(),  # Not before now
        'iat': datetime.datetime.utcnow(),  # Issued at
        'jti': 'unique-token-id-12345',  # JWT ID
        # Custom claims
        'user_id': '12345',
        'roles': ['user', 'premium']
    }

    if algorithm.startswith('HS'):
        # Symmetric HMAC algorithm
        token = jwt.encode(payload, secret_or_private_key, algorithm=algorithm)
    else:
        # Asymmetric RSA/ECDSA algorithm
        token = jwt.encode(payload, secret_or_private_key, algorithm=algorithm)

    return token

# Example usage
if __name__ == '__main__':
    # For HS256 (symmetric)
    token_hs256 = generate_jwt(
        key='web-app-key',
        algorithm='HS256',
        secret_or_private_key='super-secret-shared-key-minimum-32-characters'
    )
    print("HS256 Token:")
    print(token_hs256)

    # For RS256 (asymmetric), you'd use:
    # with open('private_key.pem', 'r') as f:
    #     private_key = f.read()
    # token_rs256 = generate_jwt(
    #     key='mobile-app-key',
    #     algorithm='RS256',
    #     secret_or_private_key=private_key
    # )
```

Generate a token:

```bash
python3 generate-jwt.py
```

## Testing JWT Authentication

Test the protected endpoint without authentication:

```bash
# Get Kong proxy address
KONG_PROXY=$(kubectl get svc kong-proxy -n kong -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Request without token (should fail with 401)
curl -i http://${KONG_PROXY}/protected \
  -H "Host: api.example.com"

# Response: HTTP/1.1 401 Unauthorized
# {"message":"Unauthorized"}
```

Test with valid JWT:

```bash
# Request with JWT token
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -i http://${KONG_PROXY}/protected \
  -H "Host: api.example.com" \
  -H "Authorization: Bearer ${JWT_TOKEN}"

# Response: HTTP/1.1 200 OK
# (Backend service response)
```

## Advanced JWT Configuration

Configure multiple accepted issuers:

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: jwt-multi-issuer
  namespace: default
config:
  claims_to_verify:
  - exp
  - nbf
  # Accept tokens with any of these issuers
  key_claim_name: iss
  # Maximum allowed clock skew for exp/nbf validation
  maximum_expiration: 3600  # 1 hour max token lifetime
plugin: jwt
```

Create multiple credentials for different clients:

```yaml
# Multiple JWT credentials for one consumer
apiVersion: v1
kind: Secret
metadata:
  name: mobile-app-jwt-prod
  namespace: default
  labels:
    konghq.com/credential: jwt
  annotations:
    konghq.com/consumer: mobile-app
stringData:
  kongCredType: jwt
  key: "mobile-app-prod-key"
  algorithm: HS256
  secret: "production-secret-key"
---
apiVersion: v1
kind: Secret
metadata:
  name: mobile-app-jwt-dev
  namespace: default
  labels:
    konghq.com/credential: jwt
  annotations:
    konghq.com/consumer: mobile-app
stringData:
  kongCredType: jwt
  key: "mobile-app-dev-key"
  algorithm: HS256
  secret: "development-secret-key"
```

## Extracting Consumer Identity in Backend

Kong forwards consumer information to upstream services in headers:

```
X-Consumer-ID: <consumer_uuid>
X-Consumer-Custom-ID: mobile-app-v1
X-Consumer-Username: mobile-app
X-Credential-Identifier: mobile-app-key
X-Anonymous-Consumer: false
```

Access these headers in your backend:

```go
// Go backend example
func protectedHandler(w http.ResponseWriter, r *http.Request) {
    consumerID := r.Header.Get("X-Consumer-ID")
    consumerName := r.Header.Get("X-Consumer-Username")

    log.Printf("Request from consumer: %s (ID: %s)", consumerName, consumerID)

    // Use consumer identity for authorization logic
    if consumerName == "mobile-app" {
        // Grant mobile app specific access
    }
}
```

## Combining JWT with Rate Limiting

Apply different rate limits per consumer:

```yaml
# Consumer-specific rate limit
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limit-by-consumer
  namespace: default
config:
  minute: 1000
  hour: 10000
  policy: redis
  redis:
    host: redis.default.svc.cluster.local
    port: 6379
  limit_by: consumer  # Rate limit per authenticated consumer
plugin: rate-limiting
---
# Apply both JWT and rate limiting
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: protected-with-limits
  namespace: default
  annotations:
    konghq.com/plugins: jwt-auth, rate-limit-by-consumer
spec:
  ingressClassName: kong
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend-api
            port:
              number: 8080
```

## JWT Validation Logging

Enable detailed JWT validation logging for debugging:

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: jwt-debug
  namespace: default
config:
  claims_to_verify:
  - exp
  run_on_preflight: true
  # Log level in Kong for this plugin
  # Check Kong logs for validation details
plugin: jwt
```

View logs:

```bash
kubectl logs -n kong -l app=kong --tail=100 -f | grep jwt
```

## Handling Token Expiration

Implement token refresh logic in clients:

```javascript
// JavaScript client example
async function makeAuthenticatedRequest(url) {
    let token = localStorage.getItem('jwt_token');
    let tokenExpiry = localStorage.getItem('jwt_expiry');

    // Check if token is expired
    if (Date.now() >= tokenExpiry * 1000) {
        // Refresh token
        token = await refreshToken();
        localStorage.setItem('jwt_token', token);
    }

    return fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
}

async function refreshToken() {
    const response = await fetch('https://auth.example.com/refresh', {
        method: 'POST',
        credentials: 'include'  // Send refresh token cookie
    });
    const data = await response.json();
    return data.access_token;
}
```

## Security Best Practices

**Use asymmetric algorithms for production** - RS256/ES256 prevent token forgery since private keys never leave the issuer.

**Set short expiration times** - Tokens should expire within hours, not days. Use refresh tokens for long-lived sessions.

**Validate all required claims** - Always verify exp, nbf, and aud claims to prevent misuse.

**Rotate signing keys regularly** - Implement key rotation schedules and support multiple active keys during transitions.

**Never log tokens** - JWTs are bearer tokens; logging them creates security vulnerabilities.

**Use HTTPS exclusively** - JWT authentication over HTTP exposes tokens to interception.

**Implement token revocation** - For critical scenarios, maintain a revocation list or use short-lived tokens with refresh mechanisms.

## Monitoring JWT Authentication

Track authentication metrics:

```yaml
# Add Prometheus plugin
apiVersion: configuration.konghq.com/v1
kind: KongClusterPlugin
metadata:
  name: prometheus
config:
  per_consumer: true
plugin: prometheus
```

Query authentication failures:

```promql
# Prometheus query for JWT auth failures
rate(kong_http_status{code="401"}[5m])

# Per-consumer request rates
sum(rate(kong_http_requests_total[5m])) by (consumer)
```

## Conclusion

Kong's JWT plugin provides robust, scalable authentication for API gateways. By validating tokens at the gateway layer, you offload authentication from backend services and enforce consistent security policies across all APIs. The stateless nature of JWT authentication enables horizontal scaling without session affinity or shared state, making it ideal for cloud-native architectures. Combined with rate limiting, consumer management, and monitoring, Kong's JWT plugin delivers enterprise-grade API security with operational simplicity.
