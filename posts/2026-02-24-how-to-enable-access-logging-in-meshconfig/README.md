# How to Enable Access Logging in MeshConfig

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Access Logging, MeshConfig, Observability, Debugging

Description: A step-by-step guide to enabling and configuring access logging in Istio MeshConfig for debugging traffic flow and monitoring service behavior.

---

Access logging in Istio captures details about every request that flows through the sidecar proxies. When something goes wrong - a service returning errors, requests timing out, traffic not reaching the right destination - access logs are usually the first place you look. They tell you what the proxy saw: the request method, path, response code, upstream host, duration, and any error flags.

Enabling access logging is one of the first things you should do after installing Istio. Without it, you are flying blind when debugging mesh issues.

## Quick Start: Enable Access Logs

The fastest way to enable access logging for your entire mesh:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
```

Apply it:

```bash
istioctl install -f access-log.yaml
```

That is it. Every sidecar in the mesh will now write access logs to its standard output. You can view them with:

```bash
kubectl logs deploy/my-service -c istio-proxy -n default
```

If you already have Istio installed and do not want to re-run the installer, edit the ConfigMap:

```bash
kubectl edit configmap istio -n istio-system
```

Find the `mesh` key and add:

```yaml
accessLogFile: /dev/stdout
```

The change takes effect within seconds. Existing sidecars pick it up without restart, though a restart ensures clean configuration.

## Choosing the Log Format

### Text Format (Default)

```yaml
meshConfig:
  accessLogFile: /dev/stdout
  accessLogEncoding: TEXT
```

Produces logs like:

```
[2024-01-15T10:30:00.000Z] "GET /api/v1/users HTTP/1.1" 200 - via_upstream - "-" 0 512 45 42 "-" "python-requests/2.28" "abc-def-123" "users.default:8080" "10.244.1.15:8080" inbound|8080|| 10.244.1.15:49152 10.244.1.15:8080 10.244.2.3:52384 - default
```

Text format is great for quick `kubectl logs` inspection but harder to process programmatically.

### JSON Format

```yaml
meshConfig:
  accessLogFile: /dev/stdout
  accessLogEncoding: JSON
```

Produces structured logs:

```json
{
  "authority": "users.default:8080",
  "bytes_received": 0,
  "bytes_sent": 512,
  "downstream_local_address": "10.244.1.15:8080",
  "downstream_remote_address": "10.244.2.3:52384",
  "duration": 45,
  "method": "GET",
  "path": "/api/v1/users",
  "protocol": "HTTP/1.1",
  "request_id": "abc-def-123",
  "requested_server_name": "",
  "response_code": 200,
  "response_flags": "-",
  "route_name": "default",
  "start_time": "2024-01-15T10:30:00.000Z",
  "upstream_cluster": "inbound|8080||",
  "upstream_host": "10.244.1.15:8080",
  "upstream_service_time": "42",
  "user_agent": "python-requests/2.28"
}
```

JSON format is the better choice for production because your log aggregation system (Elasticsearch, Loki, Splunk, etc.) can parse and index the fields.

## Using the Telemetry API

The Telemetry API gives you finer control than the MeshConfig approach. You can enable logging at different scopes and with filters:

### Mesh-Wide

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: mesh-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
```

### Namespace-Specific

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: prod-logging
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
```

This only logs requests that result in errors, which significantly reduces log volume in production.

### Workload-Specific

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: payment-logging
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-api
  accessLogging:
    - providers:
        - name: envoy
```

## Filter Expressions

The Telemetry API supports CEL (Common Expression Language) for filtering which requests get logged:

```yaml
# Only log errors
filter:
  expression: "response.code >= 400"

# Only log slow requests (over 1 second)
filter:
  expression: "response.duration > duration('1s')"

# Log errors OR slow requests
filter:
  expression: "response.code >= 500 || response.duration > duration('1s')"

# Log requests to specific paths
filter:
  expression: "request.url_path.startsWith('/api/v1')"
```

Filter expressions are powerful for reducing log noise. In a mesh handling millions of requests per day, logging everything generates enormous volumes. Filtering to errors and slow requests keeps the important information while cutting storage costs.

## Sending Logs to External Systems

Besides writing to stdout, you can send access logs directly to an OpenTelemetry collector:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: otel-als
        envoyOtelAls:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
```

Then reference it in the Telemetry resource:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: otel-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: otel-als
```

You can use both providers simultaneously - stdout for quick debugging and OTel for your aggregation pipeline:

```yaml
spec:
  accessLogging:
    - providers:
        - name: envoy
    - providers:
        - name: otel-als
```

## Reading Access Logs

Understanding the fields in access logs is essential for debugging:

```bash
# View access logs for a specific pod
kubectl logs deploy/my-service -c istio-proxy -n default --tail=20
```

Key fields to pay attention to:

**response_code**: The HTTP status code. 200 is good, 503 means the upstream is unavailable, 404 means no route, 403 means denied by authorization policy.

**response_flags**: These tell you what went wrong at the proxy level:
- `-` means no flags (successful request)
- `NR` means no route configured
- `UH` means upstream cluster has no healthy hosts
- `UF` means upstream connection failure
- `UC` means upstream connection termination
- `UO` means upstream overflow (circuit breaker)
- `RL` means rate limited
- `UAEX` means unauthorized (blocked by outbound policy)

**duration vs upstream_service_time**: `duration` is the total time including proxy overhead. `upstream_service_time` is how long the upstream took. A big gap between them indicates proxy processing time.

**upstream_host**: The actual pod IP that handled the request. Useful for identifying which specific pod is having issues.

## Practical Debugging with Access Logs

Find all requests that got no route:

```bash
kubectl logs deploy/my-service -c istio-proxy -n default | grep "NR"
```

Find all upstream connection failures:

```bash
kubectl logs deploy/my-service -c istio-proxy -n default | grep "UF"
```

Find all requests blocked by authorization policy:

```bash
kubectl logs deploy/my-service -c istio-proxy -n default | grep "403"
```

Find all slow requests (with JSON encoding, using jq):

```bash
kubectl logs deploy/my-service -c istio-proxy -n default | \
  jq 'select(.duration > 1000)'
```

## Disabling Access Logs

If you need to disable access logs (for performance or cost reasons), remove the accessLogFile setting or set it to empty:

```yaml
meshConfig:
  accessLogFile: ""
```

Or with the Telemetry API, delete the Telemetry resource:

```bash
kubectl delete telemetry mesh-logging -n istio-system
```

Access logging is the most immediately useful observability feature in Istio. Enable JSON format logging through MeshConfig, use the Telemetry API for fine-grained filtering, and learn to read the response flags. These logs will be your first stop for every debugging session.
