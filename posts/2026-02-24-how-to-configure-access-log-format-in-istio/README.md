# How to Configure Access Log Format in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Access Logs, Envoy, Configuration, Observability

Description: How to customize the access log format in Istio to include specific fields, remove noise, and structure logs for your monitoring pipeline.

---

The default access log format in Istio includes a lot of information, but it might not be exactly what you need. Maybe you want to add custom headers, remove fields you never look at, or change the format to match what your log aggregation system expects. Istio lets you fully customize the access log format through its mesh configuration.

## The Default Format

When access logging is enabled with TEXT encoding, Istio uses this default format:

```text
[%START_TIME%] "%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL%" %RESPONSE_CODE% %RESPONSE_FLAGS% %RESPONSE_CODE_DETAILS% %CONNECTION_TERMINATION_DETAILS% "%UPSTREAM_TRANSPORT_FAILURE_REASON%" %BYTES_RECEIVED% %BYTES_SENT% %DURATION% %RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)% "%REQ(X-FORWARDED-FOR)%" "%REQ(USER-AGENT)%" "%REQ(X-REQUEST-ID)%" "%REQ(:AUTHORITY)%" "%UPSTREAM_HOST%" %UPSTREAM_CLUSTER% %UPSTREAM_LOCAL_ADDRESS% %DOWNSTREAM_LOCAL_ADDRESS% %DOWNSTREAM_REMOTE_ADDRESS% %REQUESTED_SERVER_NAME% %ROUTE_NAME%
```

That is a lot of fields. In practice, many of these are not useful for day-to-day debugging, and the TEXT format is hard to parse programmatically.

## Customizing the TEXT Format

You can set a custom format through the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: TEXT
    accessLogFormat: |
      [%START_TIME%] "%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL%" %RESPONSE_CODE% %RESPONSE_FLAGS% %BYTES_RECEIVED% %BYTES_SENT% %DURATION% %UPSTREAM_HOST% "%REQ(X-REQUEST-ID)%"
```

This simplified format includes only the essentials: timestamp, request method and path, response code, response flags, body sizes, duration, upstream host, and request ID.

## Available Format Variables

Envoy supports a large number of format variables. Here are the most useful ones for Istio:

### Request Information

| Variable | Description |
|----------|-------------|
| `%REQ(:METHOD)%` | HTTP method (GET, POST, etc.) |
| `%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%` | Request path |
| `%REQ(:AUTHORITY)%` | Host/authority header |
| `%PROTOCOL%` | HTTP protocol (HTTP/1.1, HTTP/2) |
| `%REQ(X-REQUEST-ID)%` | Istio request ID for tracing |
| `%REQ(USER-AGENT)%` | User-Agent header |
| `%REQ(X-FORWARDED-FOR)%` | Client IP chain |

### Response Information

| Variable | Description |
|----------|-------------|
| `%RESPONSE_CODE%` | HTTP status code |
| `%RESPONSE_FLAGS%` | Envoy response flags |
| `%RESPONSE_CODE_DETAILS%` | Why Envoy chose this response code |
| `%GRPC_STATUS%` | gRPC status code |
| `%BYTES_SENT%` | Response body bytes |
| `%BYTES_RECEIVED%` | Request body bytes |

### Timing Information

| Variable | Description |
|----------|-------------|
| `%START_TIME%` | When the request started |
| `%DURATION%` | Total request duration in ms |
| `%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%` | Time upstream took to respond |
| `%REQUEST_DURATION%` | Time to receive the request |
| `%RESPONSE_DURATION%` | Time to receive the response from upstream |
| `%RESPONSE_TX_DURATION%` | Time to transmit the response to downstream |

### Network Information

| Variable | Description |
|----------|-------------|
| `%UPSTREAM_HOST%` | IP:port of the upstream pod |
| `%UPSTREAM_CLUSTER%` | Envoy cluster name |
| `%UPSTREAM_LOCAL_ADDRESS%` | Local address of the upstream connection |
| `%DOWNSTREAM_LOCAL_ADDRESS%` | Local address (pod IP:port) |
| `%DOWNSTREAM_REMOTE_ADDRESS%` | Client address |
| `%REQUESTED_SERVER_NAME%` | SNI for TLS connections |

## Practical Format Examples

### Minimal Debug Format

When you just need the basics for quick debugging:

```yaml
meshConfig:
  accessLogFile: /dev/stdout
  accessLogEncoding: TEXT
  accessLogFormat: "[%START_TIME%] %REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %RESPONSE_CODE% %RESPONSE_FLAGS% %DURATION%ms %UPSTREAM_HOST%\n"
