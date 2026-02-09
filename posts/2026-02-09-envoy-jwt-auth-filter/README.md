# How to use Envoy JWT authentication filter for token validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, JWT, Authentication

Description: Learn how to configure Envoy's JWT authentication filter to validate JSON Web Tokens and implement OAuth2/OIDC authentication at the edge.

---

The JWT authentication filter validates JSON Web Tokens before routing requests to upstream services. This offloads token validation from applications and provides a centralized authentication layer. Envoy can fetch public keys from JWKS endpoints, validate signatures, check expiration, and extract claims for routing decisions.

## Basic JWT Configuration

```yaml
http_filters:
- name: envoy.filters.http.jwt_authn
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.jwt_authn.v3.JwtAuthentication
    providers:
      auth0:
        issuer: https://your-tenant.auth0.com/
        audiences:
        - api.example.com
        remote_jwks:
          http_uri:
            uri: https://your-tenant.auth0.com/.well-known/jwks.json
            cluster: auth0_cluster
            timeout: 5s
          cache_duration: 3600s
        from_headers:
        - name: Authorization
          value_prefix: "Bearer "
    rules:
    - match:
        prefix: "/"
      requires:
        provider_name: auth0
- name: envoy.filters.http.router
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

clusters:
- name: auth0_cluster
  connect_timeout: 5s
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: auth0_cluster
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: your-tenant.auth0.com
              port_value: 443
  transport_socket:
    name: envoy.transport_sockets.tls
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
      sni: your-tenant.auth0.com
```

## Multiple JWT Providers

Support tokens from multiple identity providers:

```yaml
providers:
  auth0:
    issuer: https://your-tenant.auth0.com/
    audiences:
    - api.example.com
    remote_jwks:
      http_uri:
        uri: https://your-tenant.auth0.com/.well-known/jwks.json
        cluster: auth0_cluster
        timeout: 5s
      cache_duration: 3600s
    from_headers:
    - name: Authorization
      value_prefix: "Bearer "

  okta:
    issuer: https://your-tenant.okta.com/oauth2/default
    audiences:
    - api://default
    remote_jwks:
      http_uri:
        uri: https://your-tenant.okta.com/oauth2/default/v1/keys
        cluster: okta_cluster
        timeout: 5s
      cache_duration: 3600s
    from_headers:
    - name: Authorization
      value_prefix: "Bearer "

rules:
- match:
    prefix: "/api/v1"
  requires:
    provider_name: auth0
- match:
    prefix: "/api/v2"
  requires:
    provider_name: okta
```

## Local JWKS Configuration

Use embedded public keys instead of fetching remotely:

```yaml
providers:
  local_provider:
    issuer: https://example.com
    audiences:
    - api.example.com
    local_jwks:
      inline_string: |
        {
          "keys": [
            {
              "kty": "RSA",
              "use": "sig",
              "kid": "1",
              "n": "...",
              "e": "AQAB"
            }
          ]
        }
    from_headers:
    - name: Authorization
      value_prefix: "Bearer "
```

## JWT from Cookie

Extract JWT from cookies:

```yaml
providers:
  cookie_provider:
    issuer: https://example.com
    audiences:
    - web.example.com
    remote_jwks:
      http_uri:
        uri: https://example.com/.well-known/jwks.json
        cluster: jwks_cluster
        timeout: 5s
      cache_duration: 3600s
    from_cookies:
    - "auth_token"
```

## Claim-Based Routing

Extract claims and add them as headers:

```yaml
providers:
  claims_provider:
    issuer: https://example.com
    audiences:
    - api.example.com
    remote_jwks:
      http_uri:
        uri: https://example.com/.well-known/jwks.json
        cluster: jwks_cluster
        timeout: 5s
    forward_payload_header: "x-jwt-payload"
    payload_in_metadata: "jwt_payload"
    from_headers:
    - name: Authorization
      value_prefix: "Bearer "
```

Then use claims in routing:

```yaml
routes:
- match:
    prefix: "/api"
    headers:
    - name: "x-jwt-payload"
      present_match: true
  route:
    cluster: api_service
```

## Optional JWT Authentication

Allow both authenticated and anonymous requests:

```yaml
rules:
- match:
    prefix: "/api/public"
  requires:
    requires_any:
      requirements:
      - provider_name: auth0
      - allow_missing: {}

- match:
    prefix: "/api/private"
  requires:
    provider_name: auth0
```

Public endpoints accept requests with or without JWTs, private endpoints require JWTs.

## Custom Claim Validation

Validate specific JWT claims:

```yaml
providers:
  validated_provider:
    issuer: https://example.com
    audiences:
    - api.example.com
    remote_jwks:
      http_uri:
        uri: https://example.com/.well-known/jwks.json
        cluster: jwks_cluster
        timeout: 5s
    claim_to_headers:
    - header_name: "x-user-id"
      claim_name: "sub"
    - header_name: "x-user-roles"
      claim_name: "roles"
    from_headers:
    - name: Authorization
      value_prefix: "Bearer "
```

## JWKS Caching

Control JWKS caching behavior:

```yaml
remote_jwks:
  http_uri:
    uri: https://example.com/.well-known/jwks.json
    cluster: jwks_cluster
    timeout: 5s
  cache_duration: 7200s
  async_fetch:
    fast_listener: false
```

Cache JWKS for 2 hours to reduce external requests.

## Monitoring JWT Authentication

Track JWT validation metrics:

```promql
# JWT validation attempts
envoy_http_jwt_authn_allowed

# JWT validation failures
envoy_http_jwt_authn_denied

# JWKS fetch success
envoy_cluster_upstream_rq_completed{cluster="jwks_cluster"}
```

## Best Practices

1. Cache JWKS for reasonable durations (1-24 hours)
2. Validate audience and issuer claims
3. Use HTTPS for JWKS endpoints
4. Monitor JWT validation failures
5. Extract and forward relevant claims as headers
6. Implement proper error responses for invalid tokens
7. Consider token expiration in cache duration

## Conclusion

Envoy's JWT authentication filter provides robust token validation at the edge, offloading authentication logic from application code. Configure multiple providers to support different identity systems, extract claims for routing decisions, and cache JWKS to minimize external dependencies. Monitor JWT validation metrics to identify authentication issues and ensure your JWKS caching strategy balances freshness with performance.
