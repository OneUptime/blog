# How to Read and Interpret Envoy Access Logs for Debugging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Access Logs, Debugging, Troubleshooting

Description: A comprehensive guide to understanding Envoy access log format, response flags, and using logs to debug Istio service mesh issues.

---

Envoy access logs are the single most useful debugging tool in Istio. Every request that passes through an Envoy proxy generates a log entry with detailed information about what happened. But the log format is dense and hard to read if you do not know what the fields mean. Once you learn to read them, you can diagnose most mesh issues in minutes.

## Enabling Access Logs

Access logs may not be enabled by default. Enable them mesh-wide:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy
```

Or for a specific namespace:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: namespace-logging
  namespace: my-namespace
spec:
  accessLogging:
  - providers:
    - name: envoy
```

## The Default Log Format

Istio's default access log format looks like this:

```text
[2024-01-15T10:30:45.123Z] "GET /api/users HTTP/1.1" 200 - via_upstream - "-" 0 1234 15 14 "-" "curl/7.68.0" "abc-123-def" "my-service:8080" "10.0.0.5:8080" inbound|8080|| 10.0.0.10:45678 10.0.0.5:8080 10.0.0.10:34567 outbound_.8080_._.my-service.default.svc.cluster.local default
```

Breaking this down field by field:

| Position | Field | Example | Meaning |
|----------|-------|---------|---------|
| 1 | Timestamp | `[2024-01-15T10:30:45.123Z]` | When the request completed |
| 2 | Method + Path + Protocol | `"GET /api/users HTTP/1.1"` | The HTTP request line |
| 3 | Response Code | `200` | HTTP status code |
| 4 | Response Flags | `-` | Why the response was generated (see below) |
| 5 | Response Code Details | `via_upstream` | Additional response info |
| 6 | Connection Termination | `-` | Who closed the connection |
| 7 | Upstream Service Time | `"-"` | Time in ms for upstream to respond |
| 8 | Request Body Bytes | `0` | Size of request body |
| 9 | Response Body Bytes | `1234` | Size of response body |
| 10 | Duration | `15` | Total request duration in ms |
| 11 | Upstream Duration | `14` | Time spent in upstream in ms |
| 12 | X-Forwarded-For | `"-"` | Client IP |
| 13 | User Agent | `"curl/7.68.0"` | User-Agent header |
| 14 | Request ID | `"abc-123-def"` | X-Request-Id header |
| 15 | Authority | `"my-service:8080"` | Host/Authority header |
| 16 | Upstream Host | `"10.0.0.5:8080"` | The actual upstream IP |

## Response Flags - The Most Important Field

Response flags tell you why a particular response was generated. This is where the real debugging value is:

| Flag | Meaning | Common Cause |
|------|---------|-------------|
| `-` | No flags, normal response | Everything is fine |
| `DC` | Downstream connection termination | Client closed connection |
| `DI` | Delay injected (fault injection) | VirtualService fault config |
| `FI` | Fault injected (abort) | VirtualService fault config |
| `LH` | Local service failed health check | App is unhealthy |
| `LR` | Connection local reset | Proxy reset the connection |
| `NR` | No route configured | Missing route/VirtualService |
| `RL` | Rate limited | Rate limit filter active |
| `RLSE` | Rate limit service error | Rate limit service down |
| `UC` | Upstream connection termination | Backend closed connection |
| `UF` | Upstream connection failure | Cannot connect to backend |
| `UH` | No healthy upstream | All endpoints unhealthy |
| `UO` | Upstream overflow | Circuit breaker tripped |
| `UR` | Upstream remote reset | Backend reset connection |
| `URX` | Upstream retry limit exceeded | Max retries reached |
| `UT` | Upstream request timeout | Request timed out |

Multiple flags can appear together, separated by commas: `UC,URX` means the upstream terminated the connection and retries were exhausted.

## Practical Debugging Examples

### Finding All 503 Errors

```bash
kubectl logs deploy/my-service -c istio-proxy --tail=500 | grep " 503 "
```

### Finding the Cause of 503s

```bash
# Filter for 503s and extract the response flag
kubectl logs deploy/my-service -c istio-proxy --tail=500 | grep " 503 " | awk '{print $6}' | sort | uniq -c | sort -rn
```

