# How to Configure Sidecar Proxy Logging Levels

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Logging, Envoy, Debugging

Description: How to configure and change Envoy sidecar proxy logging levels in Istio for debugging, monitoring, and production log management.

---

When something goes wrong in your Istio mesh, the sidecar proxy logs are often the first place you turn. But by default, Envoy's logging can be either too noisy or not detailed enough for what you need. Knowing how to adjust logging levels on the fly, configure access logs, and set up appropriate defaults for production is an essential skill for running Istio.

This post covers all the ways to configure sidecar proxy logging in Istio, from quick runtime adjustments to permanent configuration changes.

## Understanding Envoy Log Levels

Envoy supports several log levels, from most verbose to least:

- **trace**: Extremely detailed, includes every internal event
- **debug**: Detailed information useful for troubleshooting
- **info**: General operational messages (default)
- **warning**: Problems that don't cause failures but should be investigated
- **error**: Actual failures
- **critical**: Severe errors that affect proxy operation
- **off**: No logging

Each Envoy component (called a "logger") can have its own log level. The major components include:

- **connection**: Connection lifecycle events
- **http**: HTTP request/response processing
- **router**: Routing decisions
- **upstream**: Communication with upstream services
- **filter**: Filter chain execution
- **pool**: Connection pool management
- **config**: Configuration processing

## Changing Log Levels at Runtime

The fastest way to adjust logging is using `istioctl proxy-config log`. This changes the log level on a running proxy without restarting anything:

```bash
# Set all loggers to debug
istioctl proxy-config log deploy/my-app -n production --level debug

# Set specific loggers
istioctl proxy-config log deploy/my-app -n production --level connection:debug,router:debug,http:debug

# Set back to warning when done
istioctl proxy-config log deploy/my-app -n production --level warning
```

You can also check the current log levels:

```bash
istioctl proxy-config log deploy/my-app -n production
```

This outputs each logger and its current level:

```
active loggers:
  admin: warning
  aws: warning
  client: warning
  config: warning
  connection: debug
  ...
```

Runtime log level changes are temporary. They reset when the pod restarts.

## Setting Default Log Level via Annotation

To set a persistent log level for a specific workload, use the `sidecar.istio.io/logLevel` annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/logLevel: debug
    spec:
      containers:
        - name: my-app
          image: my-app:latest
```

This sets the overall proxy log level. For more granular control, use the `sidecar.istio.io/componentLogLevel` annotation:

```yaml
metadata:
  annotations:
    sidecar.istio.io/componentLogLevel: "connection:debug,router:debug,http:info"
```

These annotations are applied when the sidecar container starts, so changing them requires a pod restart.

## Setting Mesh-Wide Log Levels

To set the default log level for all proxies in the mesh:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
  values:
    global:
      proxy:
        logLevel: warning
        componentLogLevel: "misc:error"
```

For production, `warning` is a good default. It captures problems without generating the volume of logs that `info` produces.

## Configuring Access Logging

Access logs are different from component logs. They record every request that flows through the proxy and are invaluable for debugging traffic issues.

Enable access logging mesh-wide:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

The default format is text, but JSON is easier to parse with log aggregation tools:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    accessLogFormat: |
      {
        "start_time": "%START_TIME%",
        "method": "%REQ(:METHOD)%",
        "path": "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%",
        "protocol": "%PROTOCOL%",
        "response_code": "%RESPONSE_CODE%",
        "response_flags": "%RESPONSE_FLAGS%",
        "upstream_host": "%UPSTREAM_HOST%",
        "upstream_cluster": "%UPSTREAM_CLUSTER%",
        "duration": "%DURATION%"
      }
```

You can also use the Telemetry API for more control:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: access-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
```

To enable access logging only for specific namespaces:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: access-logging
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: envoy
```

## Filtering Access Logs

You might not want to log every single request. For high-traffic services, logging only errors can reduce log volume significantly:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
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

Other useful filter expressions:

```yaml
# Log only 5xx errors
filter:
  expression: "response.code >= 500"

# Log slow requests (over 1 second)
filter:
  expression: "response.duration > 1000"

# Log specific paths
filter:
  expression: "request.url_path.startsWith('/api/v1')"
```

## Reading Proxy Logs Effectively

Once you have logs configured, you need to know what to look for.

View access logs:

```bash
kubectl logs deploy/my-app -c istio-proxy -n production
```

The default text format looks like:

```
[2026-02-24T10:15:30.123Z] "GET /api/users HTTP/1.1" 200 - via_upstream - "-" 0 1234 15 14 "-" "curl/7.68.0" "abc-123" "api-service:8080" "10.1.2.3:8080" outbound|8080||api-service.production.svc.cluster.local 10.1.2.4:45678 10.96.1.1:8080 10.1.2.4:56789 - default
```

The response flags field is particularly useful for debugging. Key flags to know:

| Flag | Meaning |
|---|---|
| `-` | No issues |
| `UF` | Upstream connection failure |
| `UH` | No healthy upstream |
| `UT` | Upstream timeout |
| `NR` | No route configured |
| `UO` | Upstream overflow (circuit breaker) |
| `DC` | Downstream connection termination |
| `URX` | Upstream retry limit exceeded |

## Log Rotation and Management

In production, proxy logs can generate significant volume. A few strategies to manage this:

**Use JSON encoding** for easier parsing by log aggregation tools like Fluentd, Filebeat, or the OpenTelemetry Collector.

**Set appropriate log levels** - `warning` for production, `debug` only when actively troubleshooting.

**Use access log filters** to reduce volume by only logging errors or slow requests.

**Monitor log volume** to catch unexpected increases:

```bash
# Check log output rate
kubectl logs deploy/my-app -c istio-proxy -n production --since=1m | wc -l
```

## Debugging Workflow Example

Here's a practical workflow for debugging a 503 error:

```bash
# 1. Enable debug logging on the affected proxy
istioctl proxy-config log deploy/my-app -n production --level connection:debug,router:debug,http:debug

# 2. Reproduce the problem
kubectl exec deploy/test-client -n production -- curl -v http://my-app:8080/failing-endpoint

# 3. Check the proxy logs
kubectl logs deploy/my-app -c istio-proxy -n production --tail=50

# 4. Look for the response flag in the access log
kubectl logs deploy/my-app -c istio-proxy -n production | grep "failing-endpoint"

# 5. Reset log levels
istioctl proxy-config log deploy/my-app -n production --level warning
```

The combination of access logs for request-level visibility and component logs for internal proxy behavior gives you everything you need to diagnose most issues. Just remember to dial the verbosity back down when you're done - debug logging in production generates a lot of noise and can affect performance at high request rates.
