# How to Set TCP Connection Limits in Istio DestinationRule

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TCP, Connection Limits, DestinationRule, Kubernetes

Description: Learn how to set TCP connection limits in Istio DestinationRule to prevent resource exhaustion and protect your upstream services.

---

TCP connection limits in Istio's DestinationRule are your first line of defense against connection flooding. When a service gets overwhelmed with too many simultaneous connections, it can run out of file descriptors, exhaust memory, or simply become unresponsive. By setting TCP limits in your DestinationRule, you tell Envoy to cap the number of connections before they reach your service.

## Why TCP Limits Matter

Every TCP connection consumes resources - file descriptors, memory for socket buffers, and CPU for connection handling. A typical Kubernetes pod can handle somewhere between 1,000 and 65,000 TCP connections depending on its configuration and resource limits.

Without limits, here is what can happen during a traffic spike:

1. A sudden burst of requests causes Envoy to open hundreds of new connections
2. Your service pods start running out of file descriptors
3. New connection attempts fail with "too many open files" errors
4. The service becomes unhealthy, triggering restarts
5. The restarting pods get hit with even more connections from retries

Setting TCP limits prevents step 1 from spiraling out of control.

## Basic TCP Connection Limit

The simplest configuration caps the total number of TCP connections:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: backend-tcp-limits
spec:
  host: backend-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
```

With this in place, each Envoy proxy will open at most 100 TCP connections to all endpoints of `backend-service` combined. If a 101st connection is needed and all 100 are in use, the request either waits in the HTTP pending queue (if configured) or gets a 503 error.

## Setting Connect Timeout

The `connectTimeout` is just as important as `maxConnections`. If a backend pod is overloaded or a network issue makes connections hang, you do not want to wait the OS default of 2 minutes:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: backend-tcp-timeout
spec:
  host: backend-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 3s
```

With `connectTimeout: 3s`, Envoy gives up after 3 seconds if the TCP handshake is not complete. This prevents connection slots from being wasted on hanging connections and gives faster feedback to the caller.

## Configuring TCP Keepalive

TCP keepalive probes detect dead connections that have not been properly closed. Without keepalive, a connection to a crashed pod can sit there indefinitely, wasting one of your `maxConnections` slots:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: backend-tcp-keepalive
spec:
  host: backend-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 3s
        tcpKeepalive:
          time: 300s
          interval: 60s
          probes: 3
```

This configuration means:
- After 300 seconds (5 minutes) of idle time, start sending keepalive probes
- Send a probe every 60 seconds
- If 3 consecutive probes get no response, close the connection

This frees up connection slots that would otherwise be stuck on dead connections.

## How maxConnections Is Distributed Across Endpoints

A common question is whether `maxConnections: 100` means 100 connections per pod or 100 connections total. The answer is total across all endpoints.

If your service has 5 pods and `maxConnections` is 100, Envoy might distribute them like:

```
Pod A: 25 connections
Pod B: 18 connections
Pod C: 22 connections
Pod D: 20 connections
Pod E: 15 connections
Total: 100 connections (limit reached)
```

The actual distribution depends on your load balancing algorithm and traffic patterns.

## Calculating the Right Limit

To figure out a good `maxConnections` value, consider:

1. **How many concurrent requests does your service handle?** If your service processes 50 requests concurrently, you need at least 50 connections (for HTTP/1.1 where each connection handles one request at a time).

2. **How many client proxies exist?** Each Envoy sidecar has its own `maxConnections` limit. 10 client pods with `maxConnections: 100` could create up to 1,000 connections to your service.

3. **What can your service handle?** Check your service's file descriptor limit (`ulimit -n` in the container) and subtract some buffer for other file descriptors (log files, etc.).

A formula that works as a starting point:

```
maxConnections = (service_fd_limit * 0.8) / number_of_client_pods
```

For example, if your service allows 10,000 file descriptors and you have 20 client pods:

```
maxConnections = (10000 * 0.8) / 20 = 400
```

## Testing TCP Limits

Deploy a test service and apply tight limits to observe the behavior:

```bash
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: test-tcp-limit
spec:
  host: backend-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 5
      http:
        http1MaxPendingRequests: 1
EOF
```

Now send concurrent requests:

```bash
kubectl run fortio --image=fortio/fortio --rm -it -- load -c 20 -qps 0 -t 10s http://backend-service:8080/
```

With only 5 max connections and 1 pending request allowed, you should see lots of 503 errors in the fortio output. The percentage of successful responses tells you how much of your load the limits can handle.

## Monitoring Connection Overflows

Envoy tracks when connection limits are hit. Check the stats:

```bash
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/stats | grep upstream_cx
```

Key metrics to watch:

- `upstream_cx_total` - Total connections opened
- `upstream_cx_active` - Currently active connections
- `upstream_cx_overflow` - Number of times maxConnections was hit
- `upstream_cx_connect_timeout` - Number of connection timeouts

If `upstream_cx_overflow` is constantly incrementing, your `maxConnections` limit is too low for your traffic pattern.

## TCP Limits Per Subset

Different subsets might need different TCP limits:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: backend-subsets
spec:
  host: backend-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 50
```

The v2 subset gets a tighter limit, which is useful during canary testing when you do not want the new version to receive too many connections.

## Combining with Circuit Breaking

TCP limits and outlier detection work well together:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: backend-protected
spec:
  host: backend-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 3s
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

TCP limits prevent connection flooding, and outlier detection removes failing endpoints. Together, they give your service robust protection against both load spikes and endpoint failures.

## Cleanup

```bash
kubectl delete destinationrule backend-tcp-limits
```

TCP connection limits are a fundamental part of production Istio configuration. Start with limits based on your service's capacity, monitor the overflow counters, and adjust. It is better to start a bit generous and tighten down than to start too tight and cause false 503 errors.
