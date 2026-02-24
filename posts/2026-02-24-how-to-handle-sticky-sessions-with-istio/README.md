# How to Handle Sticky Sessions with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sticky Sessions, Load Balancing, Kubernetes, Session Affinity

Description: Learn how to configure sticky sessions in Istio using consistent hash load balancing based on headers, cookies, and source IP for stateful applications.

---

Most modern applications are designed to be stateless, but reality is messier than best practices. You might have a legacy application that stores session data in memory, a WebSocket server that needs long-lived connections, or a caching layer that performs better when the same user hits the same backend. In these cases, you need sticky sessions - routing requests from the same user to the same backend pod.

Kubernetes Services support `sessionAffinity: ClientIP`, but it's crude and doesn't work well with Istio since the sidecar proxy handles the routing. Istio has its own mechanism: consistent hash load balancing, which is more flexible and gives you multiple options for identifying the "same user."

## How Consistent Hashing Works

Consistent hashing maps a key (like a user ID or cookie value) to a specific backend endpoint. As long as the key is the same, the request goes to the same pod. If a pod goes away, only the traffic that was mapped to that pod gets redistributed - the rest stays on their original pods.

Istio supports consistent hashing based on:

- HTTP headers
- Cookies
- Source IP address
- Query parameters

## Session Affinity by HTTP Header

The most common approach is to use a user identifier header. Your API gateway or authentication middleware adds a user ID header, and Istio routes based on it:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: backend-dr
  namespace: default
spec:
  host: backend-service
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-user-id
```

Every request with the same `x-user-id` value goes to the same pod. Different user IDs may or may not go to the same pod depending on the hash distribution, but the same ID always maps to the same backend.

Test it:

```bash
# These should all hit the same pod
for i in $(seq 1 10); do
  curl -H "x-user-id: user-123" http://backend-service:8080/api/data
done

# These should hit a potentially different pod
for i in $(seq 1 10); do
  curl -H "x-user-id: user-456" http://backend-service:8080/api/data
done
```

## Session Affinity by Cookie

For browser-based applications where you can't control request headers directly, use cookie-based session affinity:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: webapp-dr
  namespace: default
spec:
  host: webapp
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpCookie:
          name: istio-session
          ttl: 3600s
```

When a request arrives without the `istio-session` cookie, Istio picks a backend and sets the cookie in the response. Subsequent requests include the cookie, and Istio routes them to the same backend.

The `ttl` field controls how long the cookie is valid. After 3600 seconds (1 hour), the browser drops the cookie and the next request gets a fresh assignment.

## Session Affinity by Source IP

If you can't use headers or cookies (for example, with non-HTTP protocols or clients you don't control), use source IP:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: legacy-app-dr
  namespace: default
spec:
  host: legacy-app
  trafficPolicy:
    loadBalancer:
      consistentHash:
        useSourceIp: true
```

Be careful with source IP affinity when traffic comes through a load balancer or proxy, because all requests might appear to come from the same IP. In that case, use `x-forwarded-for` or another header instead.

## Session Affinity by Query Parameter

Route based on a URL query parameter:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-dr
  namespace: default
spec:
  host: api-service
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpQueryParameterName: session_id
```

Requests to `http://api-service/data?session_id=abc123` will always go to the same backend.

## Combining with Subsets

You can use consistent hashing with subsets for more targeted session affinity:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: webapp-dr
  namespace: default
spec:
  host: webapp
  subsets:
  - name: v1
    labels:
      version: v1
    trafficPolicy:
      loadBalancer:
        consistentHash:
          httpCookie:
            name: istio-session-v1
            ttl: 1800s
  - name: v2
    labels:
      version: v2
    trafficPolicy:
      loadBalancer:
        consistentHash:
          httpCookie:
            name: istio-session-v2
            ttl: 1800s
```

Each version subset has its own session cookie. This is useful during canary deployments where you want session affinity within each version.

## WebSocket Sticky Sessions

WebSocket connections are inherently sticky - once established, the connection persists. But the initial HTTP upgrade request that establishes the WebSocket still needs to be routed. Use consistent hashing for the upgrade request:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: websocket-dr
  namespace: default
spec:
  host: websocket-server
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-session-id
    connectionPool:
      http:
        h2UpgradePolicy: UPGRADE
```

Also configure the VirtualService to allow WebSocket upgrades:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: websocket-vs
  namespace: default
spec:
  hosts:
  - websocket-server
  http:
  - match:
    - headers:
        upgrade:
          exact: websocket
    route:
    - destination:
        host: websocket-server
    timeout: 0s
```

Setting `timeout: 0s` disables the timeout for WebSocket connections, which are long-lived by nature.

## What Happens When a Pod Scales Down

When a pod that has session affinity gets removed (scaling down, rolling update, pod eviction), the sessions that were pinned to it need to go somewhere. Consistent hashing handles this gracefully - only the sessions mapped to the removed pod get redistributed. All other sessions stay on their original pods.

However, the redistributed sessions will lose any in-memory state. If your application stores session data in memory, those users will essentially start a new session. To handle this:

1. Use external session storage (Redis, Memcached) when possible
2. Configure your application to handle session recreation gracefully
3. Use PodDisruptionBudgets to prevent too many pods from going away at once:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: webapp-pdb
  namespace: default
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: webapp
```

## Monitoring Session Distribution

Check if your session affinity is working by looking at per-pod traffic distribution:

```bash
# Check request distribution across pods
istioctl proxy-config stats deploy/webapp -n default | grep upstream_rq_total
```

You can also check the Envoy consistent hash stats:

```bash
istioctl proxy-config stats deploy/frontend -n default | grep lb_healthy_panic
```

In Prometheus:

```bash
# Requests per pod (should show uneven distribution with session affinity)
sum(rate(istio_requests_total{destination_workload="webapp"}[5m])) by (destination_workload_instance)
```

With round-robin, you'd expect roughly equal distribution. With consistent hashing, the distribution depends on your key distribution. If most of your traffic comes from a few heavy users, those users' pods will get more traffic.

## Performance Considerations

Consistent hashing adds minimal overhead - it's just a hash computation per request. However, uneven key distribution can cause hot spots where one pod handles much more traffic than others.

If you see this happening:

1. Use a more uniformly distributed key (UUID-based user IDs distribute better than sequential IDs)
2. Scale up the number of replicas to distribute the hash ring more evenly
3. Monitor per-pod CPU and memory to catch hot spots early

Sticky sessions in Istio work well for applications that need session affinity. Consistent hash load balancing gives you more options than Kubernetes' built-in `sessionAffinity`, and the integration with Istio's traffic management means you can combine session affinity with canary deployments, fault injection, and other mesh features.
