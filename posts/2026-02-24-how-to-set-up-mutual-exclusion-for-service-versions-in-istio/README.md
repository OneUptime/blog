# How to Set Up Mutual Exclusion for Service Versions in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Management, Versioning, Deployment Strategy, Service Mesh

Description: Configure mutual exclusion for service versions in Istio to ensure users only interact with one version throughout their session using consistent routing.

---

Mutual exclusion for service versions means that once a user or request is routed to a specific version of a service, all subsequent related requests also go to that same version. This prevents the confusing and potentially harmful scenario where a user interacts with v1 for one request and v2 for the next, especially when the two versions have incompatible APIs, different data formats, or different business logic.

This is different from simple traffic splitting where each request is independently routed. With mutual exclusion, the routing decision sticks for the duration of a session, a transaction, or whatever scope you define.

## Why Mutual Exclusion Matters

Consider a shopping application. v1 stores cart items in one format and v2 uses a different schema. If a user adds an item using v2 but views the cart through v1, the cart might look empty or show corrupted data. Mutual exclusion ensures the user talks to one version consistently.

Another scenario is during API migrations. Your v1 API returns JSON with camelCase keys, and v2 uses snake_case. A mobile app that hits v1 for one call and v2 for the next will break its JSON parsing.

## Approach 1: Header-Based Version Pinning

The most reliable approach is to pin the version in a request header and route based on that header. The version is assigned on the first request and carried through all subsequent requests.

Set the version header at the ingress gateway:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: version-pinning
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
          inline_code: |
            function envoy_on_request(request_handle)
              local version = request_handle:headers():get("x-service-version")
              if version == nil or version == "" then
                request_handle:headers():add("x-service-version", "v1")
              end
            end
```

Then route based on the header:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
  namespace: production
spec:
  hosts:
  - my-service
  http:
  - match:
    - headers:
        x-service-version:
          exact: "v2"
    route:
    - destination:
        host: my-service
        subset: v2
  - route:
    - destination:
        host: my-service
        subset: v1
```

The client (or API gateway) includes the `x-service-version` header on every request, and all requests with the same version value go to the same version.

## Approach 2: Cookie-Based Version Stickiness

For browser-based applications, cookies are the natural way to maintain version stickiness across requests:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: version-cookie
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
          inline_code: |
            function envoy_on_request(request_handle)
              local cookies = request_handle:headers():get("cookie") or ""
              if not string.find(cookies, "service%-version=") then
                request_handle:headers():add("x-assign-version", "true")
              end
            end

            function envoy_on_response(response_handle)
              local assign = response_handle:headers():get("x-assign-version")
              if assign then
                response_handle:headers():add(
                  "set-cookie",
                  "service-version=v1; Path=/; Max-Age=86400; SameSite=Lax"
                )
              end
            end
```

Route based on the cookie:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: frontend
  namespace: production
spec:
  hosts:
  - frontend.example.com
  gateways:
  - frontend-gateway
  http:
  - match:
    - headers:
        cookie:
          regex: ".*service-version=v2.*"
    route:
    - destination:
        host: frontend
        subset: v2
  - route:
    - destination:
        host: frontend
        subset: v1
```

The first request sets the cookie. Every following request carries it, ensuring consistent routing.

## Approach 3: Consistent Hash Load Balancing

Istio's consistent hash load balancing pins a client to a specific backend pod based on a hash key. While this is not exactly version-based mutual exclusion, it ensures a client always hits the same pod:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
  namespace: production
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-user-id
```

Every request with the same `x-user-id` header goes to the same pod. If you deploy v1 and v2 as separate deployments with different pod sets, and use subsets with consistent hashing, a user will consistently hit the same version.

## Ensuring Version Consistency Across Multiple Services

The tricky part is maintaining version consistency across a chain of services. If the user is on v2 of the frontend, they should also hit v2 of the backend and v2 of the database service. This requires propagating the version header through the entire call chain.

Your application code must forward the `x-service-version` header:

```python
import requests
from flask import Flask, request as flask_request

app = Flask(__name__)

@app.route('/api/products')
def get_products():
    # Forward the version header to downstream services
    version_header = flask_request.headers.get('x-service-version', 'v1')

    response = requests.get(
        'http://inventory-service/api/stock',
        headers={'x-service-version': version_header}
    )
    return response.json()
```

Then each downstream service has a matching VirtualService rule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: inventory-service
  namespace: production
spec:
  hosts:
  - inventory-service
  http:
  - match:
    - headers:
        x-service-version:
          exact: "v2"
    route:
    - destination:
        host: inventory-service
        subset: v2
  - route:
    - destination:
        host: inventory-service
        subset: v1
```

## DestinationRule Subsets

All the routing above depends on properly defined subsets:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
  namespace: production
spec:
  host: my-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: inventory-service
  namespace: production
spec:
  host: inventory-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

Make sure your Deployment resources have matching `version` labels:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-v1
spec:
  selector:
    matchLabels:
      app: my-service
      version: v1
  template:
    metadata:
      labels:
        app: my-service
        version: v1
    spec:
      containers:
      - name: my-service
        image: my-registry/my-service:1.0.0
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-v2
spec:
  selector:
    matchLabels:
      app: my-service
      version: v2
  template:
    metadata:
      labels:
        app: my-service
        version: v2
    spec:
      containers:
      - name: my-service
        image: my-registry/my-service:2.0.0
```

## Handling Version Transitions

When you want to move users from v1 to v2, do it gradually:

1. Start with all users on v1 (default route)
2. Assign new sessions to v2 by changing the default version in the Lua filter
3. Existing users stay on v1 because their cookie or header is already set
4. Once all v1 sessions expire (based on cookie TTL), all traffic goes to v2
5. Decommission v1

```yaml
# Update the Lua filter to assign new users to v2
request_handle:headers():add("x-service-version", "v2")
```

## Testing Mutual Exclusion

Verify that a user stays on one version:

```bash
# First request - should get v1 (and a version cookie)
curl -v http://api.example.com/api/products -c cookies.txt

# Second request - should also hit v1 (using the cookie)
curl -v http://api.example.com/api/products -b cookies.txt

# Verify the routing
curl -v http://api.example.com/api/products -b cookies.txt 2>&1 | grep "x-served-by"
```

## Summary

Mutual exclusion for service versions in Istio ensures users interact with a single version consistently. Use header-based pinning for API clients, cookie-based stickiness for browser applications, and propagate the version identifier through the entire service chain. Define clear subsets in your DestinationRules and match on the version identifier in VirtualService rules. Handle version transitions by changing the default assignment while letting existing sessions drain naturally. This prevents the data inconsistencies and API incompatibilities that arise from mixed-version interactions.
