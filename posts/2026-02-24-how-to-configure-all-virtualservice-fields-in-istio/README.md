# How to Configure All VirtualService Fields in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, Traffic Management, Kubernetes, Service Mesh

Description: A complete walkthrough of every VirtualService field in Istio with practical YAML examples for traffic routing, retries, timeouts, and more.

---

The VirtualService is probably the most commonly used Istio resource. It controls how requests get routed to services within your mesh. But most people only scratch the surface of what it can do. There are a lot of fields tucked away in the spec that can help you build really sophisticated routing rules. This post walks through all of them with real YAML you can adapt for your own deployments.

## Top-Level Structure

Every VirtualService starts with the standard Kubernetes metadata plus a few Istio-specific top-level fields:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
  namespace: default
spec:
  hosts:
    - my-service.default.svc.cluster.local
  gateways:
    - my-gateway
    - mesh
  http:
    - route:
        - destination:
            host: my-service
            port:
              number: 80
  tls:
    - match:
        - sniHosts:
            - secure.example.com
      route:
        - destination:
            host: my-secure-service
  tcp:
    - route:
        - destination:
            host: my-tcp-service
  exportTo:
    - "."
    - "istio-system"
```

The `hosts` field is a list of destination hosts the routing rules apply to. These can be short names, FQDNs, or even wildcard prefixes like `*.example.com`. The `gateways` field tells Istio which gateways (including the special `mesh` gateway for internal traffic) should use these rules. If you omit `gateways`, the default is `mesh` only. The `exportTo` field controls which namespaces can see this VirtualService - `.` means the current namespace only.

## HTTP Route Fields

The `http` section is where most of the action happens. Each HTTP route can have match conditions, route destinations, and all sorts of traffic policies.

### Match Conditions

```yaml
spec:
  hosts:
    - reviews
  http:
    - match:
        - uri:
            exact: /reviews/v2
          headers:
            end-user:
              exact: jason
          method:
            exact: GET
          scheme:
            exact: https
          authority:
            prefix: reviews
          port: 8080
          sourceLabels:
            app: productpage
          sourceNamespace: default
          queryParams:
            test_id:
              regex: "^[0-9]+$"
          ignoreUriCase: true
          withoutHeaders:
            x-internal:
              exact: "true"
      route:
        - destination:
            host: reviews
            subset: v2
```

That is a pretty loaded match block. The `uri` field supports `exact`, `prefix`, and `regex` matching. Same goes for `headers`, `method`, `scheme`, and `authority`. The `queryParams` field also supports the same string match types. The `sourceLabels` field lets you match based on the calling workload's labels, while `sourceNamespace` restricts the match to traffic from a specific namespace. The `ignoreUriCase` flag makes URI matching case-insensitive. The `withoutHeaders` field is the inverse of `headers` - it matches when the specified headers are NOT present.

### Route Destinations

```yaml
http:
  - route:
      - destination:
          host: reviews
          subset: v1
          port:
            number: 8080
        weight: 75
      - destination:
          host: reviews
          subset: v2
          port:
            number: 8080
        weight: 25
```

Each route destination has a `host` (the service name), an optional `subset` (defined in a DestinationRule), and an optional `port`. The `weight` field distributes traffic across multiple destinations for canary deployments or A/B testing.

### Redirect

```yaml
http:
  - match:
      - uri:
          prefix: /old-path
    redirect:
      uri: /new-path
      authority: new-host.example.com
      redirectCode: 301
      scheme: https
      port: 443
      derivePort: FROM_PROTOCOL_DEFAULT
```

Redirects send back an HTTP redirect response instead of forwarding. The `redirectCode` defaults to 301. You can change the scheme, authority, URI, and port. The `derivePort` field can be `FROM_PROTOCOL_DEFAULT` or `FROM_REQUEST_PORT`.

### Rewrite

```yaml
http:
  - match:
      - uri:
          prefix: /api/v1
    rewrite:
      uri: /api/v2
      authority: backend.example.com
      uriRegexRewrite:
        match: "/service/([^/]+)(.*)"
        rewrite: "/\\2/instance/\\1"
    route:
      - destination:
          host: backend
```

Rewrites modify the request before forwarding. The `uriRegexRewrite` field allows regex-based rewrites with capture groups, which is extremely handy for restructuring URL paths. Note that `uri` and `uriRegexRewrite` are mutually exclusive.

### Timeout and Retries

```yaml
http:
  - route:
      - destination:
          host: reviews
    timeout: 10s
    retries:
      attempts: 3
      perTryTimeout: 3s
      retryOn: "5xx,reset,connect-failure,retriable-4xx"
      retryRemoteLocalities: true
