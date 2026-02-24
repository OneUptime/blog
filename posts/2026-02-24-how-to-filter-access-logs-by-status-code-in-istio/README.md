# How to Filter Access Logs by Status Code in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Access Logs, Filtering, Telemetry API, Envoy

Description: How to configure Istio to only log specific HTTP status codes using the Telemetry API filter expressions and Envoy access log filters.

---

Logging every single request in a production Istio mesh can generate an enormous amount of data. A service handling 5000 requests per second will produce 5000 log lines per second, and most of those will be successful 200 responses that you never look at. The logs you actually need are the ones showing failures and anomalies.

Istio's Telemetry API lets you filter access logs so only certain requests get logged. Filtering by status code is one of the most useful patterns.

## Filtering with the Telemetry API

The Telemetry API supports CEL (Common Expression Language) filter expressions. Here are the most common status code filters:

### Log Only Server Errors (5xx)

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: log-server-errors
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 500"
```

This logs only 500, 501, 502, 503, 504, and any other 5xx response. Everything else is silently dropped.

### Log All Errors (4xx and 5xx)

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: log-all-errors
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
```

### Log 5xx Errors Plus Specific 4xx Codes

Maybe you want to track unauthorized access (401) and forbidden requests (403) but not 404s:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: log-important-errors
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 500 || response.code == 401 || response.code == 403"
```

### Log Errors and Slow Requests

Combine status code filtering with latency filtering to catch both failures and performance issues:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: log-errors-and-slow
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400 || response.duration > duration('2s')"
```

### Exclude Health Checks

Health check endpoints generate a lot of 200 logs. Exclude them while keeping everything else:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: exclude-health-checks
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400 || !request.url_path.startsWith('/healthz')"
```

Actually, that expression would log everything that is not a health check (because any non-health-check request with code < 400 would still match the second condition). A better approach for "log everything except successful health checks":

```yaml
filter:
  expression: "!(response.code == 200 && request.url_path == '/healthz')"
```

## Per-Namespace Filtering

You can set different filtering levels per namespace. For example, production gets error-only logging while staging gets full logging:

```yaml
# Production: errors only
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: prod-logging
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 500"
---
# Staging: log everything
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: staging-logging
  namespace: staging
spec:
  accessLogging:
    - providers:
        - name: envoy
```

## Per-Workload Filtering

Some services are noisier than others. Apply stricter filtering to high-traffic services:

```yaml
# High-traffic service: only 5xx
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: api-gateway-logging
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 500"
---
# Low-traffic service: all errors
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: payment-logging
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
```

## Sampling Instead of Filtering

If you want to keep some percentage of successful requests for analysis while logging all errors:

The Telemetry API does not have built-in sampling, but you can work around this using multiple logging configurations. Log all errors to one provider, and sample successful requests to another:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: errors-log
        envoyFileAccessLog:
          path: /dev/stdout
          logFormat:
            labels:
              level: "error"
              timestamp: "%START_TIME%"
              method: "%REQ(:METHOD)%"
              path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
              response_code: "%RESPONSE_CODE%"
              response_flags: "%RESPONSE_FLAGS%"
              duration_ms: "%DURATION%"
              request_id: "%REQ(X-REQUEST-ID)%"
      - name: all-log
        envoyFileAccessLog:
          path: /dev/stdout
          logFormat:
            labels:
              level: "info"
              timestamp: "%START_TIME%"
              method: "%REQ(:METHOD)%"
              path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
              response_code: "%RESPONSE_CODE%"
              duration_ms: "%DURATION%"
```

Then use Telemetry with different filters:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: tiered-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: errors-log
      filter:
        expression: "response.code >= 400"
    - providers:
        - name: all-log
```

Downstream, your log aggregation pipeline can route the `level: "error"` logs to a different index or stream with longer retention.

## Verifying Filters Work

After applying a filter, verify that it is actually filtering:

```bash
# Send a successful request
kubectl exec deploy/sleep -- curl -s httpbin.default:8000/status/200

# Send a failing request
kubectl exec deploy/sleep -- curl -s httpbin.default:8000/status/503

# Check logs - should only see the 503 if filtering 5xx
kubectl logs deploy/httpbin -c istio-proxy --tail=5
```

If both requests appear in the logs, the filter is not being applied. Check:

1. The Telemetry resource is in the correct namespace
2. The selector labels match the workload (if using workload-level filtering)
3. There is no conflicting Telemetry resource at a higher scope
4. The mesh config does not have `accessLogFile` set, which enables unfiltered logging regardless of Telemetry configuration

That last point is important. If `meshConfig.accessLogFile` is set to `/dev/stdout`, it creates a default access log output that is not affected by Telemetry API filters. To use Telemetry-based filtering, remove `accessLogFile` from the mesh config and rely solely on the Telemetry API with extension providers:

```yaml
# Remove this from mesh config:
# accessLogFile: /dev/stdout

# Use this instead:
meshConfig:
  extensionProviders:
    - name: envoy
      envoyFileAccessLog:
        path: /dev/stdout
```

Then use the Telemetry API to control logging.

## Cost Impact

The impact of filtering on log volume and cost can be dramatic. In a typical production mesh:

- Full access logging: 100% of requests logged
- Error-only (5xx) logging: Usually 0.1% to 2% of requests logged
- Error + slow logging: Usually 1% to 5% of requests logged

If your log aggregation bill is based on ingest volume, filtering access logs by status code could reduce that portion of your bill by 95% or more. That is a significant savings for a simple configuration change.

Status code filtering is one of the most practical optimizations you can make to your Istio access logging setup. It preserves the logs you need for debugging while eliminating the noise you never look at.
