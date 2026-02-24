# How to Debug Slow Requests Using Istio Access Logs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Latency, Debugging, Access Logs, Performance, Envoy

Description: How to use Istio access logs to identify, diagnose, and resolve slow requests in your service mesh with practical debugging techniques.

---

Slow requests are sneaky problems. Unlike errors that show up immediately in metrics and alerts, latency issues often build up gradually or affect only a subset of requests. Users complain about "sometimes slow" behavior, and you are left trying to figure out which service in a chain of ten is causing the delay.

Istio access logs are one of your best tools here. Each log entry records the total duration of the request and the upstream service time, letting you pinpoint where time is being spent. Here is a systematic approach to debugging slow requests.

## Identifying Slow Requests

### From Access Logs Directly

If access logs are in JSON format, use jq to find slow requests:

```bash
# Find requests slower than 2 seconds
kubectl logs deploy/my-service -c istio-proxy | jq 'select((.duration_ms | tonumber) > 2000)'

# Find slow requests to a specific path
kubectl logs deploy/my-service -c istio-proxy | jq 'select((.duration_ms | tonumber) > 1000 and (.path | startswith("/api/")))'
```

With TEXT format logs, the duration is the field after bytes_sent:

```bash
# This is a rough approach - extract fields positionally
kubectl logs deploy/my-service -c istio-proxy --tail=500 | awk '{
  # Duration is a numeric field, typically the 10th-11th space-separated field
  for(i=1; i<=NF; i++) {
    if ($i ~ /^[0-9]+$/ && $(i+1) ~ /^[0-9]+$|^"-"$/) {
      if ($i > 2000) print $0
      break
    }
  }
}'
```

### Using the Telemetry API to Log Only Slow Requests

Configure Istio to only log requests above a latency threshold:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: slow-request-logging
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.duration > duration('1s')"
```

This dramatically reduces log volume while capturing exactly the requests you care about.

## Understanding the Timing Fields

Istio access logs contain several timing-related fields that together tell the full story of where time was spent:

### Duration

The total time from when Envoy received the first byte of the request to when it sent the last byte of the response. This is the end-to-end latency from the sidecar's perspective.

### Upstream Service Time

The time the upstream pod took to process the request and return the response headers. This comes from the `x-envoy-upstream-service-time` response header.

### The Gap

The difference between Duration and Upstream Service Time represents:
- Time spent in the Envoy proxy processing (usually microseconds)
- Network latency between the sidecar and the upstream pod (should be minimal since they are on the same node for the inbound case, but can be significant for outbound)
- TLS handshake time
- Queue wait time if the circuit breaker is holding requests
- Time to receive and transmit the full request/response bodies

If you use the detailed format variables, you can break this down further:

```yaml
meshConfig:
  extensionProviders:
    - name: detailed-timing-log
      envoyFileAccessLog:
        path: /dev/stdout
        logFormat:
          labels:
            timestamp: "%START_TIME%"
            method: "%REQ(:METHOD)%"
            path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
            response_code: "%RESPONSE_CODE%"
            total_duration_ms: "%DURATION%"
            request_receive_ms: "%REQUEST_DURATION%"
            upstream_response_ms: "%RESPONSE_DURATION%"
            response_send_ms: "%RESPONSE_TX_DURATION%"
            upstream_service_time_ms: "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%"
            upstream_host: "%UPSTREAM_HOST%"
            request_id: "%REQ(X-REQUEST-ID)%"
```

- `REQUEST_DURATION` - Time to receive the complete request from the downstream
- `RESPONSE_DURATION` - Time waiting for the upstream response
- `RESPONSE_TX_DURATION` - Time to transmit the response to the downstream

These three should roughly add up to the total `DURATION`.

## Step-by-Step Debugging Process

### Step 1: Determine if Slowness is Service-Wide or Request-Specific

```bash
# Get P50 and P99 from recent logs
kubectl logs deploy/my-service -c istio-proxy --tail=1000 | jq '[.duration_ms | tonumber] | sort | {
  count: length,
  p50: .[length/2 | floor],
  p90: .[length*0.9 | floor],
  p99: .[length*0.99 | floor],
  max: .[-1]
}'
```

If P50 is normal but P99 is high, you have occasional slow requests (tail latency). If P50 is also high, the service is uniformly slow.

### Step 2: Compare Client-Side and Server-Side Logs

Check the outbound log on the calling service:

```bash
# Outbound logs from the caller
kubectl logs deploy/calling-service -c istio-proxy | jq 'select(.authority == "my-service.default.svc.cluster.local" and (.duration_ms | tonumber) > 2000) | {path, duration_ms, upstream_host, response_flags}'
```

Check the inbound log on the destination:

```bash
# Inbound logs on the destination
kubectl logs deploy/my-service -c istio-proxy | jq 'select((.duration_ms | tonumber) > 2000) | {path, duration_ms, upstream_service_time_ms, response_flags}'
```

Compare the durations:
- **Caller duration >> Destination duration**: The delay is in the network or proxy, not in the application
- **Caller duration similar to Destination duration**: The application itself is slow
- **No destination log entry**: The request did not reach the destination (connection timeout)

### Step 3: Check If a Specific Pod Is Slow

```bash
# Group slow requests by upstream host (pod IP)
kubectl logs deploy/calling-service -c istio-proxy | jq 'select(.authority == "my-service.default.svc.cluster.local" and (.duration_ms | tonumber) > 1000) | .upstream_host' | sort | uniq -c | sort -rn
```

If one pod has significantly more slow requests than others:
- That pod might be on an overloaded node
- It might have resource contention (check CPU throttling)
- It might be a pod that has been running for a long time and accumulated memory issues

```bash
# Check which node the slow pod is on
kubectl get pod <slow-pod> -o wide

