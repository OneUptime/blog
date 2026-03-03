# How to Configure Access Logging with Telemetry API in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry API, Access Logging, Observability, Envoy

Description: How to configure access logging in Istio using the Telemetry API, including custom log formats, filtering, and provider configuration.

---

Access logs capture every request flowing through your mesh. They're invaluable for debugging, auditing, and compliance. But in a busy mesh, logging everything can generate terabytes of data per day. The Telemetry API gives you precise control over what gets logged, where it goes, and in what format.

Before the Telemetry API, configuring access logging meant editing MeshConfig directly or using EnvoyFilters. The Telemetry API wraps this into a cleaner interface that supports per-namespace and per-workload overrides.

## Enabling Basic Access Logging

The simplest access logging configuration enables Envoy's built-in file logger:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
```

This sends access logs to stdout on every Envoy sidecar in the mesh. You can then collect these logs with your cluster's log aggregation system (Fluentd, Fluent Bit, Vector, etc.).

Apply it and generate some traffic:

```bash
kubectl apply -f access-log-telemetry.yaml

# Generate traffic to see logs
curl http://your-service/api/test

# Check the access logs
kubectl logs <pod-name> -c istio-proxy | tail -5
```

You'll see log entries that look something like:

```text
[2026-02-24T10:30:00.000Z] "GET /api/test HTTP/1.1" 200 - via_upstream - "-" 0 1234 45 43 "-" "curl/7.81.0" "abc-123" "my-service:8080" "10.0.0.5:8080" inbound|8080|| 10.0.0.1:0 10.0.0.5:8080 10.0.0.1:45678 outbound_.8080_._.my-service.default.svc.cluster.local default
```

## Configuring Access Log Providers

The `envoy` provider uses Envoy's default log format. For more control, define custom providers in MeshConfig.

### Custom File Access Log Provider

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio
  namespace: istio-system
data:
  mesh: |
    extensionProviders:
      - name: json-access-log
        envoyFileAccessLog:
          path: "/dev/stdout"
          logFormat:
            labels:
              timestamp: "%START_TIME%"
              method: "%REQ(:METHOD)%"
              path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
              protocol: "%PROTOCOL%"
              response_code: "%RESPONSE_CODE%"
              response_flags: "%RESPONSE_FLAGS%"
              bytes_received: "%BYTES_RECEIVED%"
              bytes_sent: "%BYTES_SENT%"
              duration: "%DURATION%"
              upstream_service_time: "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%"
              upstream_host: "%UPSTREAM_HOST%"
              source_ip: "%DOWNSTREAM_REMOTE_ADDRESS_WITHOUT_PORT%"
              user_agent: "%REQ(USER-AGENT)%"
              request_id: "%REQ(X-REQUEST-ID)%"
              authority: "%REQ(:AUTHORITY)%"
              upstream_cluster: "%UPSTREAM_CLUSTER%"
```

This produces structured JSON logs instead of the default text format, which is much easier to parse and query in your log aggregation tool.

Then reference this provider in your Telemetry resource:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: json-access-log
```

### OpenTelemetry Access Log Provider

To send access logs to an OpenTelemetry Collector:

```yaml
# In MeshConfig
extensionProviders:
  - name: otel-access-log
    envoyOtelAls:
      service: otel-collector.observability.svc.cluster.local
      port: 4317
```

Then in the Telemetry resource:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: otel-access-log
```

## Filtering Access Logs

Logging every request generates a huge volume of data. Use filters to log only what matters.

### Log Only Errors

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
```

This only logs requests that result in 4xx or 5xx status codes. In a healthy mesh, this can reduce log volume by 95% or more while keeping the logs you actually need for debugging.

### Log Slow Requests

```yaml
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.duration > 1000"
```

This logs any request that takes more than 1000 milliseconds (1 second). Great for catching latency issues without the noise of fast, successful requests.

### Combine Conditions

You can combine filter conditions:

```yaml
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400 || response.duration > 2000"
```

This logs requests that either return errors OR take more than 2 seconds.

### Filter by Request Attributes

Log only requests to specific paths:

```yaml
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "request.url_path.startsWith('/api/v1/payments')"
```

This is useful for compliance logging where you only need to audit specific endpoints.

## Disabling Access Logging

To disable access logging entirely for a namespace:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: no-access-logs
  namespace: noisy-namespace
spec:
  accessLogging:
    - providers:
        - name: envoy
      disabled: true
```

To disable for a specific workload:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: no-logs-for-healthcheck
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: healthcheck-service
  accessLogging:
    - providers:
        - name: envoy
      disabled: true
```

## Multiple Access Log Providers

You can send access logs to multiple destinations simultaneously:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: json-access-log
    - providers:
        - name: otel-access-log
      filter:
        expression: "response.code >= 500"
```

This sends all access logs in JSON format to stdout, while also sending 5xx errors to the OpenTelemetry Collector. You get cheap local logging for everything and centralized logging for errors.

## Access Log Variables Reference

Here are the most commonly used Envoy access log variables for custom formats:

| Variable | Description |
|----------|-------------|
| `%START_TIME%` | Request start time |
| `%REQ(:METHOD)%` | HTTP method |
| `%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%` | Request path |
| `%PROTOCOL%` | HTTP protocol version |
| `%RESPONSE_CODE%` | HTTP response code |
| `%RESPONSE_FLAGS%` | Envoy response flags (UH, UT, UF, etc.) |
| `%BYTES_RECEIVED%` | Request body bytes |
| `%BYTES_SENT%` | Response body bytes |
| `%DURATION%` | Total request duration in ms |
| `%UPSTREAM_HOST%` | Upstream host address |
| `%DOWNSTREAM_REMOTE_ADDRESS%` | Client address |
| `%REQ(X-REQUEST-ID)%` | Request ID header |
| `%UPSTREAM_CLUSTER%` | Upstream cluster name |

## Understanding Response Flags

The `%RESPONSE_FLAGS%` variable is particularly useful for debugging. Each flag indicates why a request was handled a certain way:

- **UH**: No healthy upstream hosts
- **UF**: Upstream connection failure
- **UT**: Upstream request timeout
- **NR**: No route configured
- **RL**: Rate limited
- **DC**: Downstream connection termination
- **URX**: Upstream retry limit exceeded

When you see these flags in your access logs, they point directly to the cause of the issue.

## Production Recommendations

1. **Use JSON format** instead of the default text format. It's easier to parse and query.

2. **Filter aggressively**. In production, log errors and slow requests. Only enable full logging temporarily during debugging.

3. **Don't log health checks**. If your load balancer or monitoring system hits health endpoints frequently, those logs are pure noise:

```yaml
filter:
  expression: "request.url_path != '/healthz' && request.url_path != '/readyz'"
```

4. **Include the request ID**. The `x-request-id` header lets you correlate access logs with distributed traces. Always include it in your log format.

5. **Monitor log volume**. Even with filtering, access logs can be the largest source of data in your cluster. Keep an eye on storage costs.

The Telemetry API makes access logging configuration much more manageable than the old approach. The ability to filter logs with CEL expressions is especially powerful - it lets you keep the logs you need while throwing away the ones you don't.
