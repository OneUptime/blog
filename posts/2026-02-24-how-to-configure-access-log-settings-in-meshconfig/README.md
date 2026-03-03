# How to Configure Access Log Settings in MeshConfig

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Access Logs, MeshConfig, Observability, Envoy

Description: A hands-on guide to configuring access log settings in Istio MeshConfig for controlling log format, output, encoding, and filtering across your entire mesh.

---

Access logs in Istio record every request flowing through the sidecar proxies. They are one of the most useful debugging tools available because they show you exactly what happened to a request: where it came from, where it went, how long it took, and what response code it got. MeshConfig gives you centralized control over access log behavior for every proxy in the mesh.

## Enabling Access Logs

By default, access logs are disabled in Istio. To enable them mesh-wide, set the `accessLogFile` in MeshConfig:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
```

This sends access logs to the sidecar container's standard output. Your log collection pipeline (Fluentd, Fluent Bit, Promtail, etc.) picks them up from there.

Apply the change:

```bash
istioctl install -f access-log-config.yaml
```

Or edit the ConfigMap directly:

```bash
kubectl edit configmap istio -n istio-system
```

Add `accessLogFile: /dev/stdout` under the mesh configuration.

## Log Encoding Format

Istio supports two encoding formats: TEXT (default) and JSON.

### Text Format

```yaml
meshConfig:
  accessLogFile: /dev/stdout
  accessLogEncoding: TEXT
```

Text format produces human-readable single-line log entries. Good for quick debugging with `kubectl logs`, but harder to parse programmatically.

Example output:
```text
[2024-01-15T10:30:00.000Z] "GET /api/users HTTP/1.1" 200 - via_upstream - "-" 0 1234 45 43 "-" "curl/7.68.0" "abc-123" "my-service:8080" "10.244.1.5:8080" inbound|8080|| 10.244.1.5:41234 10.244.1.5:8080 10.244.2.3:52300 - default
```

### JSON Format

```yaml
meshConfig:
  accessLogFile: /dev/stdout
  accessLogEncoding: JSON
```

JSON format produces structured log entries that are easy to parse and query. This is the better choice for production environments with log aggregation systems:

```json
{
  "start_time": "2024-01-15T10:30:00.000Z",
  "method": "GET",
  "path": "/api/users",
  "protocol": "HTTP/1.1",
  "response_code": 200,
  "response_flags": "-",
  "bytes_received": 0,
  "bytes_sent": 1234,
  "duration": 45,
  "upstream_service_time": 43,
  "upstream_host": "10.244.1.5:8080"
}
```

## Custom Log Format

You can customize the log format using Envoy's format string syntax:

```yaml
meshConfig:
  accessLogFile: /dev/stdout
  accessLogFormat: |
    [%START_TIME%] "%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL%"
    %RESPONSE_CODE% %RESPONSE_FLAGS% %BYTES_RECEIVED% %BYTES_SENT%
    %DURATION% %RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%
    "%REQ(X-FORWARDED-FOR)%" "%REQ(USER-AGENT)%"
    "%REQ(X-REQUEST-ID)%" "%REQ(:AUTHORITY)%"
    "%UPSTREAM_HOST%" "%UPSTREAM_CLUSTER%"
    "%DOWNSTREAM_REMOTE_ADDRESS%"
```

Common format variables:

| Variable | Description |
|----------|-------------|
| `%START_TIME%` | Request start time |
| `%REQ(:METHOD)%` | HTTP method |
| `%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%` | Request path |
| `%PROTOCOL%` | HTTP protocol version |
| `%RESPONSE_CODE%` | HTTP response code |
| `%RESPONSE_FLAGS%` | Envoy response flags (UH, UF, NR, etc.) |
| `%BYTES_RECEIVED%` | Request body bytes |
| `%BYTES_SENT%` | Response body bytes |
| `%DURATION%` | Total request duration in ms |
| `%UPSTREAM_HOST%` | Upstream host address |
| `%DOWNSTREAM_REMOTE_ADDRESS%` | Client address |

## Using the Telemetry API for Access Logs

Istio also supports configuring access logs through the Telemetry API, which provides more granular control:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: mesh-access-log
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
```

This example only logs requests that result in 4xx or 5xx responses. The filter uses CEL (Common Expression Language) expressions.

### Per-Namespace Access Logs

Apply different logging configurations per namespace:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: namespace-access-log
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 500 || response.duration > duration('1s')"
```

This logs only errors or slow requests in the production namespace, reducing log volume while keeping important information.

### Per-Workload Access Logs

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: payment-api-logging
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-api
  accessLogging:
    - providers:
        - name: envoy
```

## Configuring Access Log Providers

You can send access logs to different backends. The built-in `envoy` provider writes to stdout. You can also configure OpenTelemetry or gRPC access log services:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    extensionProviders:
      - name: otel-als
        envoyOtelAls:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
```

Then reference this provider in a Telemetry resource:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: otel-access-log
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: otel-als
```

## Understanding Response Flags

Access logs include response flags that tell you what happened during request processing. These are essential for debugging:

- `UH` - Upstream cluster has no healthy hosts
- `UF` - Upstream connection failure
- `UO` - Upstream overflow (circuit breaker triggered)
- `NR` - No route configured
- `URX` - Request was rejected because of upstream retry limit
- `DC` - Downstream connection termination
- `RL` - Rate limited
- `UAEX` - Unauthorized external service (when using REGISTRY_ONLY)

Example of using response flags for debugging:

```bash
# Find all circuit breaker trips
kubectl logs -l app=my-service -c istio-proxy | grep "UO"

# Find all upstream connection failures
kubectl logs -l app=my-service -c istio-proxy | grep "UF"
```

## Log Volume Management

Access logs can generate significant volume. In a mesh handling 10,000 requests per second across 100 sidecars, that is 10,000 log lines per second. Strategies to manage this:

1. Use the Telemetry API with filter expressions to log only errors
2. Use JSON encoding for efficient parsing and filtering
3. Configure log rotation if writing to files instead of stdout
4. Sample logs by only logging a percentage of requests

```yaml
# Only log 10% of successful requests, all errors
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: sampled-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400 || request.id % 10 == 0"
```

Access logs are your best friend when debugging production issues. Configure them early, use JSON encoding, and leverage the Telemetry API for fine-grained control over what gets logged.
