# How to Enable Access Logs in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Access Logs, Envoy, Debugging, Observability

Description: A complete guide to enabling and configuring access logs in Istio for debugging, auditing, and monitoring service mesh traffic.

---

Access logs are one of the most powerful debugging tools in Istio. When a request fails or behaves unexpectedly, access logs tell you exactly what happened - the request path, response code, upstream host, timing breakdown, and Envoy-specific response flags that explain why things went wrong.

By default, Istio does not enable access logging on every installation. Depending on your Istio version and installation profile, you might need to turn it on explicitly. Here is how to do that across different methods.

## Method 1: Enable via MeshConfig

The simplest way to enable access logs globally is through Istio's mesh configuration. If you installed Istio with `istioctl`, you can update the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: TEXT
```

Apply it:

```bash
istioctl install -f istio-config.yaml
```

Or if you want to update the mesh config without reinstalling:

```bash
kubectl edit configmap istio -n istio-system
```

Add the access log settings under the `mesh` key:

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
```

After editing the ConfigMap, the change will propagate to all sidecars automatically. It might take a minute or two for all proxies to pick up the new configuration.

## Method 2: Enable via Telemetry API

The Telemetry API is the newer and recommended approach. It gives you more control over what gets logged and where.

Enable access logs globally:

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

This enables access logging for every sidecar in the mesh. The `envoy` provider writes logs to stdout by default.

## Method 3: Enable via Helm Values

If you install Istio with Helm, set the access log configuration in your values:

```bash
helm install istio-base istio/base -n istio-system --create-namespace

helm install istiod istio/istiod -n istio-system \
  --set meshConfig.accessLogFile=/dev/stdout \
  --set meshConfig.accessLogEncoding=TEXT
```

Or in a values file:

```yaml
# istiod-values.yaml
meshConfig:
  accessLogFile: /dev/stdout
  accessLogEncoding: TEXT
```

```bash
helm install istiod istio/istiod -n istio-system -f istiod-values.yaml
```

## Verifying Access Logs Are Working

Once enabled, you can verify by sending a request and checking the sidecar logs:

```bash
# Send a test request (assuming you have a service running)
kubectl exec deploy/sleep -- curl -s httpbin.default:8000/status/200

# Check the istio-proxy container logs
kubectl logs deploy/httpbin -c istio-proxy --tail=5
```

You should see output similar to:

```text
[2026-02-24T10:15:30.123Z] "GET /status/200 HTTP/1.1" 200 - via_upstream - "-" 0 0 3 2 "-" "curl/7.88.1" "abc123-def456" "httpbin.default:8000" "10.244.1.5:80" inbound|8000|| 10.244.1.3:0 10.244.1.5:8000 10.244.1.3:45678 - default
```

## Understanding the Default Log Format

The default TEXT format contains these fields (in order):

| Field | Example | Meaning |
|-------|---------|---------|
| Timestamp | `[2026-02-24T10:15:30.123Z]` | When the request was received |
| Method and path | `"GET /status/200 HTTP/1.1"` | HTTP method, path, and protocol |
| Response code | `200` | HTTP response status code |
| Response flags | `-` | Envoy response flags (- means none) |
| Mesh routing | `via_upstream` | How the request was handled |
| Authority | `-` | The authority/host header |
| Bytes received | `0` | Request body size |
| Bytes sent | `0` | Response body size |
| Duration | `3` | Total duration in milliseconds |
| Upstream service time | `2` | Time the upstream spent processing |
| Forwarded for | `-` | X-Forwarded-For header |
| User agent | `"curl/7.88.1"` | User-Agent header |
| Request ID | `"abc123-def456"` | Unique request identifier |
| Authority | `"httpbin.default:8000"` | Request authority |
| Upstream host | `"10.244.1.5:80"` | The actual pod IP that handled the request |

## JSON Encoding

If you prefer structured logs (much easier to parse programmatically), switch to JSON encoding:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

JSON output looks like:

```json
{
  "authority": "httpbin.default:8000",
  "bytes_received": 0,
  "bytes_sent": 0,
  "downstream_local_address": "10.244.1.5:8000",
  "downstream_remote_address": "10.244.1.3:45678",
  "duration": 3,
  "method": "GET",
  "path": "/status/200",
  "protocol": "HTTP/1.1",
  "request_id": "abc123-def456",
  "response_code": 200,
  "response_flags": "-",
  "upstream_host": "10.244.1.5:80",
  "upstream_service_time": "2",
  "user_agent": "curl/7.88.1"
}
```

## Enabling Access Logs for Specific Namespaces Only

If you do not want access logs everywhere (they can generate a lot of data), enable them only for specific namespaces:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: namespace-logging
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: envoy
```

This enables access logging only for workloads in the `production` namespace.

## Enabling Access Logs for a Single Workload

You can also target specific workloads:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: workload-logging
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  accessLogging:
    - providers:
        - name: envoy
```

## Disabling Access Logs

If you had access logs enabled and want to turn them off:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: disable-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      disabled: true
```

Or remove the `accessLogFile` from the mesh config:

```bash
kubectl edit configmap istio -n istio-system
# Remove the accessLogFile line
```

## Performance Considerations

Access logging has a cost:

- **CPU overhead** on each sidecar for formatting and writing log entries
- **Disk I/O** and **storage** for the log output
- **Log collection costs** if you are shipping logs to a centralized system

For high-throughput services (thousands of requests per second), the logging overhead can be noticeable. In those cases, consider:

1. Enabling logs only when debugging, not permanently
2. Using the Telemetry API to enable logs per-workload rather than mesh-wide
3. Filtering logs to only capture errors (covered in other posts)
4. Using JSON encoding, which is slightly more CPU-intensive but much easier to filter downstream

Access logs and metrics serve different purposes. Metrics tell you that something is wrong (error rate went up). Access logs tell you exactly which requests failed and why. Having both available is the ideal setup for a production mesh.
