# How to Reduce Access Log Volume in Production with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Access Logs, Production, Cost Optimization, Observability

Description: Practical strategies for reducing Istio access log volume in production without sacrificing the ability to debug issues effectively.

---

Running Istio in production with full access logging can generate an enormous amount of data. A mesh handling 50,000 requests per second will produce roughly 4 TB of access logs per day if every request gets logged on both the client and server sidecar. That's expensive to store, expensive to process, and most of it is noise. Here's how to cut that volume down to something manageable while keeping the data you actually need.

## Understanding Where Log Volume Comes From

Before optimizing, it helps to know what generates the most log entries. In a typical Istio mesh:

- Each HTTP request generates two log entries by default - one from the client-side sidecar and one from the server-side sidecar
- Health check probes from Kubernetes (liveness, readiness, startup) generate log entries every few seconds per pod
- Internal service-to-service calls for retries, circuit breaker probes, and keep-alives add up
- Ingress gateway traffic gets logged at the gateway plus the destination sidecar

For a deployment with 100 pods, each receiving health checks every 10 seconds, that's 600 health check log entries per minute before any real traffic even starts.

## Strategy 1: Disable Logging for Health Checks

Health check traffic is the lowest-value log data in most environments. Filter it out using the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: skip-health-checks
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "!request.url_path.contains('/health') && !request.url_path.contains('/ready') && !request.url_path.contains('/livez') && !request.url_path.contains('/readyz')"
```

This filters out requests to common health check endpoints. Adjust the paths to match your application's health check URLs.

## Strategy 2: Log Only Errors and Slow Requests

For most production debugging scenarios, you care about two things: requests that failed and requests that were slow. Everything else is baseline data that you can get from metrics instead.

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: errors-and-slow
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400 || response.code == 0 || response.duration > duration('2s')"
```

The `response.code == 0` catches connection failures where no response was received. The duration threshold should match your SLO - if your SLO is 500ms p99, set the threshold a bit above that.

This single change typically reduces log volume by 95% or more in a healthy production system.

## Strategy 3: Disable Client-Side Logging

Every request generates logs on both the client sidecar and the server sidecar. The server-side log has most of the useful information (upstream timing, actual response code, etc.). Disabling client-side logging cuts volume in half.

You can't directly disable client vs. server logging through the Telemetry API, but you can achieve it through the Envoy access log configuration. Use the `%RESPONSE_FLAGS%` variable and a filter to identify server-side logs:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: server-side-only
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "connection.requested_server_name != ''"
```

The `requested_server_name` is typically populated on the server side when mTLS is active, making it a reasonable heuristic for server-side logging.

## Strategy 4: Different Rates for Different Services

Not all services deserve the same logging treatment. Your payment processing service should probably log everything, while your image thumbnail service can get by with error-only logging.

```yaml
# Critical service - log everything
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: full-logging
  namespace: payments
spec:
  selector:
    matchLabels:
      app: payment-processor
  accessLogging:
    - providers:
        - name: envoy
---
# Non-critical service - errors only
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: error-logging
  namespace: media
spec:
  selector:
    matchLabels:
      app: thumbnail-service
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
```

## Strategy 5: Disable Logging Entirely and Rely on Metrics

This is the most aggressive approach. If you have good metrics coverage (which Istio provides by default), you might not need access logs for most services at all.

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

Then selectively enable it for services where you need log-level detail:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: enable-logging
  namespace: critical-services
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400 || response.duration > duration('1s')"
```

## Strategy 6: Reduce Log Payload Size

Even when you log every request, you can reduce the size of each log entry by only including the fields you need:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    accessLogFormat: |
      {
        "ts": "%START_TIME%",
        "sc": "%RESPONSE_CODE%",
        "d": "%DURATION%",
        "p": "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%",
        "uh": "%UPSTREAM_HOST%",
        "rf": "%RESPONSE_FLAGS%",
        "tid": "%REQ(X-B3-TRACEID)%"
      }
```

Short field names save bytes per entry. At scale, this adds up. A typical access log entry goes from around 800 bytes to under 300 bytes with a minimal format.

## Strategy 7: Use Log Aggregation-Side Filtering

Sometimes it's easier to filter logs at the collection layer rather than at the source. Tools like Fluentd, Fluent Bit, and Vector can drop log entries based on content:

```yaml
# Fluent Bit filter to drop health check logs
[FILTER]
    Name    grep
    Match   kube.*istio-proxy*
    Exclude log /health|/ready|/livez
```

```yaml
# Vector transform to filter by status code
[transforms.filter_success]
  type = "filter"
  inputs = ["kubernetes_logs"]
  condition = '.response_code >= 400 || .duration_ms > 2000'
```

This gives you flexibility without needing to reconfigure Istio, though it does mean the logs still get generated and consume sidecar resources before being dropped.

## Measuring the Impact

Before and after making changes, measure your log volume:

```bash
# Count log entries per second from istio-proxy containers
kubectl logs -l app=my-service -c istio-proxy --tail=1000 --timestamps | \
  awk '{print substr($1,1,19)}' | sort | uniq -c | tail -5

# Check the size of logs being generated
kubectl top pod -l app=my-service --containers | grep istio-proxy
```

You can also check Envoy stats for logging metrics:

```bash
kubectl exec deploy/my-service -c istio-proxy -- \
  curl -s localhost:15000/stats | grep access_log
```

## A Practical Production Configuration

Here's a complete configuration that combines several strategies. It works well as a starting point for most production environments:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: production-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: >
          (response.code >= 400 || response.code == 0 || response.duration > duration('2s'))
          && !request.url_path.contains('/health')
          && !request.url_path.contains('/ready')
          && !request.url_path.contains('/metrics')
```

This logs errors and slow requests while filtering out health checks and metrics endpoints. Apply it mesh-wide, then add overrides for specific namespaces or workloads that need more or less logging.

## What to Monitor After Reducing Logs

After cutting log volume, make sure you still have visibility through other channels:

- Istio metrics (request count, duration, error rate) remain unaffected by log configuration
- Distributed traces capture individual request details with their own sampling rate
- Envoy stats provide connection and cluster-level statistics

The goal isn't to eliminate logs entirely. It's to make them targeted and useful rather than an expensive firehose of data that nobody looks at until something breaks.
