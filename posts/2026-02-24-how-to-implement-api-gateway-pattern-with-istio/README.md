# How to Implement API Gateway Pattern with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Gateway, Kubernetes, Service Mesh, Microservices

Description: Learn how to implement the API gateway pattern using Istio's ingress gateway, virtual services, and destination rules for production microservices.

---

If you've built microservices on Kubernetes, you know the pain of exposing them to the outside world. You need routing, TLS termination, rate limiting, authentication, and a dozen other things. Traditionally, teams reach for dedicated API gateway products like Kong or Ambassador. But if you're already running Istio, you have a perfectly capable API gateway built right into your service mesh.

Istio's ingress gateway handles external traffic entering the mesh. Combined with VirtualService and DestinationRule resources, you can build a full-featured API gateway without adding another tool to your stack.

## Why Use Istio as an API Gateway

The main advantage is simplicity. Instead of managing a separate API gateway deployment with its own configuration language, you use the same Istio resources you already know. Your gateway config lives alongside your service mesh config, which means one set of tools, one config language, and one control plane to manage.

Istio's gateway also integrates natively with the mesh's mTLS, telemetry, and policy enforcement. Traffic that enters through the gateway automatically gets the same observability and security as internal mesh traffic.

## Setting Up the Istio Ingress Gateway

When you install Istio, the ingress gateway is deployed by default in the `istio-system` namespace. Verify it's running:

```bash
kubectl get pods -n istio-system -l app=istio-ingressgateway
kubectl get svc -n istio-system istio-ingressgateway
```

The service will have an external IP (or LoadBalancer IP on cloud providers). This is the entry point for all external traffic.

## Configuring a Gateway Resource

The Gateway resource tells Istio which ports and protocols to listen on. Here's a basic setup for HTTP and HTTPS:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: api-gateway
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
    - "api.example.com"
    tls:
      httpsRedirect: true
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "api.example.com"
    tls:
      mode: SIMPLE
      credentialName: api-tls-cert
```

The `credentialName` references a Kubernetes secret containing your TLS certificate. Create it like this:

```bash
kubectl create secret tls api-tls-cert \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  -n istio-system
```

Note that the secret must be in the `istio-system` namespace (or wherever your ingress gateway runs).

## Routing Traffic to Backend Services

With the Gateway in place, use VirtualService resources to route traffic to your backend services. This is where the API gateway pattern really takes shape:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-routes
  namespace: default
spec:
  hosts:
  - "api.example.com"
  gateways:
  - api-gateway
  http:
  - match:
    - uri:
        prefix: /users
    route:
    - destination:
        host: user-service
        port:
          number: 8080
  - match:
    - uri:
        prefix: /orders
    route:
    - destination:
        host: order-service
        port:
          number: 8080
  - match:
    - uri:
        prefix: /products
    route:
    - destination:
        host: product-service
        port:
          number: 8080
```

This routes `/users/*` to the user service, `/orders/*` to the order service, and `/products/*` to the product service. Simple path-based routing, which is the bread and butter of any API gateway.

## URL Rewriting

Sometimes your backend services don't expect the same path prefix. For example, the user service might expect requests at `/` rather than `/users`. You can rewrite the URI:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-routes
  namespace: default
spec:
  hosts:
  - "api.example.com"
  gateways:
  - api-gateway
  http:
  - match:
    - uri:
        prefix: /users
    rewrite:
      uri: /
    route:
    - destination:
        host: user-service
        port:
          number: 8080
```

## Adding Request Headers

API gateways often add or modify headers before forwarding requests. Istio supports this through the `headers` field:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-routes
  namespace: default
spec:
  hosts:
  - "api.example.com"
  gateways:
  - api-gateway
  http:
  - match:
    - uri:
        prefix: /users
    headers:
      request:
        add:
          x-gateway-version: "v1"
          x-request-start: "%START_TIME%"
        remove:
        - x-internal-header
    route:
    - destination:
        host: user-service
        port:
          number: 8080
```

## Header-Based Routing

You can route traffic based on request headers, which is useful for API versioning:

```yaml
http:
- match:
  - headers:
      api-version:
        exact: "v2"
    uri:
      prefix: /users
  route:
  - destination:
      host: user-service-v2
      port:
        number: 8080
- match:
  - uri:
      prefix: /users
  route:
  - destination:
      host: user-service-v1
      port:
        number: 8080
```

Requests with `api-version: v2` header go to v2 of the service, everything else goes to v1.

## CORS Configuration

Cross-origin resource sharing is another common API gateway responsibility. Configure it in the VirtualService:

```yaml
http:
- match:
  - uri:
      prefix: /api
  corsPolicy:
    allowOrigins:
    - exact: "https://app.example.com"
    allowMethods:
    - GET
    - POST
    - PUT
    - DELETE
    allowHeaders:
    - authorization
    - content-type
    maxAge: "24h"
  route:
  - destination:
      host: backend-service
      port:
        number: 8080
```

## Connection Pooling and Circuit Breaking

Use DestinationRule resources to configure connection pooling and circuit breaking for your backend services:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: user-service-dr
  namespace: default
spec:
  host: user-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

This limits connections, queues requests when the backend is overwhelmed, and ejects unhealthy instances from the load balancing pool.

## Timeouts and Retries

Set timeouts and retries on a per-route basis:

```yaml
http:
- match:
  - uri:
      prefix: /users
  timeout: 10s
  retries:
    attempts: 3
    perTryTimeout: 3s
    retryOn: 5xx,reset,connect-failure
  route:
  - destination:
      host: user-service
      port:
        number: 8080
```

## Testing the Gateway

Once everything is deployed, test your gateway setup:

```bash
# Get the gateway external IP
export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test routing
curl -H "Host: api.example.com" http://$INGRESS_HOST/users
curl -H "Host: api.example.com" http://$INGRESS_HOST/orders

# Test with headers
curl -H "Host: api.example.com" -H "api-version: v2" http://$INGRESS_HOST/users
```

## Production Considerations

When running Istio as your API gateway in production, keep a few things in mind. First, scale the ingress gateway horizontally using a HorizontalPodAutoscaler. The gateway pods handle all external traffic, so they need enough capacity.

Second, monitor the gateway using Istio's built-in metrics. The `istio_requests_total` and `istio_request_duration_milliseconds` metrics from the gateway give you visibility into all incoming traffic.

Third, consider using Istio's AuthorizationPolicy to enforce authentication at the gateway level. You can validate JWT tokens before traffic even reaches your services, which reduces load on your backend.

The API gateway pattern with Istio works well for most use cases. You get routing, TLS, header manipulation, retries, timeouts, and circuit breaking without adding another tool. The configuration is declarative and version-controlled, which makes it easy to audit and roll back changes.
