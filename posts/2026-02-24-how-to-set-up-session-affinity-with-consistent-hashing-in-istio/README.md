# How to Set Up Session Affinity with Consistent Hashing in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Session Affinity, Consistent Hashing, DestinationRule, Sticky Sessions

Description: Implement session affinity in Istio using consistent hash load balancing with cookies, headers, source IP, or query parameters.

---

Session affinity (also called sticky sessions) means routing all requests from the same user or session to the same backend pod. This is necessary when your application stores session state in memory, maintains per-user caches, or uses WebSocket connections that need to stay on the same server.

Istio handles session affinity through consistent hash load balancing in the DestinationRule. You pick a hash key that identifies the session, and Envoy ensures all requests with the same key value go to the same pod.

## Choosing the Right Hash Key

The hash key you choose determines how sessions are identified. Pick the wrong one and you either get no affinity at all or too many sessions on one pod.

**HTTP Cookie** - Best for web applications. Envoy can auto-generate the cookie on first request. Every browser sends cookies automatically, so it works without any client-side changes.

**HTTP Header** - Best for API services where clients can set custom headers like `x-user-id` or `Authorization`. You control exactly which header to hash on.

**Source IP** - Simplest option but least reliable. Clients behind NAT or load balancers share the same IP, so different users might get the same pod. Works okay for internal service-to-service calls.

**Query Parameter** - Hash on a URL query parameter. Useful for services where the user ID or session ID is passed in the URL.

## Cookie-Based Session Affinity

This is the most common setup for web applications. Envoy generates a cookie on the first request and uses it to maintain affinity:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: web-app-affinity
spec:
  host: web-app
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpCookie:
          name: ISTIO_SESSION
          path: /
          ttl: 1800s
```

How this works step by step:

1. User makes first request to web-app
2. Envoy picks a backend pod (randomly, since no cookie exists yet)
3. Envoy adds a `Set-Cookie: ISTIO_SESSION=<hash>; Path=/; Max-Age=1800` header to the response
4. Browser stores the cookie
5. On subsequent requests, browser sends the cookie
6. Envoy hashes the cookie value and routes to the same pod

The `ttl` of 1800 seconds (30 minutes) means the session affinity lasts 30 minutes. After that, the cookie expires and the next request starts fresh.

## Header-Based Session Affinity

For API services, header-based hashing is clean and explicit:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-affinity
spec:
  host: api-service
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-user-id
```

Every request must include the `x-user-id` header:

```bash
curl -H "x-user-id: user-42" http://api-service:8080/data
```

All requests from user-42 go to the same pod. If a request comes in without the header, Envoy treats the hash key as empty and all such requests may end up on the same pod - which is not what you want. Make sure your clients always send the header.

## Source IP-Based Affinity

The simplest to configure but with the most caveats:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: service-ip-affinity
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      consistentHash:
        useSourceIp: true
```

This works well for service-to-service communication within the mesh because each pod has a unique IP. But for external traffic coming through an ingress gateway, all requests might appear to come from the gateway's IP, defeating the purpose.

## Full Working Example with Testing

Deploy a stateful web application:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 4
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: nginx:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: web-app
spec:
  selector:
    app: web-app
  ports:
  - name: http
    port: 80
    targetPort: 80
```

Apply the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: web-app-affinity
spec:
  host: web-app
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpCookie:
          name: SERVER_ID
          ttl: 3600s
```

```bash
kubectl apply -f web-app.yaml
kubectl apply -f web-app-dr.yaml
```

Test from a curl pod:

```bash
kubectl run curl-test --image=curlimages/curl -it --rm -- sh
```

First request to get the cookie:

```bash
curl -v http://web-app/
```

Note the `Set-Cookie` header value. Then test affinity:

```bash
# All of these should hit the same pod
curl -b "SERVER_ID=abc123def" http://web-app/
curl -b "SERVER_ID=abc123def" http://web-app/
curl -b "SERVER_ID=abc123def" http://web-app/
```

## Handling Failover

What happens when the pod your session is pinned to goes down? Envoy detects the endpoint as unhealthy (either through outlier detection or Kubernetes endpoint updates) and removes it from the hash ring. Your session key then maps to a different pod.

This means session data stored only in memory will be lost. To handle this gracefully:

1. Use outlier detection to quickly detect failures
2. Design your app to handle session recreation
3. Consider external session stores (Redis) for critical session data

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: web-app-resilient
spec:
  host: web-app
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpCookie:
          name: SERVER_ID
          ttl: 3600s
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

## Session Affinity Through an Ingress Gateway

For traffic coming from outside the mesh, you need to make sure the cookie-based affinity works through the gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: web-app-vs
spec:
  hosts:
  - web-app.example.com
  gateways:
  - my-gateway
  http:
  - route:
    - destination:
        host: web-app
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: web-app-affinity
spec:
  host: web-app
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpCookie:
          name: SERVER_ID
          ttl: 3600s
```

The gateway proxy handles both the VirtualService routing and the DestinationRule affinity. Cookies get set in responses passing through the gateway and are sent back by the browser on subsequent requests.

## Monitoring Session Distribution

To see how sessions are distributed across pods:

```bash
istioctl proxy-config endpoint <client-pod> --cluster "outbound|80||web-app.default.svc.cluster.local"
```

This shows all endpoints and their health status. If you see one endpoint getting significantly more traffic than others, you might have a hot-key problem where many sessions hash to the same position.

## Cleanup

```bash
kubectl delete destinationrule web-app-affinity
kubectl delete virtualservice web-app-vs
kubectl delete deployment web-app
kubectl delete service web-app
```

Session affinity with consistent hashing is straightforward to set up in Istio. Cookie-based is the most practical for web applications, header-based works best for APIs, and source IP is a simple fallback. Just remember that session affinity is not the same as guaranteed delivery to the same pod - failover will happen, and your application should be prepared for it.
