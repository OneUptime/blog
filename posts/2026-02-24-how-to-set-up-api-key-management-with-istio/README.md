# How to Set Up API Key Management with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Key, Authentication, Security, EnvoyFilter

Description: How to implement API key validation and management using Istio with custom EnvoyFilter configurations and external authorization.

---

API keys are one of the simplest forms of API authentication. A client includes a key in their request, and the server validates it. While JWT tokens are generally preferred for modern APIs, API keys remain popular because they are easy to implement and understand. Istio does not have built-in API key management, but you can implement it using EnvoyFilter, external authorization, or a combination of both.

## Approach 1: API Key Validation with EnvoyFilter Lua

The simplest approach is validating API keys directly in the Envoy proxy using a Lua filter. Store your valid keys in the filter configuration:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: api-key-validation
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
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inlineCode: |
              -- Valid API keys (in production, use external authorization instead)
              local valid_keys = {
                ["key-abc123"] = {client = "service-a", tier = "premium"},
                ["key-def456"] = {client = "service-b", tier = "standard"},
                ["key-ghi789"] = {client = "service-c", tier = "free"}
              }

              -- Paths that don't require API keys
              local public_paths = {
                ["/health"] = true,
                ["/docs"] = true
              }

              function envoy_on_request(request_handle)
                local path = request_handle:headers():get(":path")

                -- Skip validation for public paths
                for prefix, _ in pairs(public_paths) do
                  if path:sub(1, #prefix) == prefix then
                    return
                  end
                end

                -- Check for API key in header or query parameter
                local api_key = request_handle:headers():get("x-api-key")
                if api_key == nil then
                  -- Try query parameter
                  local query_key = path:match("[?&]api_key=([^&]+)")
                  if query_key then
                    api_key = query_key
                  end
                end

                if api_key == nil then
                  request_handle:respond(
                    {[":status"] = "401",
                     ["content-type"] = "application/json"},
                    '{"error": "Missing API key. Include x-api-key header."}'
                  )
                  return
                end

                local key_info = valid_keys[api_key]
                if key_info == nil then
                  request_handle:respond(
                    {[":status"] = "403",
                     ["content-type"] = "application/json"},
                    '{"error": "Invalid API key."}'
                  )
                  return
                end

                -- Add client info headers for downstream services
                request_handle:headers():add("x-client-id", key_info.client)
                request_handle:headers():add("x-client-tier", key_info.tier)
                -- Remove the API key from headers so it doesn't reach backends
                request_handle:headers():remove("x-api-key")
              end
```

This works for small numbers of keys but does not scale well. The keys are hardcoded in the filter, so updating them requires redeploying the EnvoyFilter.

## Approach 2: External Authorization Service

For production use, an external authorization service is much better. Deploy a service that validates API keys against a database:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-key-auth
  labels:
    app: api-key-auth
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-key-auth
  template:
    metadata:
      labels:
        app: api-key-auth
    spec:
      containers:
        - name: auth
          image: myregistry/api-key-auth:latest
          ports:
            - containerPort: 9001
          env:
            - name: REDIS_URL
              value: "redis://redis:6379"
---
apiVersion: v1
kind: Service
metadata:
  name: api-key-auth
spec:
  selector:
    app: api-key-auth
  ports:
    - port: 9001
      targetPort: 9001
```

Here is a simple example of what the auth service might look like in Go:

```go
package main

import (
    "context"
    "net"
    "google.golang.org/grpc"
    auth "github.com/envoyproxy/go-control-plane/envoy/service/auth/v3"
    "google.golang.org/genproto/googleapis/rpc/status"
    "google.golang.org/grpc/codes"
)

type AuthServer struct{}

func (s *AuthServer) Check(ctx context.Context, req *auth.CheckRequest) (*auth.CheckResponse, error) {
    apiKey := req.Attributes.Request.Http.Headers["x-api-key"]

    if apiKey == "" {
        return &auth.CheckResponse{
            Status: &status.Status{Code: int32(codes.Unauthenticated)},
        }, nil
    }

    // Validate against your database/Redis
    valid, clientInfo := validateAPIKey(apiKey)
    if !valid {
        return &auth.CheckResponse{
            Status: &status.Status{Code: int32(codes.PermissionDenied)},
        }, nil
    }

    return &auth.CheckResponse{
        Status: &status.Status{Code: int32(codes.OK)},
    }, nil
}

func main() {
    lis, _ := net.Listen("tcp", ":9001")
    s := grpc.NewServer()
    auth.RegisterAuthorizationServer(s, &AuthServer{})
    s.Serve(lis)
}
```

Configure Istio to use external authorization:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: api-key-auth
        envoyExtAuthzGrpc:
          service: api-key-auth.default.svc.cluster.local
          port: 9001
          timeout: 3s
```

Apply the authorization policy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ext-api-key-auth
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: CUSTOM
  provider:
    name: api-key-auth
  rules:
    - to:
        - operation:
            paths: ["/api/*"]
```

## Approach 3: API Keys as JWTs

A hybrid approach is to issue API keys that are actually JWTs. This lets you use Istio's built-in JWT validation:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: api-key-jwt
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  jwtRules:
    - issuer: "https://api-keys.example.com"
      jwksUri: "https://api-keys.example.com/.well-known/jwks.json"
      fromHeaders:
        - name: x-api-key
```

The `fromHeaders` field tells Istio to look for the JWT in the `x-api-key` header instead of the standard `Authorization` header. Your key management service issues JWTs that encode client information, rate limit tiers, and permissions.

## Storing API Keys Securely

For the Lua-based approach, instead of hardcoding keys, store them in a Kubernetes Secret and mount them:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: api-keys
  namespace: istio-system
type: Opaque
stringData:
  keys.json: |
    {
      "key-abc123": {"client": "service-a", "tier": "premium"},
      "key-def456": {"client": "service-b", "tier": "standard"}
    }
```

Unfortunately, Lua filters in Envoy cannot directly read files. The external authorization approach is more practical for anything beyond a handful of keys.

## Rate Limiting by API Key

Once you have API key validation working, you can apply different rate limits per key or tier. Using the client tier header injected by the auth service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: tier-rate-limit
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
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inlineCode: |
              function envoy_on_response(response_handle)
                local tier = response_handle:headers():get("x-client-tier")
                if tier == "premium" then
                  response_handle:headers():add("x-rate-limit-limit", "10000")
                elseif tier == "standard" then
                  response_handle:headers():add("x-rate-limit-limit", "1000")
                else
                  response_handle:headers():add("x-rate-limit-limit", "100")
                end
              end
```

## Key Rotation

When you need to rotate API keys, the process depends on your approach:

For external authorization: Update the keys in your database. The auth service picks them up immediately.

For Lua-based validation: Update the EnvoyFilter configuration and apply it. Envoy hot-reloads the configuration without downtime.

For JWT-based keys: Rotate the JWKS endpoint. Old keys remain valid until they expire.

## Testing API Key Validation

```bash
# Request without API key
curl -s -o /dev/null -w "%{http_code}" https://api.example.com/api/v1/users
# Should return 401

# Request with invalid key
curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: invalid" https://api.example.com/api/v1/users
# Should return 403

# Request with valid key
curl -s -H "x-api-key: key-abc123" https://api.example.com/api/v1/users
# Should return 200

# Public path without key
curl -s -o /dev/null -w "%{http_code}" https://api.example.com/health
# Should return 200
```

API key management with Istio requires more setup than a dedicated API gateway, but the external authorization pattern gives you full flexibility. For simple use cases, the Lua filter approach works fine. For anything production-grade, go with the external auth service.