```

Output:
```text
[2026-02-24T10:15:30.123Z] GET /api/users 200 - 15ms 10.244.1.5:8080
```

### Detailed Troubleshooting Format

When investigating latency or routing issues:

```yaml
meshConfig:
  accessLogFile: /dev/stdout
  accessLogEncoding: TEXT
  accessLogFormat: |
    [%START_TIME%] "%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL%" src=%DOWNSTREAM_REMOTE_ADDRESS% dst=%UPSTREAM_HOST% cluster=%UPSTREAM_CLUSTER% code=%RESPONSE_CODE% flags=%RESPONSE_FLAGS% duration=%DURATION%ms upstream_time=%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%ms req_bytes=%BYTES_RECEIVED% resp_bytes=%BYTES_SENT% request_id=%REQ(X-REQUEST-ID)%
```

Output:
```text
[2026-02-24T10:15:30.123Z] "GET /api/users HTTP/1.1" src=10.244.1.3:45678 dst=10.244.1.5:8080 cluster=inbound|8080|| code=200 flags=- duration=15ms upstream_time=12ms req_bytes=0 resp_bytes=1234 request_id=abc-123
```

### Key=Value Format for Log Parsers

Many log aggregation tools parse key=value pairs easily:

```yaml
meshConfig:
  accessLogFile: /dev/stdout
  accessLogEncoding: TEXT
  accessLogFormat: |
    time=%START_TIME% method=%REQ(:METHOD)% path="%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%" protocol=%PROTOCOL% response_code=%RESPONSE_CODE% response_flags=%RESPONSE_FLAGS% bytes_in=%BYTES_RECEIVED% bytes_out=%BYTES_SENT% duration=%DURATION% upstream=%UPSTREAM_HOST% request_id=%REQ(X-REQUEST-ID)% authority=%REQ(:AUTHORITY)% user_agent="%REQ(USER-AGENT)%"
```

### Including Custom Headers

If your application sets custom headers (like a user ID or trace context), you can include them:

```yaml
meshConfig:
  accessLogFile: /dev/stdout
  accessLogEncoding: TEXT
  accessLogFormat: |
    [%START_TIME%] %REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %RESPONSE_CODE% %DURATION%ms user_id=%REQ(X-USER-ID)% tenant=%REQ(X-TENANT-ID)% trace=%REQ(X-B3-TRACEID)%
```

The `%REQ(HEADER-NAME)%` syntax lets you extract any request header. Similarly, `%RESP(HEADER-NAME)%` extracts response headers.

## Configuring via ConfigMap Directly

If you prefer to edit the ConfigMap directly:

```bash
kubectl edit configmap istio -n istio-system
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio
  namespace: istio-system
data:
  mesh: |
    accessLogFile: /dev/stdout
    accessLogEncoding: TEXT
    accessLogFormat: "[%START_TIME%] %REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %RESPONSE_CODE% %RESPONSE_FLAGS% %DURATION%ms %UPSTREAM_HOST%\n"
```

## Format Validation

There is no built-in validator for access log formats. If you make a syntax error, Envoy will either use the default format or produce garbled output. The best way to validate is:

1. Apply the configuration
2. Send a test request
3. Check the sidecar logs

```bash
# Apply config
kubectl apply -f istio-config.yaml

# Wait for propagation (about 30 seconds)
sleep 30

# Send test request
kubectl exec deploy/sleep -- curl -s httpbin.default:8000/status/200

# Check logs
kubectl logs deploy/httpbin -c istio-proxy --tail=3
```

## Common Mistakes

**Forgetting the newline.** In TEXT format, each log entry needs to end with `\n`. If you use a YAML literal block (`|`), the trailing newline is included automatically. If you use a quoted string, add `\n` explicitly.

**Invalid variable names.** If you typo a variable name like `%RESPOENS_CODE%`, Envoy will output the literal string `%RESPOENS_CODE%` instead of the value. No error, just wrong output.

**Quoting issues.** Values that might contain spaces (like paths, user agents) should be wrapped in quotes in your format string. Otherwise, log parsers might misinterpret the fields.

**Performance impact of complex formats.** Each additional format variable costs a tiny bit of CPU. For most setups this is negligible, but if you are logging thousands of requests per second per pod, keep the format lean.

Customizing the access log format lets you get exactly the information you need without wading through noise. Start with a minimal format and add fields as you discover what is useful during real debugging sessions.
