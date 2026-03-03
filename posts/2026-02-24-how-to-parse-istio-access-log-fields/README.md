# How to Parse Istio Access Log Fields

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Access Logs, Envoy, Parsing, Debugging, Observability

Description: A detailed reference for understanding and parsing every field in Istio access logs, with practical examples for troubleshooting.

---

Istio access logs pack a lot of information into each line, but reading them is not intuitive if you do not know what each field means. This is especially true for the default TEXT format, where fields are positional and there is no obvious labeling. Even with JSON format, some fields have values that are not self-explanatory.

This guide is a practical reference for parsing and understanding Istio access log fields.

## The Default TEXT Format

The default Istio access log format produces lines like this:

```text
[2026-02-24T14:23:15.456Z] "POST /api/orders HTTP/1.1" 503 UC via_upstream - "-" 156 91 30004 - "-" "python-requests/2.31.0" "f47ac10b-58cc-4372-a567-0e02b2c3d479" "order-service.production.svc.cluster.local" "10.244.3.12:8080" outbound|8080||order-service.production.svc.cluster.local 10.244.1.5:54321 10.96.45.67:8080 10.244.1.5:33210 - default
```

Here is every field broken down with its position:

### Field 1: Timestamp

```text
[2026-02-24T14:23:15.456Z]
```

The time when Envoy started processing the request. Uses ISO 8601 format with millisecond precision. Always in UTC.

### Field 2: Request Line

```text
"POST /api/orders HTTP/1.1"
```

Contains the HTTP method, the request path (or the original path before any rewriting), and the HTTP protocol version. Enclosed in double quotes.

For gRPC requests, this shows as:
```text
"POST /package.ServiceName/MethodName HTTP/2"
```

### Field 3: Response Code

```text
503
```

The HTTP status code returned to the client. For gRPC, this is usually 200 even when the gRPC status is an error - you need to look at the gRPC status separately.

### Field 4: Response Flags

```text
UC
```

This is one of the most important fields for debugging. Response flags indicate what happened at the Envoy proxy level. A dash (`-`) means no special condition. I will cover the full list below.

### Field 5: Response Code Details

```text
via_upstream
```

Explains how the response code was determined:
- `via_upstream` - The upstream service returned this code
- `direct_response` - Envoy generated the response directly (e.g., 404 for no route)
- `route_not_found` - No matching route was found

### Field 6: Connection Termination Details

```text
-
```

Details about why a connection was terminated. Usually a dash unless something went wrong.

### Field 7: Upstream Transport Failure Reason

```text
"-"
```

If the connection to the upstream failed, this explains why (e.g., TLS handshake failure). Enclosed in quotes.

### Field 8: Bytes Received

```text
156
```

The number of bytes in the request body received from the downstream client.

### Field 9: Bytes Sent

```text
91
```

The number of bytes in the response body sent to the downstream client.

### Field 10: Duration

```text
30004
```

Total duration of the request in milliseconds, from when Envoy received the first byte of the request to when it sent the last byte of the response (or closed the connection). This is the end-to-end latency from the proxy's perspective.

### Field 11: Upstream Service Time

```text
-
```

The time in milliseconds that the upstream service took to process the request and send back the response headers. This comes from the `x-envoy-upstream-service-time` response header. A dash means it was not available (common when the upstream did not respond or the connection failed).

The difference between Duration and Upstream Service Time represents the network and proxy overhead.

### Field 12: X-Forwarded-For

```text
"-"
```

The X-Forwarded-For header value, showing the client IP chain. A dash means it was not set.

### Field 13: User Agent

```text
"python-requests/2.31.0"
```

The User-Agent header from the request.

### Field 14: Request ID

