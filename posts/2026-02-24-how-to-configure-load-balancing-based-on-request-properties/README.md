# How to Configure Load Balancing Based on Request Properties

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Load Balancing, Traffic Management, Kubernetes, Request Routing

Description: Learn how to route and balance traffic in Istio based on HTTP headers, URI paths, query parameters, and other request attributes.

---

Sometimes you want your load balancing decisions to be smarter than just cycling through endpoints. Maybe you need to route premium users to dedicated pods, send mobile traffic to an optimized backend, or ensure that requests for a specific tenant always hit the same set of instances. Istio gives you several ways to make load balancing and routing decisions based on request properties like headers, URIs, and more.

## Request-Based Routing with VirtualService

The most direct way to route based on request properties is through the `match` field in a VirtualService. You can match on headers, URI, query parameters, scheme, method, and authority.

Here is a basic example that routes based on a custom header:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-service-vs
  namespace: default
spec:
  hosts:
    - api-service
  http:
    - match:
        - headers:
            x-user-tier:
              exact: premium
      route:
        - destination:
            host: api-service
            subset: premium
    - match:
        - headers:
            x-user-tier:
              exact: standard
      route:
        - destination:
            host: api-service
            subset: standard
    - route:
        - destination:
            host: api-service
            subset: standard
```

This sends requests with `x-user-tier: premium` to the premium subset and everything else to the standard subset. The last route without a match block acts as the default.

## Matching on URI Paths

You can route based on the URI path using `exact`, `prefix`, or `regex` matching:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-service-vs
  namespace: default
spec:
  hosts:
    - app-service
  http:
    - match:
        - uri:
            prefix: /api/v2
      route:
        - destination:
            host: app-service
            subset: v2
    - match:
        - uri:
            prefix: /api/v1
      route:
        - destination:
            host: app-service
            subset: v1
    - route:
        - destination:
            host: app-service
            subset: v1
```

Order matters here. Istio evaluates match rules top-down and uses the first match it finds. Put your most specific rules first.

## Consistent Hashing for Session Affinity

If you want requests with the same property value to always land on the same backend (session affinity), use consistent hash-based load balancing. This is configured in the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-service-dr
  namespace: default
spec:
  host: api-service
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-user-id
```

Now all requests with the same `x-user-id` header value will be routed to the same backend pod. This is incredibly useful for services that maintain in-memory caches or session state.

You can also hash on other request properties:

```yaml
# Hash on a cookie
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: web-service-dr
  namespace: default
spec:
  host: web-service
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpCookie:
          name: user_session
          ttl: 3600s
```

```yaml
# Hash on source IP
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: legacy-service-dr
  namespace: default
spec:
  host: legacy-service
  trafficPolicy:
    loadBalancer:
      consistentHash:
        useSourceIp: true
```

The cookie-based approach is especially nice because if the cookie doesn't exist, Envoy will set it automatically with the specified TTL.

## Combining Match Rules

You can combine multiple match conditions. All conditions in a single match block are ANDed together, while multiple match blocks are ORed:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-vs
  namespace: default
spec:
  hosts:
    - checkout-service
  http:
    - match:
        - headers:
            x-device-type:
              exact: mobile
          uri:
            prefix: /checkout
      route:
        - destination:
            host: checkout-service
            subset: mobile-optimized
    - match:
        - headers:
            x-beta-user:
              exact: "true"
        - headers:
            x-internal:
              exact: "true"
      route:
        - destination:
            host: checkout-service
            subset: beta
    - route:
        - destination:
            host: checkout-service
            subset: stable
```

The first rule matches when BOTH the header is "mobile" AND the URI starts with /checkout. The second rule matches when EITHER x-beta-user is "true" OR x-internal is "true".

## Request Property-Based Traffic Splitting

You can also split traffic based on request properties with different weights:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: search-service-vs
  namespace: default
spec:
  hosts:
    - search-service
  http:
    - match:
        - headers:
            x-experiment-group:
              exact: treatment
      route:
        - destination:
            host: search-service
            subset: new-algorithm
          weight: 100
    - match:
        - headers:
            x-experiment-group:
              exact: control
      route:
        - destination:
            host: search-service
            subset: old-algorithm
          weight: 100
    - route:
        - destination:
            host: search-service
            subset: old-algorithm
          weight: 90
        - destination:
            host: search-service
            subset: new-algorithm
          weight: 10
```

Users in the treatment group always get the new algorithm. Users in the control group always get the old one. Everyone else gets a 90/10 split.

## Setting Up the DestinationRule Subsets

All the VirtualService examples above reference subsets, so you need the corresponding DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: search-service-dr
  namespace: default
spec:
  host: search-service
  subsets:
    - name: new-algorithm
      labels:
        algorithm: new
    - name: old-algorithm
      labels:
        algorithm: old
```

## Regex Matching for Complex Patterns

When exact or prefix matching isn't flexible enough, use regex:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: content-vs
  namespace: default
spec:
  hosts:
    - content-service
  http:
    - match:
        - uri:
            regex: "/api/v[3-9]/.*"
      route:
        - destination:
            host: content-service
            subset: next-gen
    - match:
        - headers:
            user-agent:
              regex: ".*Mobile.*"
      route:
        - destination:
            host: content-service
            subset: mobile
    - route:
        - destination:
            host: content-service
            subset: default
```

Be careful with regex matching though. Complex regex patterns can add latency since they're evaluated on every request.

## Verifying Your Configuration

After applying your configuration, verify that the routes are set up correctly:

```bash
# Analyze for any issues
istioctl analyze -n default

# Check proxy routes
istioctl proxy-config routes <pod-name> -o json

# Test with a specific header
kubectl exec <client-pod> -- curl -H "x-user-tier: premium" http://api-service/test -v
```

Look at the response headers and access logs to confirm traffic is being routed to the expected subset.

## Performance Considerations

Consistent hashing works great for session affinity, but keep in mind that when pods scale up or down, some hash keys will be remapped to different endpoints. This is normal and expected with consistent hashing. If you need stronger guarantees, consider using an external session store instead of relying on hash-based routing.

Also, match conditions are evaluated sequentially. If you have many match rules, put the most common matches first to minimize evaluation overhead.

## Summary

Istio provides rich request-based routing through VirtualService match rules and consistent hash load balancing in DestinationRules. You can route based on headers, URIs, cookies, source IP, and more. Combining these with weighted routing and subsets gives you fine-grained control over how different types of requests are handled by your services.
