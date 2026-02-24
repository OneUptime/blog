# How to Configure Envoy Proxy Access Logging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Access Logging, Observability, Kubernetes

Description: Complete guide to configuring Envoy proxy access logging in Istio including formats, filters, and output destinations.

---

Access logs are one of the most valuable debugging tools in a service mesh. Every time a request passes through an Envoy sidecar, it can log details about that request - the source, destination, response code, latency, headers, and more. But the default Istio setup does not always have access logging enabled, and when it is enabled, the default format might not include everything you need.

## Enabling Access Logging

The simplest way to enable access logging is through the mesh configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
```

This sends access logs to stdout, which means they show up in the container logs that Kubernetes collects. You can then pick them up with any log collection tool.

Alternatively, use the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-logging
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy
```

## Access Log Formats

Istio supports two log encodings: TEXT and JSON.

The default text format looks like this:

```
[2024-01-15T10:30:00.000Z] "GET /api/users HTTP/1.1" 200 - via_upstream - "-" 0 1234 45 43 "-" "curl/7.81.0" "abc-123" "myservice:8080" "10.0.1.5:8080" inbound|8080|| 10.0.1.5:42566 10.0.1.5:8080 10.0.0.3:54321 - default
```

It is compact but hard to parse. JSON is better for machine processing:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

## Custom Access Log Format

You can define exactly what fields appear in the access log. Envoy supports a rich set of command operators:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    accessLogFormat: |
      {
        "timestamp": "%START_TIME%",
        "method": "%REQ(:METHOD)%",
        "path": "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%",
        "protocol": "%PROTOCOL%",
        "status": "%RESPONSE_CODE%",
        "response_flags": "%RESPONSE_FLAGS%",
        "bytes_rx": "%BYTES_RECEIVED%",
        "bytes_tx": "%BYTES_SENT%",
        "duration_ms": "%DURATION%",
        "upstream_time_ms": "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%",
        "upstream_host": "%UPSTREAM_HOST%",
        "upstream_cluster": "%UPSTREAM_CLUSTER%",
        "downstream_remote": "%DOWNSTREAM_REMOTE_ADDRESS%",
        "downstream_local": "%DOWNSTREAM_LOCAL_ADDRESS%",
        "request_id": "%REQ(X-REQUEST-ID)%",
        "authority": "%REQ(:AUTHORITY)%",
        "user_agent": "%REQ(USER-AGENT)%",
        "trace_id": "%REQ(X-B3-TRACEID)%",
        "connection_termination": "%CONNECTION_TERMINATION_DETAILS%",
        "route_name": "%ROUTE_NAME%",
        "upstream_transport_failure": "%UPSTREAM_TRANSPORT_FAILURE_REASON%"
      }
```

## Understanding Response Flags

The `%RESPONSE_FLAGS%` field is extremely useful for debugging. Each flag tells you why the request was handled the way it was:

- `UH` - No healthy upstream hosts
- `UF` - Upstream connection failure
- `UO` - Upstream overflow (circuit breaking)
- `NR` - No route configured
- `URX` - Upstream retry limit exceeded
- `DC` - Downstream connection termination
- `LH` - Local service failed health check
- `UT` - Upstream request timeout
- `LR` - Connection local reset
- `UR` - Upstream remote reset
- `UC` - Upstream connection termination
- `DI` - Delay injected by fault filter
- `FI` - Abort injected by fault filter
- `RL` - Rate limited
- `UAEX` - Unauthorized external authorization
- `RLSE` - Rate limit service error

When debugging connectivity issues, always check the response flags first.

## Filtering Access Logs

Logging every single request generates a lot of data. The Telemetry API lets you filter what gets logged:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: selective-logging
  namespace: default
spec:
  accessLogging:
  - providers:
    - name: envoy
    filter:
      expression: "response.code >= 400"
```

Only log errors. You can combine conditions:

```yaml
filter:
  expression: "response.code >= 500 || response.duration > 1000"
```

Log only non-health-check requests:

```yaml
filter:
  expression: "request.url_path != '/healthz' && request.url_path != '/readyz'"
```

## Per-Namespace and Per-Workload Logging

Apply different logging configurations to different namespaces:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: verbose-logging
  namespace: staging
spec:
  accessLogging:
  - providers:
    - name: envoy
```

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: error-only-logging
  namespace: production
spec:
  accessLogging:
  - providers:
    - name: envoy
    filter:
      expression: "response.code >= 400"
```

Target specific workloads:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: api-gateway-logging
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-gateway
  accessLogging:
  - providers:
    - name: envoy
```

## Sending Logs to gRPC Access Log Service

Instead of writing to stdout, Envoy can send access logs to a gRPC service:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableEnvoyAccessLogService: true
    defaultConfig:
      envoyAccessLogService:
        address: als-server.logging.svc:9090
```

This is useful when you want to process access logs in real-time or send them to a system that speaks gRPC natively, like Apache SkyWalking.

## Logging Specific Headers

Sometimes you need to log custom headers for debugging or tracing:

```yaml
accessLogFormat: |
  {
    "timestamp": "%START_TIME%",
    "method": "%REQ(:METHOD)%",
    "path": "%REQ(:PATH)%",
    "status": "%RESPONSE_CODE%",
    "x_custom_header": "%REQ(X-CUSTOM-HEADER)%",
    "x_correlation_id": "%REQ(X-CORRELATION-ID)%",
    "content_type": "%REQ(CONTENT-TYPE)%",
    "response_content_type": "%RESP(CONTENT-TYPE)%"
  }
```

Use `%REQ(HEADER-NAME)%` for request headers and `%RESP(HEADER-NAME)%` for response headers.

## Viewing Access Logs

Read the access logs from a specific pod:

```bash
kubectl logs <pod-name> -c istio-proxy --tail=100
```

Filter for specific status codes:

```bash
kubectl logs <pod-name> -c istio-proxy | grep '"status":"5'
```

Follow logs in real time:

```bash
kubectl logs <pod-name> -c istio-proxy -f
```

## Performance Considerations

Access logging has a performance cost. Every request requires serializing log data and writing it out. For high-throughput services, consider:

1. Using JSON encoding (faster than text for structured data)
2. Filtering to only log errors or slow requests
3. Keeping the log format lean - do not include every possible field
4. Using the gRPC ALS instead of file logging for better batching

Measure the impact:

```bash
# Check Envoy's internal stats for access log writes
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep access_log
```

Access logging configuration is one of those things that is worth getting right early in your Istio deployment. The right log format and filtering strategy means you have the data you need for debugging without drowning in noise. The Telemetry API's filter expressions are particularly powerful for keeping log volume under control in production.
