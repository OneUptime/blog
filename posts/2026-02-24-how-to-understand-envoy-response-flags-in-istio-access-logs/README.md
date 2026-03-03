# How to Understand Envoy Response Flags in Istio Access Logs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Response Flags, Access Logs, Debugging, Troubleshooting

Description: A comprehensive guide to Envoy response flags in Istio access logs, what each flag means, and how to use them for diagnosing service mesh issues.

---

If there is one field in Istio access logs that deserves your full attention, it is the response flags field. When a request goes wrong, the HTTP status code tells you what happened at a high level (503 means "service unavailable"), but the response flags tell you why. They are Envoy's way of explaining the specific condition that caused or influenced the response.

A 503 could mean a dozen different things. The response flag narrows it down to one.

## Where to Find Response Flags

In the default TEXT access log format, response flags appear right after the response code:

```text
[2026-02-24T10:00:00.000Z] "GET /api/users HTTP/1.1" 503 UF via_upstream ...
```

In this example, `UF` is the response flag. It tells you this 503 was caused by an upstream connection failure.

In JSON access logs, response flags appear in the `response_flags` field:

```json
{
  "response_code": 503,
  "response_flags": "UF",
  ...
}
```

A dash (`-`) means no flags were set - the response was normal.

## Complete Response Flags Reference

### Upstream Connection Flags

**UF - Upstream Connection Failure**

Envoy tried to establish a connection to the upstream pod and failed. This is one of the most common flags you will see.

Common causes:
- The destination pod is not running or crashed
- The destination port is not open
- Network policy is blocking the connection
- The pod's sidecar is not ready

How to investigate:
```bash
# Check if the destination pod is running
kubectl get pods -l app=destination-service
# Check if the port is actually open
kubectl exec deploy/destination-service -- netstat -tlnp | grep 8080
```

**UC - Upstream Connection Termination**

The connection to the upstream was established but was then closed unexpectedly by the upstream.

Common causes:
- The upstream application crashed while processing the request
- The upstream reached a connection limit and terminated the connection
- A keep-alive timeout on the upstream expired

**UH - No Healthy Upstream**

Envoy found the service but all upstream endpoints are marked as unhealthy.

Common causes:
- Health checks are failing for all pods
- DestinationRule has an outlier detection configuration that has ejected all endpoints
- All pods are in a crash loop

How to investigate:
```bash
# Check endpoint health in Envoy
istioctl proxy-config endpoint deploy/source-service | grep destination-service
# Look for UNHEALTHY status
```

**UT - Upstream Request Timeout**

The upstream took longer to respond than the configured timeout.

Common causes:
- The timeout in the VirtualService is too short
- The upstream is overloaded and processing slowly
- A dependent service (database, external API) is slow

Where to check the timeout:
```bash
# Check VirtualService timeout settings
kubectl get virtualservice -o yaml | grep -A5 timeout
```

**UO - Upstream Overflow (Circuit Breaking)**

The request was rejected because the circuit breaker tripped. The upstream has too many pending requests or connections.

Common causes:
- The `maxConnections`, `maxPendingRequests`, or `maxRequestsPerConnection` limit in the DestinationRule was exceeded
- A sudden traffic spike overwhelmed the upstream

How to check:
```bash
# Check DestinationRule circuit breaker settings
kubectl get destinationrule -o yaml | grep -A10 connectionPool
```

**URX - Upstream Retry Limit Exceeded**

Envoy retried the request the maximum number of times and all retries failed.

This often appears combined with another flag, like `URX,UC` (retries exhausted because upstream connections kept being terminated).

### Routing Flags

**NR - No Route Configured**

Envoy could not find a route for this request. There is no matching VirtualService, or the service does not exist in the mesh.

Common causes:
- Misspelled service name in the application
- Missing VirtualService for the destination
- The destination service is in a namespace not included in the mesh

How to investigate:
```bash
# Check if the route exists in the proxy configuration
istioctl proxy-config route deploy/source-service | grep destination-service
```

**UMSDR - Upstream Max Stream Duration Reached**

The maximum stream duration was reached. This applies to long-lived connections like gRPC streams.

