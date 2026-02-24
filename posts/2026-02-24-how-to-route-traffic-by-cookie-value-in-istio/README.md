# How to Route Traffic by Cookie Value in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Routing, Cookies, A/B Testing, Kubernetes

Description: Use cookie-based traffic routing in Istio to implement sticky sessions, A/B testing, and feature flags without modifying your application code.

---

Cookie-based routing is incredibly useful for A/B testing, feature flagging, and sticky session scenarios. The idea is simple: inspect a cookie value on incoming requests and route users to different service versions based on what that cookie contains. Istio supports this through header matching in VirtualService, since cookies are transmitted as HTTP headers.

## Why Route by Cookie?

A few scenarios where this makes sense:

- **A/B testing.** Assign users to test groups via a cookie and route each group to a different backend version. This gives you consistent experience per user, unlike percentage-based routing where a user might flip between versions.
- **Feature flags.** Enable a feature for specific users by setting a cookie, then route those users to a deployment with the feature enabled.
- **Beta programs.** Let users opt into a beta experience, store that preference in a cookie, and route them to the beta deployment.
- **Sticky sessions for canary.** During a canary rollout, once a user hits the canary, keep them on the canary for a consistent experience.

## How Cookie Matching Works in Istio

Cookies are sent in the `Cookie` HTTP header as a semicolon-separated list of key-value pairs:

```
Cookie: session=abc123; theme=dark; beta=true
```

Istio matches against the entire `Cookie` header value, not individual cookie keys. This means you need to use regex matching to find a specific cookie within the header string.

## Prerequisites

- Kubernetes cluster with Istio
- Multiple versions of your service deployed
- DestinationRule with version subsets defined

## The DestinationRule

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: webapp-dr
  namespace: default
spec:
  host: webapp
  subsets:
    - name: stable
      labels:
        version: v1
    - name: canary
      labels:
        version: v2
    - name: beta
      labels:
        version: v3-beta
```

```bash
kubectl apply -f destination-rule.yaml
```

## Routing Based on a Cookie Value

To route users with a `beta=true` cookie to the beta deployment:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: webapp-vs
  namespace: default
spec:
  hosts:
    - webapp
  http:
    - match:
        - headers:
            cookie:
              regex: ".*beta=true.*"
      route:
        - destination:
            host: webapp
            subset: beta
    - route:
        - destination:
            host: webapp
            subset: stable
```

The regex `.*beta=true.*` matches any Cookie header that contains `beta=true` anywhere in the string. Apply it:

```bash
kubectl apply -f virtual-service.yaml
```

## A/B Test Routing

For A/B testing, you might assign users to groups A or B via a cookie:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: webapp-vs
  namespace: default
spec:
  hosts:
    - webapp
  http:
    - match:
        - headers:
            cookie:
              regex: ".*ab_group=B.*"
      route:
        - destination:
            host: webapp
            subset: canary
    - route:
        - destination:
            host: webapp
            subset: stable
```

Users with `ab_group=B` in their cookies get routed to the canary version. Everyone else gets the stable version. Your application or a frontend script would be responsible for setting this cookie initially.

## Multiple Cookie Conditions

You can match on multiple cookie values by combining regex patterns:

```yaml
- match:
    - headers:
        cookie:
          regex: ".*beta=true.*feature_x=enabled.*"
  route:
    - destination:
        host: webapp
        subset: beta-feature-x
```

Be careful with this pattern. The regex requires `beta=true` to appear before `feature_x=enabled` in the cookie string. Cookies do not have a guaranteed order, so a safer approach is to use separate match blocks with OR logic:

```yaml
- match:
    - headers:
        cookie:
          regex: ".*beta=true.*"
    - headers:
        cookie:
          regex: ".*feature_x=enabled.*"
  route:
    - destination:
        host: webapp
        subset: beta
```

This routes to the beta if the cookie contains either `beta=true` OR `feature_x=enabled`. If you need AND logic, you have to account for both orderings in the regex:

```yaml
- match:
    - headers:
        cookie:
          regex: ".*(beta=true.*feature_x=enabled|feature_x=enabled.*beta=true).*"
  route:
    - destination:
        host: webapp
        subset: beta-feature-x
```

## Setting Cookies from Istio

If you want Istio to set a cookie on the response (so users get assigned to a group on their first visit), you can use the `headers` field in the route to add a Set-Cookie response header:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: webapp-vs
  namespace: default
spec:
  hosts:
    - webapp
  http:
    - match:
        - headers:
            cookie:
              regex: ".*ab_group=.*"
      route:
        - destination:
            host: webapp
            subset: stable
    - route:
        - destination:
            host: webapp
            subset: stable
          weight: 50
        - destination:
            host: webapp
            subset: canary
          weight: 50
```

The actual Set-Cookie header would need to be set by your application or an EnvoyFilter. Istio VirtualService does not directly support setting arbitrary response headers for cookie assignment. For that, you would create an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: set-ab-cookie
  namespace: default
spec:
  workloadSelector:
    labels:
      app: webapp
  configPatches:
    - applyTo: HTTP_ROUTE
      match:
        context: SIDECAR_INBOUND
      patch:
        operation: MERGE
        value:
          response_headers_to_add:
            - header:
                key: Set-Cookie
                value: "ab_group=assigned; Path=/; Max-Age=86400"
              append: true
```

## Testing Cookie Routing

```bash
# Request with beta cookie
kubectl exec deploy/sleep -c sleep -- curl -s -b "session=abc; beta=true" http://webapp.default.svc.cluster.local/

# Request with A/B group cookie
kubectl exec deploy/sleep -c sleep -- curl -s -b "ab_group=B; session=xyz" http://webapp.default.svc.cluster.local/

# Request without any relevant cookies
kubectl exec deploy/sleep -c sleep -- curl -s -b "session=xyz" http://webapp.default.svc.cluster.local/

# Request with no cookies at all
kubectl exec deploy/sleep -c sleep -- curl -s http://webapp.default.svc.cluster.local/
```

## Regex Tips for Cookie Matching

The Cookie header is one long string with semicolons between values. Here are some patterns that work well:

```
# Match exact cookie value
.*mycookie=specificvalue.*

# Match cookie with any value
.*mycookie=[^;]*.*

# Match cookie that starts with a prefix
.*mycookie=prefix[^;]*.*

# Match cookie that is either value1 or value2
.*mycookie=(value1|value2).*
```

Remember that Envoy uses RE2 regex syntax, so no lookaheads or lookbehinds.

## Common Pitfalls

**Missing cookie header.** If a client sends no cookies at all, the `Cookie` header will not exist in the request. The regex match will not apply, and the request falls through to the catch-all route. This is actually the behavior you want.

**Partial matches.** The regex `.*beta=true.*` would also match a cookie like `superbeta=true123`. To be more precise, anchor with word boundaries or use the cookie separator: `(^|;\\s*)beta=true(;|$)`.

**Cookie size limits.** Browsers limit cookies to about 4KB per domain. This should not affect routing, but if your application sets too many cookies, the header parsing overhead in Envoy could add latency.

**HTTPS and Secure cookies.** Cookie routing works regardless of whether the cookie has the Secure flag. The Secure flag only affects whether the browser sends the cookie, not how the proxy handles it.

## Summary

Cookie-based routing in Istio is a solid approach for A/B testing, feature flags, and beta programs. It gives you user-level consistency that percentage-based routing cannot provide. The key is understanding that Istio matches against the raw Cookie header string, so regex matching is your primary tool. Keep your regex patterns simple, always have a fallback route, and test thoroughly with different cookie combinations.
