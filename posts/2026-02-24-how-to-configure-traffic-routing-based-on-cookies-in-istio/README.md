# How to Configure Traffic Routing Based on Cookies in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Routing, Cookies, A/B Testing, Service Mesh

Description: How to route traffic based on browser cookies in Istio for A/B testing, feature flags, and user-specific version targeting using VirtualService match rules.

---

Cookie-based routing is one of the most practical traffic management patterns for user-facing applications. You can route users to different versions of a service based on a cookie value, which is perfect for A/B testing, beta programs, and gradual feature rollouts. The user gets a cookie when they enter the test group, and every subsequent request routes to the correct version automatically.

Istio's VirtualService supports matching on HTTP headers, and since cookies are sent as part of the `Cookie` header, you can build routing rules around cookie values. There are some nuances to how this works that are worth understanding before you dive into configuration.

## Basic Cookie-Based Routing

The simplest case is routing users with a specific cookie to a different version. Say you have a `beta-user` cookie and want to send those users to the v2 version:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: frontend
  namespace: production
spec:
  hosts:
  - frontend
  http:
  - match:
    - headers:
        cookie:
          regex: ".*beta-user=true.*"
    route:
    - destination:
        host: frontend
        subset: v2
  - route:
    - destination:
        host: frontend
        subset: v1
```

The `cookie` header match uses a regex because the Cookie header contains all cookies in a single string, like `session=abc123; beta-user=true; theme=dark`. You need a regex to find your specific cookie within that string.

## Setting Up the DestinationRule

You need a DestinationRule to define the v1 and v2 subsets:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: frontend
  namespace: production
spec:
  host: frontend
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## A/B Testing with Cookie Assignment

For A/B testing, you need a way to assign cookies to users. You can do this at the application level or at the Istio gateway. Here is an approach using a Lua filter on the gateway to assign cookies to new users:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ab-cookie-assignment
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
              if not string.find(cookies, "ab%-group=") then
                -- Assign to group A or B randomly (50/50)
                local random_val = math.random(1, 100)
                local group = "A"
                if random_val > 50 then
                  group = "B"
                end
                request_handle:headers():add("x-ab-group", group)
              end
            end

            function envoy_on_response(response_handle)
              local group = response_handle:headers():get("x-ab-group")
              if group then
                response_handle:headers():add(
                  "set-cookie",
                  "ab-group=" .. group .. "; Path=/; Max-Age=2592000; SameSite=Lax"
                )
              end
            end
```

This filter checks if the `ab-group` cookie exists. If not, it randomly assigns the user to group A or B and sets the cookie in the response. Subsequent requests carry the cookie and get routed accordingly.

## Routing by A/B Group

Now route based on the A/B cookie:

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
          regex: ".*ab-group=B.*"
    route:
    - destination:
        host: frontend
        subset: v2
  - route:
    - destination:
        host: frontend
        subset: v1
```

Group A gets v1 (the default route), group B gets v2. Every user stays on the same version for the duration of their cookie (30 days in our example).

## Multiple Cookie Conditions

You can match on multiple cookies or combine cookie matching with other criteria:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: frontend
  namespace: production
spec:
  hosts:
  - frontend
  http:
  # Premium users in beta group get v3
  - match:
    - headers:
        cookie:
          regex: ".*tier=premium.*"
        cookie:
          regex: ".*beta-user=true.*"
    route:
    - destination:
        host: frontend
        subset: v3
  # Beta users get v2
  - match:
    - headers:
        cookie:
          regex: ".*beta-user=true.*"
    route:
    - destination:
        host: frontend
        subset: v2
  # Everyone else gets v1
  - route:
    - destination:
        host: frontend
        subset: v1
```

Note: when you have multiple match conditions in the same match block, they are ANDed together. When you have multiple match blocks under the same HTTP route, they are ORed.

## Session Stickiness with Cookies

Sometimes you do not care about the cookie value but just want the same user to always reach the same backend pod. Istio supports consistent hash-based load balancing using cookies:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: frontend
  namespace: production
spec:
  host: frontend
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpCookie:
          name: user-session
          ttl: 3600s
```

This tells Envoy to use the `user-session` cookie value to determine which backend pod handles the request. If the cookie does not exist, Envoy generates one and sets it in the response. The `ttl` controls how long the cookie is valid.

This is session affinity, not version routing. It ensures a user sticks to the same pod, which is useful for stateful services or services with in-memory caches.

## Feature Flag Routing

Cookie-based routing works great for feature flags. Set a cookie with the feature flag, then route accordingly:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-service
  namespace: production
spec:
  hosts:
  - checkout-service
  http:
  - match:
    - headers:
        cookie:
          regex: ".*feature-new-checkout=enabled.*"
    route:
    - destination:
        host: checkout-service
        subset: new-checkout
  - route:
    - destination:
        host: checkout-service
        subset: current
```

Your feature flag service sets the `feature-new-checkout=enabled` cookie when a user is enrolled in the new checkout experience. Istio routes them to the new version. You can enable and disable features for individual users or groups by managing their cookies.

## Debugging Cookie Routing

When cookie routing does not work as expected, check these things:

1. Verify the cookie is present in the request:

```bash
kubectl exec deploy/sleep -- curl -v http://frontend \
  -H "Cookie: beta-user=true; session=abc123" 2>&1 | grep -i cookie
```

2. Check that the VirtualService regex matches correctly. A common mistake is forgetting the `.*` around the cookie value. The Cookie header contains all cookies, so your regex needs to account for other cookies before and after your target.

3. Check the order of your match rules. Istio evaluates them top to bottom and uses the first match. Put more specific rules first.

4. Inspect the Envoy configuration on the proxy:

```bash
kubectl exec deploy/frontend -c istio-proxy -- \
  pilot-agent request GET config_dump | python3 -m json.tool | grep -A 20 "cookie"
```

## Cookie Security Considerations

When setting cookies through EnvoyFilter or your application, always consider:

- Use `Secure` flag for HTTPS-only cookies
- Use `SameSite=Lax` or `SameSite=Strict` to prevent CSRF
- Use `HttpOnly` if JavaScript does not need to read the cookie
- Set appropriate `Max-Age` or `Expires` values
- Do not put sensitive data in cookie values that control routing

## Summary

Cookie-based routing in Istio uses VirtualService header matching with regex to inspect the Cookie header. Set cookies at the gateway level using EnvoyFilter or in your application logic, then match on those cookie values to route traffic to specific service versions. Use consistent hash load balancing for session stickiness. Combine with DestinationRule subsets to direct traffic to different deployments. This pattern works well for A/B testing, feature flags, and beta programs where you need sticky, user-level routing decisions.
