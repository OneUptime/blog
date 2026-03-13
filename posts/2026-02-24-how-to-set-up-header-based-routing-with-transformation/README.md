# How to Set Up Header-Based Routing with Transformation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Header Routing, Traffic Management, VirtualService, Canary Deployments

Description: How to route traffic based on HTTP headers and transform those headers in Istio for canary deployments, A/B testing, and multi-tenant routing.

---

Header-based routing is one of Istio's most useful features. You can send different users to different service versions based on the headers in their requests. Combine that with header transformation, and you get a powerful system where the routing decision happens at one point and the context flows through the rest of the call chain as modified headers. This is the backbone of canary deployments, A/B testing, and multi-tenant architectures.

## Basic Header-Based Routing

Here is a simple example that routes traffic based on a custom header:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
spec:
  hosts:
    - my-app
  http:
    - match:
        - headers:
            x-user-group:
              exact: "beta"
      route:
        - destination:
            host: my-app
            subset: v2
    - route:
        - destination:
            host: my-app
            subset: v1
```

With the corresponding DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app
spec:
  host: my-app
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

Requests with `x-user-group: beta` go to v2. Everyone else goes to v1.

## Routing and Transforming Headers Together

The real power comes from combining routing with header transformation. You can route based on one header and then inject additional context headers for the backend:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-service
spec:
  hosts:
    - api.example.com
  gateways:
    - main-gateway
  http:
    - match:
        - headers:
            x-feature-flag:
              exact: "new-checkout"
      route:
        - destination:
            host: api-service
            subset: feature-checkout
          headers:
            request:
              set:
                x-feature-branch: "new-checkout"
                x-experiment-id: "exp-2024-checkout"
              add:
                x-routed-by: "header-match"
    - match:
        - headers:
            x-feature-flag:
              exact: "new-search"
      route:
        - destination:
            host: api-service
            subset: feature-search
          headers:
            request:
              set:
                x-feature-branch: "new-search"
                x-experiment-id: "exp-2024-search"
              add:
                x-routed-by: "header-match"
    - route:
        - destination:
            host: api-service
            subset: stable
          headers:
            request:
              set:
                x-feature-branch: "stable"
              add:
                x-routed-by: "default"
```

The backend service gets both the routing decision (which subset it is running in) and additional context through the transformed headers.

## Canary Deployment with Header-Based Routing

For canary deployments, route a percentage of traffic to the new version while allowing specific users to explicitly opt in:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-service
spec:
  hosts:
    - payment-service
  http:
    # Explicit opt-in for testing
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: payment-service
            subset: canary
          headers:
            request:
              set:
                x-deployment-track: "canary"
                x-canary-reason: "explicit-opt-in"
    # Percentage-based canary
    - route:
        - destination:
            host: payment-service
            subset: stable
          weight: 90
          headers:
            request:
              set:
                x-deployment-track: "stable"
        - destination:
            host: payment-service
            subset: canary
          weight: 10
          headers:
            request:
              set:
                x-deployment-track: "canary"
                x-canary-reason: "percentage-rollout"
```

## Multi-Tenant Routing with Header Transformation

For multi-tenant systems, route based on the tenant header and inject tenant-specific configuration:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: saas-api
spec:
  hosts:
    - api.saas.example.com
  gateways:
    - saas-gateway
  http:
    - match:
        - headers:
            x-tenant-id:
              exact: "acme-corp"
      route:
        - destination:
            host: api-service
            subset: dedicated
          headers:
            request:
              set:
                x-tenant-db: "db-acme"
                x-tenant-tier: "enterprise"
                x-rate-limit: "10000"
    - match:
        - headers:
            x-tenant-id:
              regex: ".*"
      route:
        - destination:
            host: api-service
            subset: shared
          headers:
            request:
              set:
                x-tenant-tier: "standard"
                x-rate-limit: "1000"
```

The DestinationRule separates the infrastructure:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-service
spec:
  host: api-service
  subsets:
    - name: dedicated
      labels:
        tier: dedicated
    - name: shared
      labels:
        tier: shared
```

## A/B Testing with Header Routing

For A/B testing, use headers to assign users to experiment groups:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ab-test-assignment
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
              function envoy_on_request(request_handle)
                local group = request_handle:headers():get("x-ab-group")
                if group == nil then
                  -- Assign to a group based on simple random split
                  if math.random() < 0.5 then
                    request_handle:headers():add("x-ab-group", "control")
                  else
                    request_handle:headers():add("x-ab-group", "experiment")
                  end
                end
              end
```

Then route based on the assigned group:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: frontend
spec:
  hosts:
    - app.example.com
  gateways:
    - main-gateway
  http:
    - match:
        - headers:
            x-ab-group:
              exact: "experiment"
      route:
        - destination:
            host: frontend
            subset: experiment
          headers:
            request:
              set:
                x-experiment-active: "true"
            response:
              add:
                x-ab-group: "experiment"
    - route:
        - destination:
            host: frontend
            subset: control
          headers:
            request:
              set:
                x-experiment-active: "false"
            response:
              add:
                x-ab-group: "control"
```

## Multiple Header Matching

You can match on multiple headers simultaneously:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: complex-routing
spec:
  hosts:
    - api.example.com
  gateways:
    - main-gateway
  http:
    - match:
        - headers:
            x-user-tier:
              exact: "premium"
            x-region:
              exact: "eu"
      route:
        - destination:
            host: api-service-eu
            subset: premium
          headers:
            request:
              set:
                x-data-center: "eu-west-1"
                x-cache-tier: "dedicated"
    - match:
        - headers:
            x-user-tier:
              exact: "premium"
            x-region:
              exact: "us"
      route:
        - destination:
            host: api-service-us
            subset: premium
          headers:
            request:
              set:
                x-data-center: "us-east-1"
                x-cache-tier: "dedicated"
```

All headers in a single match block must be present for the rule to trigger. This is an AND condition.

## Header Prefix and Regex Matching

Beyond exact matching, Istio supports prefix and regex:

```yaml
http:
  - match:
      - headers:
          x-api-key:
            prefix: "prod-"
    route:
      - destination:
          host: api-service
          subset: production
        headers:
          request:
            set:
              x-environment: "production"
  - match:
      - headers:
          x-api-key:
            prefix: "staging-"
    route:
      - destination:
          host: api-service
          subset: staging
        headers:
          request:
            set:
              x-environment: "staging"
```

## Testing Header-Based Routing

Verify your routing works:

```bash
# Test beta route
curl -H "x-user-group: beta" http://api.example.com/version

# Test default route
curl http://api.example.com/version

# Check which headers the backend received
kubectl exec deploy/sleep -- curl -s -H "x-user-group: beta" http://httpbin:8000/headers
```

Inspect the proxy configuration:

```bash
istioctl proxy-config routes deploy/my-app -o json | python3 -m json.tool
```

## Best Practices

- Keep your header matching rules ordered from most specific to least specific. Istio evaluates them top to bottom and uses the first match.
- Always have a default route (without a match condition) at the bottom to catch requests that do not match any header rule.
- Use descriptive header names. `x-feature-flag` is better than `x-ff`.
- Document which headers your routing depends on so other teams know what to send.
- Use the transformed headers to pass routing context to downstream services instead of requiring them to parse the original routing headers themselves.

Header-based routing combined with header transformation gives you a flexible traffic management system without touching application code. It is the foundation for progressive delivery strategies and multi-tenant architectures in Istio.
