# How to Debug Why Circuit Breaker is Not Tripping

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Circuit Breaker, Debugging, Traffic Management, Kubernetes

Description: How to troubleshoot when Istio circuit breaker settings in DestinationRule are not activating despite high error rates or connection counts.

---

You configured circuit breaking in your DestinationRule, expecting Istio to start rejecting requests when the backend is overloaded. But the circuit breaker never trips. Requests keep flowing through, the backend gets hammered, and the system degrades. Circuit breaking in Istio works differently than you might expect from libraries like Hystrix, and the debugging process requires understanding how Envoy implements it.

## How Circuit Breaking Works in Istio

First, a clarification: what Istio calls "circuit breaking" through DestinationRule `connectionPool` settings is really Envoy's connection and request limits. It's not a traditional state-machine circuit breaker (open/half-open/closed). Instead, Envoy tracks active connections and pending requests and starts rejecting new ones when limits are exceeded.

Outlier detection (also in DestinationRule) is closer to a traditional circuit breaker. It ejects individual endpoints based on error rates.

These are two different mechanisms:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
  namespace: production
spec:
  host: my-service.production.svc.cluster.local
  trafficPolicy:
    # Connection/request limits (Envoy circuit breaker)
    connectionPool:
      tcp:
        maxConnections: 10
      http:
        h2UpgradePolicy: DEFAULT
        maxRequestsPerConnection: 100
        http1MaxPendingRequests: 10
        http2MaxRequests: 100
    # Outlier detection (endpoint ejection)
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

## Step 1: Verify the DestinationRule is Applied

```bash
kubectl get destinationrule -n production
kubectl get destinationrule my-service-dr -n production -o yaml
```

Check that the proxy received the configuration:

```bash
istioctl proxy-config clusters deploy/my-client -n production \
  --fqdn my-service.production.svc.cluster.local -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for c in data:
  cb = c.get('circuitBreakers', {})
  print(f\"Cluster: {c.get('name', 'unknown')}\")
  print(f\"  Circuit breakers: {json.dumps(cb, indent=4)}\")
"
```

If the circuit breaker settings aren't showing up, the DestinationRule isn't reaching the proxy. Check namespace scoping and host matching.

## Step 2: Understand What Triggers the Circuit Breaker

The `connectionPool` settings create hard limits:

- `maxConnections`: Maximum TCP connections to the destination. If you try to open more, the request gets a 503.
- `http1MaxPendingRequests`: Maximum pending HTTP/1.1 requests (requests waiting for a connection). Excess requests get a 503.
- `http2MaxRequests`: Maximum concurrent HTTP/2 requests. Excess requests get a 503.

These limits are per-proxy, not global. If you have 3 client pods, each pod's proxy has its own limits. The total connections to the backend could be up to 3x the configured limit.

## Step 3: Check if You're Actually Hitting the Limits

The most common reason the circuit breaker doesn't trip is that your traffic doesn't exceed the limits. Check current connection counts:

```bash
kubectl exec deploy/my-client -n production -c istio-proxy -- \
  pilot-agent request GET stats | grep "cx_active\|rq_active\|rq_pending"
```

Look for:

- `upstream_cx_active`: Current active connections
- `upstream_rq_active`: Current active requests
- `upstream_rq_pending_active`: Current pending requests

If these are well below your limits, the circuit breaker won't trip. You might need to lower the limits:

```yaml
connectionPool:
  tcp:
    maxConnections: 5  # Lower limit
  http:
    http1MaxPendingRequests: 1  # Very aggressive
    http2MaxRequests: 10
```

## Step 4: Generate Enough Load to Trip the Breaker

Test with a load generator to verify the circuit breaker works at all:

```bash
# Install fortio for load testing
kubectl apply -n production -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/httpbin/sample-client/fortio-deploy.yaml
```

Send concurrent requests:

```bash
kubectl exec -n production deploy/fortio -- \
  fortio load -c 20 -qps 0 -n 200 -loglevel Warning \
  http://my-service.production:8080/api
```

With `-c 20` (20 concurrent connections) and `maxConnections: 5`, you should see some requests getting 503 responses. The output shows a breakdown of response codes.

If you see all 200s even with high concurrency, either:
- The limits are too high
- The DestinationRule isn't applied
- You're using HTTP/2, which multiplexes requests over fewer connections

## Step 5: Check HTTP/1.1 vs HTTP/2