```text
"f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

The unique request ID assigned by Istio. This is propagated through the entire call chain, making it possible to trace a request across multiple services. This value is in the `x-request-id` header.

### Field 15: Authority

```text
"order-service.production.svc.cluster.local"
```

The value of the Host header (HTTP/1.1) or the :authority pseudo-header (HTTP/2). This tells you the intended destination of the request.

### Field 16: Upstream Host

```text
"10.244.3.12:8080"
```

The IP address and port of the actual upstream pod that handled the request. This is the specific pod that was selected by Envoy's load balancer.

### Field 17: Upstream Cluster

```text
outbound|8080||order-service.production.svc.cluster.local
```

The Envoy cluster name. This tells you the routing context:
- `outbound|PORT||SERVICE` - An outbound request to a service
- `inbound|PORT||` - An inbound request received by this pod
- `BlackHoleCluster` - No route matched (request was dropped)
- `PassthroughCluster` - Traffic bypassing the mesh

### Field 18: Upstream Local Address

```text
10.244.1.5:54321
```

The local address of the connection to the upstream.

### Field 19: Downstream Local Address

```text
10.96.45.67:8080
```

The local address where the downstream connection was received. Often a ClusterIP address.

### Field 20: Downstream Remote Address

```text
10.244.1.5:33210
```

The remote address of the downstream client (the caller).

### Field 21: Requested Server Name

```text
-
```

The SNI (Server Name Indication) from the TLS handshake. Useful for debugging mTLS issues.

### Field 22: Route Name

```text
default
```

The name of the matched route from the VirtualService or the default route.

## Response Flags Reference

These flags tell you why a request failed or was handled in a specific way:

| Flag | Meaning | Common Cause |
|------|---------|--------------|
| `UF` | Upstream connection failure | Pod crashed, network issue, or port not listening |
| `UH` | No healthy upstream | All endpoints failed health checks |
| `UC` | Upstream connection termination | Connection was reset by the upstream |
| `UT` | Upstream request timeout | Request exceeded the configured timeout |
| `UO` | Upstream overflow (circuit breaker) | Too many pending requests to the upstream |
| `NR` | No route configured | Missing VirtualService or destination not found |
| `URX` | Upstream retry limit exceeded | Retries failed after the maximum attempts |
| `DI` | Request with delay injection | Fault injection is active |
| `FI` | Request with fault injection | Abort fault injection is active |
| `RL` | Rate limited | Rate limiting rejected the request |
| `DC` | Downstream connection termination | The caller closed the connection |
| `LH` | Local service failed health check | The local Envoy instance is unhealthy |
| `UAEX` | Unauthorized by external auth | External authorization denied the request |
| `RLSE` | Rate limited by service extension | Envoy rate limit service rejected the request |
| `IH` | Invalid request, strict header check | Request has invalid headers |

Multiple flags can appear together. For example, `URX,UC` means retries were exhausted and the upstream connection was terminated.

## Parsing with Command-Line Tools

### Extract Specific Fields from TEXT Logs

```bash
# Get response code and flags for all requests
kubectl logs deploy/my-service -c istio-proxy | awk '{print $6, $7}'

# Get path, response code, and duration
kubectl logs deploy/my-service -c istio-proxy | awk -F'"' '{split($2, req, " "); print req[2], $3}' | awk '{print $1, $2, $5}'
```

### Parse JSON Logs with jq

```bash
# Pretty print the last log entry
kubectl logs deploy/my-service -c istio-proxy --tail=1 | jq .

# Get a summary table
kubectl logs deploy/my-service -c istio-proxy --tail=100 | jq -r '[.method, .path, .response_code, .response_flags, .duration_ms] | @tsv'

# Count by response code
kubectl logs deploy/my-service -c istio-proxy | jq -s 'group_by(.response_code) | map({code: .[0].response_code, count: length})'
```

## Key Relationships Between Fields

**Duration vs Upstream Service Time:** If duration is 5000ms but upstream_service_time is 50ms, the remaining 4950ms was spent in the network, TLS handshake, queue waiting, or proxy processing. A large gap here suggests network issues or proxy overload.

**Response Code vs Response Flags:** A 503 with `-` (no flags) means the upstream service itself returned 503. A 503 with `UF` means Envoy could not connect to the upstream and generated the 503. A 503 with `UH` means no healthy endpoints were available.

**Upstream Host vs Upstream Cluster:** If the upstream host is an IP you do not recognize, check the upstream cluster name to see which service it belongs to. The cluster name format `outbound|PORT||SERVICE.NAMESPACE.svc.cluster.local` tells you exactly where Envoy was trying to send the request.

Understanding these fields turns access logs from opaque noise into a precise debugging tool. When combined with JSON encoding and log aggregation, you can quickly slice and dice request data across your entire mesh.
