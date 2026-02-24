# How to Rewrite URIs Using Istio VirtualService

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, URI Rewrite, Traffic Management, Kubernetes

Description: Learn how to use Istio VirtualService to rewrite request URIs before forwarding them to backend services, with practical examples.

---

URI rewriting lets you change the path of a request before it reaches the backend service. This is incredibly useful when your public-facing URL structure is different from what your services expect internally. Instead of making your service handle every possible URL pattern, you rewrite the path at the proxy layer and keep your services clean.

## Basic URI Rewrite

The simplest form of URI rewriting replaces a matched prefix with a new one:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - uri:
            prefix: "/api/v2/users"
      rewrite:
        uri: "/users"
      route:
        - destination:
            host: user-service
            port:
              number: 80
```

A request to `/api/v2/users/123` gets rewritten to `/users/123` before hitting the user-service. The prefix `/api/v2/users` is replaced with `/users`, and the rest of the path is preserved.

## How Prefix Rewriting Works

When you use prefix matching with rewrite, Istio replaces just the matched prefix portion:

- Request: `/api/v2/users/123/orders`
- Match prefix: `/api/v2/users`
- Rewrite URI: `/users`
- Result: `/users/123/orders`

The `/123/orders` part after the matched prefix is carried over automatically.

## Rewriting to Root

A common pattern is stripping a prefix entirely:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - uri:
            prefix: "/service-a"
      rewrite:
        uri: "/"
      route:
        - destination:
            host: service-a
            port:
              number: 80
    - match:
        - uri:
            prefix: "/service-b"
      rewrite:
        uri: "/"
      route:
        - destination:
            host: service-b
            port:
              number: 80
```

Requests to `/service-a/health` become `/health`, and `/service-b/api/data` becomes `/api/data`. This is the pattern you see when an API gateway routes to multiple microservices based on a path prefix, but the services themselves do not know about that prefix.

## API Versioning with URI Rewrite

URI rewriting is great for API versioning. You can expose versioned URLs publicly while routing to the same or different backends:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-gateway
  namespace: default
spec:
  hosts:
    - api-gateway
  http:
    - match:
        - uri:
            prefix: "/api/v3"
      rewrite:
        uri: "/api"
      route:
        - destination:
            host: api-service-v3
            port:
              number: 80
    - match:
        - uri:
            prefix: "/api/v2"
      rewrite:
        uri: "/api"
      route:
        - destination:
            host: api-service-v2
            port:
              number: 80
    - match:
        - uri:
            prefix: "/api/v1"
      rewrite:
        uri: "/api"
      route:
        - destination:
            host: api-service-v1
            port:
              number: 80
```

All three versions strip their version prefix and route to the appropriate backend. Each backend just handles `/api/*` without worrying about version prefixes.

## Rewriting with Exact Match

When using exact URI matching, the entire path is replaced:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - uri:
            exact: "/old-endpoint"
      rewrite:
        uri: "/new-endpoint"
      route:
        - destination:
            host: my-app
            port:
              number: 80
```

A request to `/old-endpoint` gets rewritten to `/new-endpoint`. This is useful for handling legacy URL paths.

## Authority Rewrite

Besides the URI, you can also rewrite the Authority (Host) header:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - uri:
            prefix: "/external-api"
      rewrite:
        uri: "/api"
        authority: "partner-api.example.com"
      route:
        - destination:
            host: external-proxy
            port:
              number: 80
```

This rewrites both the path and the Host header. The backend (or an upstream proxy) receives a request that looks like it was directed at `partner-api.example.com/api`.

## Combining Rewrite with Other Features

URI rewrite works well with other VirtualService features:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - uri:
            prefix: "/legacy-api"
          headers:
            x-api-version:
              exact: "2"
      rewrite:
        uri: "/v2/api"
      route:
        - destination:
            host: api-service
            port:
              number: 80
      timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
```

The rewrite happens alongside timeout and retry settings.

## Full Working Example with Gateway

Here is a complete example showing URI rewriting for an ingress use case:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: my-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "myapp.example.com"
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - "myapp.example.com"
  gateways:
    - my-gateway
  http:
    - match:
        - uri:
            prefix: "/users"
      rewrite:
        uri: "/"
      route:
        - destination:
            host: user-service.default.svc.cluster.local
            port:
              number: 80
    - match:
        - uri:
            prefix: "/orders"
      rewrite:
        uri: "/"
      route:
        - destination:
            host: order-service.default.svc.cluster.local
            port:
              number: 80
    - route:
        - destination:
            host: frontend.default.svc.cluster.local
            port:
              number: 80
```

External requests to `myapp.example.com/users/123` get rewritten to `/123` and forwarded to the user-service. Requests to `myapp.example.com/orders/456` get rewritten to `/456` and forwarded to the order-service.

## Verifying Rewrites

To make sure your rewrites are working:

```bash
# Apply the config
kubectl apply -f virtualservice.yaml

# Check the proxy config
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system -o json

# Test with curl (verbose to see headers)
curl -v http://myapp.example.com/api/v2/users/123

# Check proxy logs for the rewritten path
kubectl logs deploy/user-service -c istio-proxy | grep "path"
```

## Gotchas

A few things to watch out for:

1. **Trailing slashes matter.** `/api` and `/api/` are different prefixes. If your rewrite strips a prefix but leaves a double slash, your backend might not handle it well.

2. **Query parameters are preserved.** URI rewriting only affects the path. Query parameters pass through unchanged.

3. **The rewrite happens before the request reaches the backend.** Your backend sees the rewritten path, not the original one. If you need the original path for logging, it is lost unless you add it as a header.

4. **Regex-based rewriting is not supported** in the `rewrite` field. You can match with regex but can only rewrite to a fixed string. For complex rewrites, consider using an EnvoyFilter.

URI rewriting keeps your public API clean and your internal services simple. The proxy handles the translation, so your services only need to know about their own paths.