### Security Flags

**UAEX - Unauthorized External Authorization**

An external authorization service (configured via AuthorizationPolicy) denied the request.

How to investigate:
```bash
# Check AuthorizationPolicy resources
kubectl get authorizationpolicy -A
# Check the ext-authz service logs
kubectl logs deploy/ext-authz-service
```

### Fault Injection Flags

**DI - Delay Injected**

The response was delayed by a fault injection rule. If you see this in production and did not intend it, check for leftover VirtualService fault injection rules:

```bash
kubectl get virtualservice -A -o yaml | grep -B5 -A5 "fault:"
```

**FI - Fault Injected (Abort)**

The request was aborted by a fault injection rule. Envoy returned an error without forwarding the request to the upstream.

### Rate Limiting Flags

**RL - Rate Limited Locally**

The request was rate-limited by Envoy's local rate limiter.

**RLSE - Rate Limited by Service Extension**

The request was rate-limited by an external rate limiting service.

### Connection Flags

**DC - Downstream Connection Termination**

The downstream client (the caller) closed the connection before the response was complete.

Common causes:
- The client timed out waiting for a response and gave up
- The client application crashed
- A load balancer between the client and the service timed out

**LH - Local Healthcheck Failed**

The local Envoy sidecar's health check failed. This means Envoy itself is unhealthy.

**IH - Invalid Headers**

Envoy rejected the request because it contained invalid headers according to strict HTTP validation.

## Multiple Flags

Flags can appear combined, separated by commas:

- `URX,UC` - Retries exhausted, and each attempt failed due to upstream connection termination
- `URX,UF` - Retries exhausted, and each attempt failed due to upstream connection failure
- `DC,UC` - Both the downstream and upstream connections were terminated

## Monitoring Response Flags

Track response flags as a metric dimension:

```promql
# Count of each response flag
sum(rate(istio_requests_total{response_flags!="-"}[5m])) by (response_flags, destination_service)

# Most common failure flags
topk(10, sum(rate(istio_requests_total{response_flags!~"-|UAEX"}[5m])) by (response_flags))
```

Create alerts for concerning flags:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-response-flag-alerts
  namespace: monitoring
spec:
  groups:
    - name: istio-response-flags
      rules:
        - alert: IstioNoHealthyUpstream
          expr: |
            sum(rate(istio_requests_total{response_flags="UH"}[5m])) by (destination_service) > 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "No healthy upstream for {{ $labels.destination_service }}"
            description: "All endpoints are unhealthy. Check pod status and health checks."

        - alert: IstioCircuitBreakerTripping
          expr: |
            sum(rate(istio_requests_total{response_flags="UO"}[5m])) by (destination_service) > 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Circuit breaker tripping for {{ $labels.destination_service }}"
            description: "Requests are being rejected by circuit breaker. Consider scaling up or adjusting limits."

        - alert: IstioUpstreamTimeouts
          expr: |
            sum(rate(istio_requests_total{response_flags="UT"}[5m])) by (destination_service)
            /
            sum(rate(istio_requests_total[5m])) by (destination_service)
            > 0.05
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High timeout rate for {{ $labels.destination_service }}"
```

## Practical Debugging Workflow

When you see errors in your mesh, use this decision tree:

1. **What is the response flag?**
   - `UF` or `UC` -> Check pod health, restarts, and network
   - `UH` -> Check health check configuration and endpoint status
   - `UT` -> Check timeout configuration and upstream processing time
   - `UO` -> Check circuit breaker configuration and scaling
   - `NR` -> Check routing configuration (VirtualService, DestinationRule)
   - `-` (no flag) -> The upstream application returned this error itself

2. **Is the flag consistent or intermittent?**
   - Consistent -> Configuration or capacity issue
   - Intermittent -> Possibly a transient issue, retry configuration might help

3. **Does it affect all callers or specific ones?**
   - All callers -> Destination service issue
   - Specific callers -> Check caller-specific routing or network policies

Response flags are the single most useful piece of diagnostic information in Istio access logs. Learning to read them fluently saves significant time during incident response.
