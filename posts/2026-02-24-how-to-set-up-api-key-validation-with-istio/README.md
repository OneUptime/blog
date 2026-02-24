# How to Set Up API Key Validation with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Keys, Authentication, Security, Kubernetes

Description: Implement API key validation in Istio using external authorization, Lua filters, or WASM plugins to secure your APIs with key-based access control.

---

API keys are one of the simplest forms of API authentication. A client includes a key in the request (usually as a header or query parameter), and the server validates it before processing the request. While JWT tokens are better for user authentication, API keys are still widely used for machine-to-machine communication, third-party integrations, and public APIs with usage tracking.

Istio doesn't have built-in API key validation like it does for JWT tokens, but you can implement it using several approaches: external authorization, Lua-based EnvoyFilter, or WASM plugins.

## Approach 1: External Authorization

The most flexible approach is to use Istio's external authorization feature. You deploy a small authorization service that validates API keys, and Istio calls it for every request.

### Deploy the Authorization Service

Here's a simple authorization service that validates API keys against a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-keys
  namespace: istio-system
data:
  keys.json: |
    {
      "keys": {
        "ak_live_abc123def456": {"client": "partner-a", "tier": "premium"},
        "ak_live_ghi789jkl012": {"client": "partner-b", "tier": "standard"},
        "ak_live_mno345pqr678": {"client": "internal", "tier": "unlimited"}
      }
    }
```

Deploy the ext-authz service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ext-authz
  namespace: istio-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ext-authz
  template:
    metadata:
      labels:
        app: ext-authz
    spec:
      containers:
      - name: ext-authz
        image: myregistry/api-key-validator:v1
        ports:
        - containerPort: 9001
          name: grpc
        volumeMounts:
        - name: api-keys
          mountPath: /config
      volumes:
      - name: api-keys
        configMap:
          name: api-keys
---
apiVersion: v1
kind: Service
metadata:
  name: ext-authz
  namespace: istio-system
spec:
  ports:
  - port: 9001
    name: grpc
  selector:
    app: ext-authz
```

### Configure Istio to Use External Authorization

Register the external authorization provider in the Istio mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
    - name: api-key-validator
      envoyExtAuthzGrpc:
        service: ext-authz.istio-system.svc.cluster.local
        port: 9001
        timeout: 2s
```

Create an AuthorizationPolicy that uses the external provider:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ext-authz-api-keys
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: CUSTOM
  provider:
    name: api-key-validator
  rules:
  - to:
    - operation:
        paths: ["/v1/*"]
        notPaths: ["/v1/public/*", "/health"]
```

This sends all requests to `/v1/*` (except public endpoints) through the external authorization service before forwarding to the backend.

## Approach 2: Lua-Based EnvoyFilter

For simpler setups where you have a static list of API keys, you can use a Lua filter directly in Envoy. This avoids deploying a separate service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: api-key-filter
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: GATEWAY
      listener:
        filterChain:
          filter:
            name: "envoy.filters.network.http_connection_manager"
            subFilter:
              name: "envoy.filters.http.router"
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inline_code: |
            -- Valid API keys
            local valid_keys = {
              ["ak_live_abc123def456"] = true,
              ["ak_live_ghi789jkl012"] = true,
              ["ak_live_mno345pqr678"] = true,
            }

            -- Public paths that don't need API keys
            local public_paths = {
              ["/health"] = true,
            }

            function envoy_on_request(request_handle)
              local path = request_handle:headers():get(":path")

              -- Skip auth for public paths
              for prefix, _ in pairs(public_paths) do
                if string.sub(path, 1, #prefix) == prefix then
                  return
                end
              end

              -- Check for API key in header
              local api_key = request_handle:headers():get("x-api-key")

              if api_key == nil then
                request_handle:respond(
                  {[":status"] = "401", ["content-type"] = "application/json"},
                  '{"error": "Missing API key. Include x-api-key header."}'
                )
                return
              end

              if not valid_keys[api_key] then
                request_handle:respond(
                  {[":status"] = "403", ["content-type"] = "application/json"},
                  '{"error": "Invalid API key."}'
                )
                return
              end
            end
```

The Lua approach is simple and has low latency (no external service call), but it has limitations. Updating keys requires updating the EnvoyFilter and waiting for config propagation. It also doesn't scale well to thousands of keys.

## Approach 3: Simple Header Matching

For the simplest possible API key validation (just checking if a known key is present), you can use Istio's built-in AuthorizationPolicy with header matching:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-key-check
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: DENY
  rules:
  - to:
    - operation:
        paths: ["/v1/*"]
        notPaths: ["/v1/public/*", "/health"]
    when:
    - key: request.headers[x-api-key]
      notValues:
      - "ak_live_abc123def456"
      - "ak_live_ghi789jkl012"
      - "ak_live_mno345pqr678"
```

This denies requests that don't have a valid `x-api-key` header. It's the simplest approach but doesn't support features like per-key rate limiting or usage tracking.

To also deny requests with no API key at all, add a separate rule:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-api-key
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: DENY
  rules:
  - to:
    - operation:
        paths: ["/v1/*"]
        notPaths: ["/v1/public/*", "/health"]
    when:
    - key: request.headers[x-api-key]
      notValues: ["*"]
```

## Combining API Keys with JWT

For APIs that support both API keys (for machine clients) and JWT tokens (for user clients), you can use both:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  jwtRules:
  - issuer: "https://auth.example.com"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-jwt-or-apikey
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
  # Allow requests with valid JWT
  - from:
    - source:
        requestPrincipals: ["https://auth.example.com/*"]
    to:
    - operation:
        paths: ["/v1/*"]

  # Allow requests with valid API key
  - to:
    - operation:
        paths: ["/v1/*"]
    when:
    - key: request.headers[x-api-key]
      values:
      - "ak_live_abc123def456"
      - "ak_live_ghi789jkl012"

  # Always allow public endpoints
  - to:
    - operation:
        paths: ["/v1/public/*", "/health"]
```

## Key Rotation

API keys need to be rotated periodically. With the external authorization approach, update the ConfigMap:

```bash
kubectl edit configmap api-keys -n istio-system
```

Add the new key, wait for clients to switch, then remove the old key.

With the header-matching approach, update the AuthorizationPolicy to include both old and new keys during the transition period:

```yaml
when:
- key: request.headers[x-api-key]
  notValues:
  - "ak_live_abc123def456"     # Old key (remove after migration)
  - "ak_live_new_key_here"     # New key
```

## Monitoring API Key Usage

Track which API keys are being used and how often. With the external authorization approach, your authorization service can emit metrics.

With any approach, you can check Envoy access logs:

```bash
kubectl logs -l istio=ingressgateway -n istio-system | grep "x-api-key"
```

Enable access logging that captures the API key header:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: gateway-access-log
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  accessLogging:
  - providers:
    - name: envoy
```

## Security Considerations

A few things to keep in mind with API key validation:

API keys should be treated as secrets. Don't log them in full. If you need to log them for debugging, log only the last 4 characters.

Use HTTPS only. API keys sent over HTTP can be intercepted. Your Gateway should redirect HTTP to HTTPS.

Rate limit per key to prevent abuse. Combine API key validation with the rate limiting approach described in other posts.

Rotate keys regularly and have a process for revoking compromised keys immediately.

Don't embed API keys in client-side code (mobile apps, SPAs). Use them for server-to-server communication where the key can be kept secret.

API key validation with Istio requires a bit more work than JWT authentication since there's no built-in primitive for it, but the external authorization approach gives you full flexibility. You can validate keys against a database, enforce per-key rate limits, track usage, and implement key rotation, all without touching your backend services.
