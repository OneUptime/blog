# How to Route Traffic by User-Agent Header in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Routing, User-Agent, Headers, Kubernetes

Description: Route traffic to different service versions based on the User-Agent header in Istio for mobile-specific backends, browser targeting, and bot handling.

---

The User-Agent header tells you a lot about who is making a request. Is it a mobile app? A desktop browser? A search engine crawler? An API client? With Istio, you can route traffic to different backend versions based on this header, which opens up a bunch of practical possibilities like serving a mobile-optimized API, sending bot traffic to a separate deployment, or testing new features on specific browsers.

## Why Route by User-Agent?

There are several reasons you might want to do this:

- **Mobile vs. desktop backends.** Mobile clients might need a lighter response payload or different data format. Instead of building this logic into your application, you can route mobile traffic to a dedicated deployment.
- **Bot management.** Search engine crawlers and monitoring bots can put unexpected load on your services. Routing them to a separate deployment keeps them from impacting real users.
- **Browser-specific testing.** When rolling out frontend-heavy changes, you might want to target a specific browser for testing before a wider release.
- **Legacy client support.** Older clients with specific User-Agent strings can be routed to a version that maintains backward compatibility.

## Prerequisites

Make sure you have:

- Kubernetes cluster with Istio installed and sidecar injection enabled
- At least two deployments of your service with different version labels
- A DestinationRule that defines subsets for each version

## The DestinationRule

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app-dr
  namespace: default
spec:
  host: my-app
  subsets:
    - name: standard
      labels:
        version: v1
    - name: mobile
      labels:
        version: v1-mobile
    - name: bot-handler
      labels:
        version: v1-bot
```

```bash
kubectl apply -f destination-rule.yaml
```

## Routing Mobile Traffic

To route requests from mobile devices to a specific backend, match on common mobile User-Agent patterns:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vs
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - headers:
            user-agent:
              regex: ".*Mobile.*"
      route:
        - destination:
            host: my-app
            subset: mobile
    - route:
        - destination:
            host: my-app
            subset: standard
```

The `regex` matcher checks if the User-Agent header contains the word "Mobile". Most mobile browsers include "Mobile" in their User-Agent string (Chrome on Android sends something like `Mozilla/5.0 (Linux; Android 10) ... Mobile Safari/537.36`).

## Matching Specific Platforms

You can get more specific. Here is how to route iOS and Android traffic separately:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vs
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - headers:
            user-agent:
              regex: ".*iPhone.*|.*iPad.*"
      route:
        - destination:
            host: my-app
            subset: ios-backend
    - match:
        - headers:
            user-agent:
              regex: ".*Android.*"
      route:
        - destination:
            host: my-app
            subset: android-backend
    - route:
        - destination:
            host: my-app
            subset: standard
```

Rules are evaluated in order, top to bottom. The first match wins. If none of the match conditions are met, the catch-all route at the bottom handles the request.

## Routing Bot Traffic

Search engine crawlers typically identify themselves in their User-Agent. You can route them to a dedicated deployment:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vs
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - headers:
            user-agent:
              regex: ".*(Googlebot|Bingbot|Slurp|DuckDuckBot|Baiduspider).*"
      route:
        - destination:
            host: my-app
            subset: bot-handler
    - route:
        - destination:
            host: my-app
            subset: standard
```

This keeps bot traffic isolated from real user traffic. Your bot-handler deployment could have different scaling rules, caching policies, or even serve pre-rendered pages.

## Combining User-Agent with Other Conditions

You can combine header matching with other match conditions for more precise routing. For example, route mobile users hitting the API to a mobile-optimized API backend:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vs
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - headers:
            user-agent:
              regex: ".*Mobile.*"
          uri:
            prefix: /api/
      route:
        - destination:
            host: my-app
            subset: mobile
    - route:
        - destination:
            host: my-app
            subset: standard
```

Since `headers` and `uri` are under the same match item, they are AND conditions. The request must be from a mobile client AND hit a `/api/` path.

## Testing Your Rules

You can test with curl by setting a custom User-Agent:

```bash
# Simulate a mobile request
kubectl exec deploy/sleep -c sleep -- curl -s -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) Mobile/15E148" http://my-app.default.svc.cluster.local/

# Simulate a Googlebot request
kubectl exec deploy/sleep -c sleep -- curl -s -H "User-Agent: Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" http://my-app.default.svc.cluster.local/

# Simulate a desktop request
kubectl exec deploy/sleep -c sleep -- curl -s -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36" http://my-app.default.svc.cluster.local/
```

Check the istio-proxy logs on each deployment to verify routing:

```bash
kubectl logs deploy/my-app-mobile -c istio-proxy --tail=10
kubectl logs deploy/my-app-standard -c istio-proxy --tail=10
```

## Performance Considerations

Regex matching on headers has a small overhead compared to exact matching. For high-traffic services, keep your regex patterns as simple as possible. If you can use `prefix` or `exact` matching instead of `regex`, do that. For example, if your mobile app sends a custom User-Agent like `MyApp-iOS/2.0`, you can use prefix matching:

```yaml
- match:
    - headers:
        user-agent:
          prefix: "MyApp-iOS"
  route:
    - destination:
        host: my-app
        subset: mobile
```

This is faster than regex and less likely to accidentally match unexpected strings.

## Gotchas and Tips

**User-Agent spoofing.** Do not use User-Agent routing for security decisions. User-Agent headers are trivially easy to fake. Use this for optimization and traffic management, not access control.

**Empty User-Agent.** Some clients do not send a User-Agent header at all. Your catch-all route handles these cases, but be aware that they exist.

**Regex complexity.** Envoy uses RE2 for regex matching, not PCRE. RE2 does not support lookaheads, lookbehinds, or backreferences. Keep your patterns simple and stick to basic alternation and character classes.

**Header name casing.** HTTP/2 lowercases all header names. Istio handles this, but always use lowercase header names in your match conditions (`user-agent`, not `User-Agent`) to be safe.

**Order matters.** VirtualService rules are evaluated top to bottom. Put more specific matches before less specific ones. The first matching rule wins.

## Verifying Configuration

Always validate after applying:

```bash
istioctl analyze -n default
```

And check the proxy config is correct on a specific pod:

```bash
istioctl proxy-config routes deploy/my-app-standard -n default
```

## Summary

Routing by User-Agent in Istio is a practical way to serve different client types from different backends without baking routing logic into your application code. It works well for mobile optimization, bot management, and browser-specific testing. Just remember that User-Agent strings are not trustworthy for security purposes, and keep your regex patterns simple for best performance.