This tells you how many 503s are caused by each response flag. If you see lots of `UH`, you have unhealthy upstreams. If you see `UO`, circuit breakers are triggering.

### Tracking Slow Requests

```bash
# Find requests taking longer than 1000ms
kubectl logs deploy/my-service -c istio-proxy --tail=1000 | awk '{
  # Duration is typically field 11 (may vary slightly)
  if ($11+0 > 1000) print $0
}'
```

### Finding Connection Resets

```bash
kubectl logs deploy/my-service -c istio-proxy --tail=500 | grep -E "UC|UR|LR"
```

### Tracking a Specific Request

If you have a request ID (from the `x-request-id` header):

```bash
kubectl logs deploy/my-service -c istio-proxy --tail=5000 | grep "abc-123-def"
```

Check both the source and destination proxy logs to see the request from both sides.

## Understanding Inbound vs Outbound Logs

Each proxy logs both inbound (requests received) and outbound (requests sent) traffic. You can distinguish them by the route name field at the end of the log:

- **inbound|8080||** - This is an inbound request (traffic entering the service)
- **outbound|8080|v1|backend.default.svc.cluster.local** - This is an outbound request (traffic leaving to another service)

When debugging a failing request, look at the outbound log on the source and the inbound log on the destination:

```bash
# Source proxy - outbound traffic
kubectl logs deploy/frontend -c istio-proxy | grep "outbound.*backend"

# Destination proxy - inbound traffic
kubectl logs deploy/backend -c istio-proxy | grep "inbound"
```

## Custom Log Formats

You can customize the access log format to include additional fields:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFormat: |
      [%START_TIME%] "%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL%"
      %RESPONSE_CODE% %RESPONSE_FLAGS% %RESPONSE_CODE_DETAILS%
      %CONNECTION_TERMINATION_DETAILS% "%UPSTREAM_TRANSPORT_FAILURE_REASON%"
      %BYTES_RECEIVED% %BYTES_SENT% %DURATION% %RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%
      "%REQ(X-FORWARDED-FOR)%" "%REQ(USER-AGENT)%" "%REQ(X-REQUEST-ID)%"
      "%REQ(:AUTHORITY)%" "%UPSTREAM_HOST%" %UPSTREAM_CLUSTER%
      %UPSTREAM_LOCAL_ADDRESS% %DOWNSTREAM_LOCAL_ADDRESS%
      %DOWNSTREAM_REMOTE_ADDRESS% %REQUESTED_SERVER_NAME%
      %ROUTE_NAME%
```

## JSON Format for Log Aggregation

If you are using a log aggregation system like Elasticsearch or Loki, JSON format is much easier to parse:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFormat: |
      {"timestamp":"%START_TIME%","method":"%REQ(:METHOD)%","path":"%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%","protocol":"%PROTOCOL%","response_code":"%RESPONSE_CODE%","response_flags":"%RESPONSE_FLAGS%","bytes_received":"%BYTES_RECEIVED%","bytes_sent":"%BYTES_SENT%","duration":"%DURATION%","upstream_service_time":"%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%","upstream_host":"%UPSTREAM_HOST%","upstream_cluster":"%UPSTREAM_CLUSTER%","request_id":"%REQ(X-REQUEST-ID)%","authority":"%REQ(:AUTHORITY)%"}
```

## Filtering Noise

Production access logs are noisy. Filter out health checks and readiness probes to focus on real traffic:

```bash
# Skip health checks
kubectl logs deploy/my-service -c istio-proxy --tail=500 | \
  grep -v "GET /health\|GET /ready\|GET /healthz"
```

## Access Log Debugging Cheat Sheet

When you see a problem in access logs, here is your action plan:

- **NR (No Route)**: Check VirtualService config, host names, port names
- **UH (No Healthy Upstream)**: Check endpoints, outlier detection, pod health
- **UO (Upstream Overflow)**: Increase connection pool limits in DestinationRule
- **UF (Upstream Connection Failure)**: Check if the destination pod is running, check network policies
- **UC (Upstream Connection Termination)**: Backend is closing connections - check backend health, timeouts
- **UT (Upstream Timeout)**: Increase timeout in VirtualService or destination is genuinely slow
- **DC (Downstream Connection Termination)**: Client gave up waiting - reduce latency or increase client timeout

Access logs are your best friend for debugging mesh issues. Learn the response flags, and you can diagnose most problems in a single log line.
