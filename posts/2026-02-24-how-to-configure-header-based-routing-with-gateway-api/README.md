# How to Configure Header-Based Routing with Gateway API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway API, Routing, Headers, Kubernetes, Traffic Management

Description: Learn how to configure header-based routing with the Kubernetes Gateway API and Istio for canary releases, A/B testing, multi-tenant routing, and feature flag deployments.

---

Header-based routing lets you direct traffic to different backend services based on HTTP request headers. This is one of the most flexible routing mechanisms available, and it powers use cases like canary releases, A/B testing, multi-tenant architectures, and feature flag deployments. With the Kubernetes Gateway API and Istio, header routing is configured through HTTPRoute match rules.

## Basic Header Matching

The simplest form of header-based routing matches on a specific header value:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-routing
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - headers:
      - name: x-version
        value: beta
    backendRefs:
    - name: app-beta
      port: 80
  - backendRefs:
    - name: app-stable
      port: 80
```

Requests with the header `x-version: beta` go to app-beta. Everything else goes to app-stable. The last rule without any matches acts as the default.

## Exact vs Regex Header Matching

The Gateway API supports two types of header matching:

**Exact match (default):**

```yaml
matches:
- headers:
  - type: Exact
    name: x-tenant
    value: acme-corp
```

This matches only when the header value is exactly `acme-corp`.

**Regular expression match:**

```yaml
matches:
- headers:
  - type: RegularExpression
    name: x-tenant
    value: "acme-.*"
```

This matches any header value starting with `acme-` (like `acme-corp`, `acme-inc`, `acme-labs`).

## Multiple Header Conditions (AND Logic)

When you specify multiple headers in a single match, all of them must match (AND logic):

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: multi-header-route
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  rules:
  - matches:
    - headers:
      - name: x-tenant
        value: enterprise
      - name: x-env
        value: canary
    backendRefs:
    - name: enterprise-canary-service
      port: 80
```

Both `x-tenant: enterprise` AND `x-env: canary` must be present for this rule to match.

## Multiple Match Rules (OR Logic)

To create OR conditions, use multiple entries in the matches array:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: or-header-route
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  rules:
  - matches:
    - headers:
      - name: x-team
        value: alpha
    - headers:
      - name: x-team
        value: bravo
    backendRefs:
    - name: special-service
      port: 80
```

Requests with `x-team: alpha` OR `x-team: bravo` are routed to special-service.

## A/B Testing with Headers

Run an A/B test by routing different user groups to different backend versions:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: ab-test-route
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - headers:
      - name: x-experiment-group
        value: treatment
    backendRefs:
    - name: app-experiment
      port: 80
  - matches:
    - headers:
      - name: x-experiment-group
        value: control
    backendRefs:
    - name: app-control
      port: 80
  - backendRefs:
    - name: app-stable
      port: 80
```

Your application or API gateway sets the `x-experiment-group` header based on user assignment, and the Gateway API routes accordingly. Users not in any experiment group get the stable version.

## Canary Releases with Headers

Deploy a canary release that only internal testers can access:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: canary-header-route
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - headers:
      - name: x-canary
        value: "true"
      - name: x-internal-token
        value: "secret-token-12345"
    backendRefs:
    - name: app-canary
      port: 80
  - backendRefs:
    - name: app-production
      port: 80
```

Only requests with both the canary flag and a valid internal token reach the canary service. Everyone else gets the production service.

## Multi-Tenant Routing

Route different tenants to isolated backend instances:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: tenant-routing
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - headers:
      - name: x-tenant-id
        value: tenant-a
    backendRefs:
    - name: api-tenant-a
      port: 80
  - matches:
    - headers:
      - name: x-tenant-id
        value: tenant-b
    backendRefs:
    - name: api-tenant-b
      port: 80
  - matches:
    - headers:
      - type: RegularExpression
        name: x-tenant-id
        value: "tenant-.*"
    backendRefs:
    - name: api-shared
      port: 80
  - backendRefs:
    - name: api-default
      port: 80
```

Named tenants get dedicated backends, other tenants with the `tenant-` prefix go to a shared backend, and requests without any tenant header go to the default.

## Combining Headers with Path Matching

Headers and paths can be combined in a single match for very specific routing:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: combined-match-route
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  rules:
  # Premium tenants accessing the analytics API get a dedicated service
  - matches:
    - path:
        type: PathPrefix
        value: /api/analytics
      headers:
      - name: x-tier
        value: premium
    backendRefs:
    - name: analytics-premium
      port: 80
  # Everyone else accessing analytics gets the standard service
  - matches:
    - path:
        type: PathPrefix
        value: /api/analytics
    backendRefs:
    - name: analytics-standard
      port: 80
```

## Modifying Headers

Besides routing on headers, you can add, set, or remove headers:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-modify-route
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  rules:
  - matches:
    - headers:
      - name: x-version
        value: beta
    filters:
    - type: RequestHeaderModifier
      requestHeaderModifier:
        add:
        - name: x-routed-to
          value: beta-backend
        set:
        - name: x-forwarded-version
          value: beta
        remove:
        - x-debug-token
    backendRefs:
    - name: app-beta
      port: 80
```

And modify response headers:

```yaml
filters:
- type: ResponseHeaderModifier
  responseHeaderModifier:
    add:
    - name: x-served-by
      value: beta-cluster
    set:
    - name: cache-control
      value: "no-cache"
```

## Feature Flags via Headers

Use headers as feature flags to gradually roll out features:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: feature-flag-route
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api/checkout
      headers:
      - name: x-feature-new-checkout
        value: "enabled"
    backendRefs:
    - name: checkout-v2
      port: 80
  - matches:
    - path:
        type: PathPrefix
        value: /api/checkout
    backendRefs:
    - name: checkout-v1
      port: 80
```

Your frontend or API gateway adds the `x-feature-new-checkout: enabled` header for users who should see the new checkout flow. Everyone else stays on the old version.

## User-Agent Based Routing

Route mobile and desktop clients differently:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: user-agent-route
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  rules:
  - matches:
    - headers:
      - type: RegularExpression
        name: user-agent
        value: ".*(iPhone|Android).*"
    backendRefs:
    - name: mobile-backend
      port: 80
  - backendRefs:
    - name: desktop-backend
      port: 80
```

## Testing Header-Based Routes

```bash
# Get gateway IP
GATEWAY_IP=$(kubectl get gateway web-gateway -n production -o jsonpath='{.status.addresses[0].value}')

# Test with specific header
curl -H "x-version: beta" http://app.example.com/ --resolve app.example.com:80:$GATEWAY_IP

# Test without header (should hit default)
curl http://app.example.com/ --resolve app.example.com:80:$GATEWAY_IP

# Test with multiple headers
curl -H "x-tenant: enterprise" -H "x-env: canary" http://app.example.com/ --resolve app.example.com:80:$GATEWAY_IP
```

## Debugging

Check the Envoy route table to see how header matching was configured:

```bash
istioctl proxy-config route deploy/web-gateway-istio -n production -o json
```

Look for `headers` entries in the route match conditions.

If routes aren't matching as expected, check:
- Header names are case-insensitive in HTTP but the Gateway API match is case-sensitive on the value
- Multiple headers in one match are ANDed together
- The order of rules matters - first match wins
- A rule without any match conditions is a catch-all and should come last

Header-based routing is one of the most versatile tools in your traffic management toolbox. It gives you fine-grained control over where requests go without changing URLs, DNS, or client code. Combined with the standardized Gateway API, it works cleanly across different implementations and environments.