```

The `timeout` field sets the overall request timeout. Under `retries`, `attempts` is how many times to retry, `perTryTimeout` is the timeout for each attempt, and `retryOn` is a comma-separated list of conditions that trigger a retry. The `retryRemoteLocalities` field controls whether retries should include endpoints in other localities.

### Fault Injection

```yaml
http:
  - route:
      - destination:
          host: reviews
    fault:
      delay:
        percentage:
          value: 10
        fixedDelay: 5s
      abort:
        percentage:
          value: 5
        httpStatus: 503
```

Fault injection is great for testing resilience. The `delay` field adds latency, while `abort` returns an error without forwarding. Both support a `percentage` to only affect a portion of traffic.

### Headers Manipulation

```yaml
http:
  - route:
      - destination:
          host: reviews
        headers:
          request:
            set:
              x-custom-header: "my-value"
            add:
              x-trace-id: "%REQ(x-request-id)%"
            remove:
              - x-internal-header
          response:
            set:
              x-response-time: "%RESP(x-envoy-upstream-service-time)%"
            add:
              strict-transport-security: "max-age=31536000"
            remove:
              - x-powered-by
```

You can manipulate headers on both the request (before forwarding) and the response (before sending back to the client). The `set` operation replaces existing values, `add` appends, and `remove` strips headers entirely.

### Mirror and Delegate

```yaml
http:
  - route:
      - destination:
          host: reviews
            subset: v1
    mirror:
      host: reviews
      subset: v2
    mirrorPercentage:
      value: 50
```

Traffic mirroring sends a copy of the traffic to another destination without affecting the primary request path. The `mirrorPercentage` controls what fraction of traffic gets mirrored. This is perfect for testing a new version against real production traffic.

### CORS Policy

```yaml
http:
  - route:
      - destination:
          host: frontend
    corsPolicy:
      allowOrigins:
        - regex: ".*\\.example\\.com"
      allowMethods:
        - GET
        - POST
        - PUT
      allowHeaders:
        - content-type
        - authorization
      exposeHeaders:
        - x-custom-header
      maxAge: "24h"
      allowCredentials: true
      unmatchedPreflights: FORWARD
```

The CORS policy configures Cross-Origin Resource Sharing. The `allowOrigins` field supports exact, prefix, and regex matching. The `unmatchedPreflights` field (added in newer Istio versions) controls whether unmatched preflight requests are forwarded or rejected.

## TLS Routes

```yaml
spec:
  tls:
    - match:
        - sniHosts:
            - "*.example.com"
          port: 443
          destinationSubnets:
            - "10.0.0.0/8"
          sourceLabels:
            app: frontend
          gateways:
            - my-gateway
      route:
        - destination:
            host: my-service
            port:
              number: 8443
          weight: 100
```

TLS routes handle passthrough TLS traffic. The matching is based on SNI host, port, destination subnets, and source labels. The route block works the same as HTTP routes.

## TCP Routes

```yaml
spec:
  tcp:
    - match:
        - port: 3306
          sourceLabels:
            app: backend
          gateways:
            - mesh
          destinationSubnets:
            - "10.0.0.0/8"
          sourceNamespace: production
      route:
        - destination:
            host: mysql
            port:
              number: 3306
```

TCP routes are for non-HTTP traffic. The match conditions are similar to TLS routes. You can route based on port, source labels, source namespace, and gateways.

## Putting It All Together

Here is a more realistic example that combines several features:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: reviews
  namespace: bookinfo
spec:
  hosts:
    - reviews
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: reviews
            subset: v3
      retries:
        attempts: 2
        perTryTimeout: 2s
    - route:
        - destination:
            host: reviews
            subset: v1
          weight: 90
        - destination:
            host: reviews
            subset: v2
          weight: 10
      timeout: 5s
      fault:
        delay:
          percentage:
            value: 1
          fixedDelay: 2s
  exportTo:
    - "."
```

This routes canary-flagged traffic to v3 with retries, splits regular traffic 90/10 between v1 and v2, applies a 5-second timeout, and injects a 2-second delay to 1% of normal traffic for resilience testing.

Understanding every VirtualService field gives you fine-grained control over traffic flow in your mesh. You do not need to use all of them at once, but knowing they exist means you can reach for the right tool when the situation calls for it.