# Check CPU throttling
kubectl top pod <slow-pod>

# Check node resource usage
kubectl top node <node-name>
```

### Step 4: Check If Specific Paths Are Slow

```bash
kubectl logs deploy/my-service -c istio-proxy | jq 'select((.duration_ms | tonumber) > 1000) | .path' | sort | uniq -c | sort -rn
```

If specific paths are slow, the issue is likely in the application logic for those endpoints rather than infrastructure.

### Step 5: Check for Retry-Induced Latency

If Istio is configured to retry failed requests, retries add latency. The total duration includes all retry attempts.

```bash
# Check if retries are configured
kubectl get virtualservice -o yaml | grep -A10 retries
```

```yaml
# Example retry config that adds latency
retries:
  attempts: 3
  perTryTimeout: 5s
  retryOn: 5xx,connect-failure
```

With this config, if the first two attempts fail with 5s timeouts and the third succeeds in 100ms, the total duration is 10.1 seconds. The access log shows a single request with a 10100ms duration and no indication that retries happened (unless you look at the response flags for `URX` when all retries fail).

### Step 6: Look for Connection Establishment Delays

A large gap between total duration and upstream service time might indicate slow connection setup:

```bash
kubectl logs deploy/calling-service -c istio-proxy | jq 'select(.authority == "my-service.default.svc.cluster.local") | {
  path: .path,
  total: (.duration_ms // .total_duration_ms),
  upstream: (.upstream_service_time_ms // "N/A"),
  gap: ((.duration_ms // .total_duration_ms | tonumber) - (.upstream_service_time_ms // "0" | tonumber))
} | select(.gap > 500)'
```

Connection establishment delays can be caused by:
- DNS resolution (check if service names resolve quickly)
- TLS handshake (mTLS adds some overhead, especially first connection)
- Connection pool exhaustion (waiting for a connection to become available)

### Step 7: Trace Across Multiple Services

For a slow request that passes through multiple services, use the request ID to track the latency at each hop:

```bash
REQUEST_ID="abc-123-def-456"

# Find this request across all sidecars
for deploy in $(kubectl get deploy -o name); do
  result=$(kubectl logs $deploy -c istio-proxy 2>/dev/null | jq "select(.request_id == \"$REQUEST_ID\") | {deploy: \"$deploy\", path, duration_ms, upstream_service_time_ms, upstream_host}" 2>/dev/null)
  if [ -n "$result" ]; then
    echo "$result"
  fi
done
```

This shows the request at each hop with its duration, letting you identify which service in the chain is responsible for the slowdown.

## Common Causes and Solutions

**Application processing time**: If upstream_service_time is high, the fix is in the application (optimize queries, add caching, fix algorithms).

**CPU throttling**: Kubernetes CPU limits cause throttling that shows up as inconsistent latency. Check with `kubectl top pod` and consider increasing CPU limits or using burstable QoS.

**Connection pool exhaustion**: If many requests show high duration but low upstream_service_time, requests might be queueing up waiting for connections. Increase `maxConnections` in the DestinationRule.

**DNS resolution**: If the first request to a new service is slow but subsequent requests are fast, DNS caching might be the issue. Istio should resolve this through its service registry, but external services can trigger real DNS lookups.

**Garbage collection**: Application GC pauses cause occasional spikes in upstream_service_time. These show up as high-duration requests concentrated on specific pods.

Access logs give you the raw data needed to identify where latency lives. Combined with the request ID for distributed tracing and the timing breakdown fields, you can systematically narrow down any slow-request issue in your mesh.