This catches a lot of people. If your traffic uses HTTP/2 (which is the default for Istio mesh traffic), multiple requests are multiplexed over a single connection. So `maxConnections: 5` with HTTP/2 can handle hundreds of concurrent requests, because they all share 5 connections.

To limit HTTP/2 requests, use `http2MaxRequests`:

```yaml
connectionPool:
  tcp:
    maxConnections: 10
  http:
    http2MaxRequests: 50  # Limits total concurrent HTTP/2 requests
```

Check what protocol is being used:

```bash
istioctl proxy-config clusters deploy/my-client -n production \
  --fqdn my-service.production.svc.cluster.local -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for c in data:
  features = c.get('metadata', {}).get('filterMetadata', {}).get('istio', {})
  print(f\"Cluster: {c.get('name', 'unknown')}\")
  tp = c.get('typedExtensionProtocolOptions', {})
  print(f\"  Protocol options: {list(tp.keys())}\")
"
```

## Step 6: Check Envoy Circuit Breaker Stats

Envoy tracks circuit breaker activity in its stats:

```bash
kubectl exec deploy/my-client -n production -c istio-proxy -- \
  pilot-agent request GET stats | grep "circuit_breaker\|overflow\|pending_overflow"
```

Key metrics:

- `upstream_rq_pending_overflow`: Requests rejected because pending queue was full
- `upstream_cx_overflow`: Connections rejected because max connections reached
- `upstream_rq_retry_overflow`: Retries rejected because retry budget was exhausted

If these are all 0, the circuit breaker has never tripped. Either the load isn't high enough or the limits aren't configured.

## Step 7: Distinguish Connection Pool from Outlier Detection

If you're expecting the circuit breaker to trip based on error rates (not connection counts), you need outlier detection, not connection pool limits:

```yaml
# Connection pool: limits concurrent connections/requests
# Does NOT care about error rates
connectionPool:
  tcp:
    maxConnections: 100

# Outlier detection: ejects endpoints based on errors
# THIS is what reacts to error rates
outlierDetection:
  consecutive5xxErrors: 5
  interval: 10s
  baseEjectionTime: 30s
  maxEjectionPercent: 100
```

Check outlier detection stats:

```bash
kubectl exec deploy/my-client -n production -c istio-proxy -- \
  pilot-agent request GET stats | grep outlier
```

Look for:

- `outlier_detection.ejections_active`: Currently ejected endpoints
- `outlier_detection.ejections_total`: Total ejections
- `outlier_detection.ejections_consecutive_5xx`: Ejections due to consecutive 5xx errors

## Step 8: Check Per-Endpoint vs Global Behavior

Outlier detection works per endpoint (per pod), not per service. If you have 10 pods and one is returning errors, only that one pod gets ejected. The other 9 continue receiving traffic.

Connection pool limits are also per endpoint by default. If `maxConnections: 10` and you have 5 backend pods, each pod gets up to 10 connections from each client proxy, for a total of 50 connections.

## Step 9: Test Outlier Detection

Inject errors into one endpoint and verify it gets ejected:

```bash
# Find a specific pod IP
POD_IP=$(kubectl get pod -n production -l app=my-service -o jsonpath='{.items[0].status.podIP}')

# Watch for outlier ejections
kubectl exec deploy/my-client -n production -c istio-proxy -- \
  pilot-agent request GET stats | grep outlier
```

Send requests and wait for the errors to trigger ejection:

```bash
for i in $(seq 1 20); do
  kubectl exec deploy/my-client -n production -c sleep -- \
    curl -s -o /dev/null -w "%{http_code} " my-service.production:8080/
done
echo ""
```

After the ejection threshold is hit, check the endpoint status:

```bash
istioctl proxy-config endpoints deploy/my-client -n production | grep my-service
```

Ejected endpoints show as `UNHEALTHY`.

## Common Causes Summary

| Symptom | Cause | Fix |
|---------|-------|-----|
| Never trips | Limits too high | Lower maxConnections/maxRequests |
| Never trips with HTTP/2 | Connection sharing | Use http2MaxRequests instead |
| No error-based tripping | Using connectionPool not outlierDetection | Add outlierDetection config |
| Only trips sometimes | Per-proxy limits | Account for number of client pods |
| Trips too often | Limits too low | Increase limits or add more backend pods |

Circuit breaking in Istio is really two things: connection/request limits and outlier detection. Make sure you're configuring the right one for your use case. Use `fortio` for load testing and Envoy stats for verification. The proxy-level stats are the source of truth for whether the circuit breaker is actually triggering.
