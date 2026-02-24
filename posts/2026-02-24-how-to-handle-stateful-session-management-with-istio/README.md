# How to Handle Stateful Session Management with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Session Affinity, Load Balancing, Sticky Sessions

Description: Configure Istio for stateful session management using consistent hashing, cookie-based affinity, and header-based routing to maintain session state across requests.

---

Stateless applications are the ideal for Kubernetes, but the real world is messy. Many applications maintain server-side session state, whether it's a shopping cart, an authentication session, a file upload in progress, or a WebSocket connection. When you have session state, you need requests from the same client to reach the same backend pod. Istio provides several mechanisms to handle this without changing your application code.

## Understanding Session Affinity in Istio

Kubernetes has built-in session affinity (sessionAffinity: ClientIP on Services), but Istio overrides Kubernetes load balancing. When Istio's sidecar is present, it handles all routing decisions, so you need to configure session affinity through Istio's DestinationRule, not through the Kubernetes Service.

Istio supports consistent hash-based load balancing, which routes requests to the same backend based on a hash key derived from the request. The hash key can come from:
- HTTP headers
- Cookies
- Source IP
- Query parameters

## Cookie-Based Session Affinity

Cookie-based affinity is the most common approach for web applications. Istio can set a cookie on the first request and use it for subsequent routing:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-web-app
spec:
  host: my-web-app.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpCookie:
          name: ISTIO_SESSION
          ttl: 3600s
```

When a client makes its first request without the `ISTIO_SESSION` cookie, Envoy picks a backend using the hash ring, routes the request, and adds a `Set-Cookie: ISTIO_SESSION=<hash>` header to the response. Subsequent requests from the same client include this cookie, and Envoy routes them to the same backend.

The `ttl` controls how long the cookie is valid. After it expires, the client might be routed to a different backend. Set this to match your application's session timeout.

## Header-Based Session Affinity

If your clients send a session identifier in a header (like an auth token or session ID), you can hash on that:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-service
spec:
  host: api-service.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-session-id
```

Every request with the same `x-session-id` header value goes to the same backend. This works well for API services where clients include a session or tenant identifier in every request.

## Source IP-Based Affinity

For non-HTTP traffic or when you can't modify headers, use source IP:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: tcp-service
spec:
  host: tcp-service.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      consistentHash:
        useSourceIp: true
```

Keep in mind that in Kubernetes, the source IP seen by the sidecar is the pod IP of the calling service. So all requests from the same client pod go to the same backend. If you have a high-traffic frontend pod, all its requests to this service will hit a single backend, creating an imbalance.

## Combining Affinity with VirtualService

You can use VirtualService to apply different affinity strategies for different routes:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-web-app
spec:
  hosts:
  - my-web-app.default.svc.cluster.local
  http:
  - match:
    - uri:
        prefix: /api/session
    route:
    - destination:
        host: my-web-app.default.svc.cluster.local
        subset: session-aware
  - route:
    - destination:
        host: my-web-app.default.svc.cluster.local
        subset: default
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-web-app
spec:
  host: my-web-app.default.svc.cluster.local
  subsets:
  - name: session-aware
    labels:
      app: my-web-app
    trafficPolicy:
      loadBalancer:
        consistentHash:
          httpCookie:
            name: SESSION_ID
            ttl: 1800s
  - name: default
    labels:
      app: my-web-app
    trafficPolicy:
      loadBalancer:
        simple: ROUND_ROBIN
```

This setup uses cookie-based affinity for session-related endpoints and round-robin for everything else.

## Handling Scale Events

The biggest challenge with session affinity is what happens when you scale your backend. Consistent hashing minimizes disruption, but when a pod is added or removed, some sessions will be remapped to different backends.

Consistent hashing distributes keys across a hash ring. When a backend is added, only keys in the adjacent segment of the ring need to move. With Istio's default ring size, roughly 1/N of sessions get redistributed when a pod is added (where N is the number of pods).

To handle this gracefully:

1. Store sessions in an external store (Redis, Memcached) so any backend can serve any session
2. Use session replication between application instances
3. Accept the brief disruption and have clients retry/re-authenticate

If you're using an external session store, you still benefit from affinity for cache locality, but it's not strictly required.

## Configuring Connection Limits for Session-Heavy Services

Services that maintain session state often hold many concurrent connections. Configure appropriate limits:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: session-service
spec:
  host: session-service.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpCookie:
          name: APP_SESSION
          ttl: 7200s
    connectionPool:
      tcp:
        maxConnections: 500
      http:
        maxRequestsPerConnection: 0
        maxRetries: 3
```

Setting `maxRequestsPerConnection: 0` (unlimited) is important for session affinity. If connections are closed and re-established, the new connection might not include the affinity cookie in the initial connection setup (for HTTP/2).

## Testing Session Affinity

Verify your configuration works:

```bash
# First request - should get a Set-Cookie header
curl -v http://my-web-app:8080/api/session

# Subsequent requests with the cookie - should hit the same pod
curl -v -b "ISTIO_SESSION=<value_from_first_response>" http://my-web-app:8080/api/session

# Check which pod handled the request
kubectl logs -l app=my-web-app --all-containers=true | grep "session request"
```

You can also verify consistent routing by checking the destination pod in Envoy's access logs:

```bash
kubectl logs my-client-pod -c istio-proxy | grep "my-web-app"
```

## Monitoring Session Distribution

Make sure sessions are distributed evenly across backends:

```promql
# Requests per backend pod (should be roughly even with many clients)
sum(rate(istio_requests_total{
  destination_service="my-web-app.default.svc.cluster.local"
}[5m])) by (destination_workload, response_code)
```

If one pod is getting significantly more traffic than others, the hash distribution is skewed. This can happen if a small number of clients generate most of the traffic and they all hash to the same backend. Increasing the number of replicas or adjusting the hash key can help.

Session affinity in Istio is a balancing act between consistency (same client always hits the same backend) and even distribution (all backends share the load equally). Consistent hashing gives you the best of both worlds for most workloads.
