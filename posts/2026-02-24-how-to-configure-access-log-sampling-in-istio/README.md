# How to Configure Access Log Sampling in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Access Logs, Sampling, Envoy, Observability

Description: Learn how to configure access log sampling in Istio to control log volume while retaining visibility into your service mesh traffic patterns.

---

When you first enable access logging in Istio, every single request that flows through the mesh generates a log entry. For a small development cluster, that's perfectly fine. But once you're handling thousands of requests per second in production, those logs start eating up storage, overwhelming your log aggregation pipeline, and driving up costs. Access log sampling gives you a way to keep logs useful without drowning in them.

## Why Sample Access Logs?

The math is straightforward. If your mesh handles 10,000 requests per second and each log line is roughly 1 KB, you're generating about 10 MB/s of log data. That adds up to over 800 GB per day. Most of that data is repetitive - successful health checks, routine API calls, and standard responses. Sampling lets you capture a representative slice of your traffic without storing every single request.

## Understanding How Istio Access Logging Works

Istio's data plane is built on Envoy proxies. Each sidecar proxy can emit access logs for every request it handles. By default, Istio configures these proxies through the `MeshConfig` or through the Telemetry API (introduced in Istio 1.12+). The Telemetry API is the recommended approach for newer Istio versions.

## Configuring Sampling with the Telemetry API

The Telemetry API provides a clean way to configure access log sampling. You can apply it mesh-wide, per-namespace, or per-workload.

Here's a mesh-wide configuration that samples 10% of access logs:

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
      filter:
        expression: "connection.mtls && request.url_path.contains('/api/')"
```

The `filter` field uses Common Expression Language (CEL) to decide which requests get logged. This is not random sampling per se - it's conditional logging. But you can combine it with random sampling using the `randomSamplingPercentage` attribute.

For random percentage-based sampling, you can use an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: access-log-sampling
  namespace: istio-system
spec:
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
      patch:
        operation: MERGE
        value:
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
            access_log_options:
              access_log_flush_interval: 10s
```

## Using CEL Expressions for Smart Sampling

The real power of the Telemetry API filter is that you can write expressions that target specific traffic patterns. Instead of random sampling, you can make deliberate choices about what gets logged.

Log only requests that result in errors:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: error-logging
  namespace: my-app
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
```

Log slow requests (over 1 second):

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: slow-request-logging
  namespace: my-app
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.duration > duration('1s')"
```

Combine multiple conditions - log errors and a percentage of successful requests:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: combined-logging
  namespace: my-app
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400 || response.code == 0"
    - providers:
        - name: envoy
      filter:
        expression: "response.code < 400"
      disabled: false
```

## Per-Workload Sampling Configuration

You might want different sampling rates for different services. A payment service probably deserves 100% logging, while a health check endpoint can get by with much less.

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: payment-logging
  namespace: payments
spec:
  selector:
    matchLabels:
      app: payment-service
  accessLogging:
    - providers:
        - name: envoy
```

This configuration applies full logging to just the payment-service workload. Other workloads in the namespace inherit whatever the namespace or mesh-level default is.

## Configuring Sampling via MeshConfig

If you prefer to set things globally through `MeshConfig`, you can configure the access log settings when installing or upgrading Istio:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    defaultConfig:
      proxyStatsMatcher:
        inclusionRegexps:
          - ".*"
```

To control whether access logging is on or off at the mesh level:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    enableAccessLogForExternalServices: true
```

Setting `accessLogFile` to an empty string disables access logging entirely at the mesh level. You can then selectively enable it for specific namespaces or workloads using the Telemetry API.

## Verifying Your Sampling Configuration

After applying your configuration, verify that it's working correctly:

```bash
# Check that the Telemetry resource was created
kubectl get telemetry -A

# Look at the actual Envoy configuration
istioctl proxy-config log <pod-name> --level info

# Watch logs from a specific pod's sidecar
kubectl logs <pod-name> -c istio-proxy -f

# Generate some test traffic
kubectl exec deploy/sleep -- curl -s http://httpbin:8000/status/200
kubectl exec deploy/sleep -- curl -s http://httpbin:8000/status/500
```

If you configured error-only logging, you should see log entries for the 500 response but not the 200.

## Practical Sampling Strategy

Here's a strategy that works well for most production environments:

1. Log 100% of errors (4xx and 5xx responses)
2. Log 100% of slow requests (duration above your SLO threshold)
3. Log 5-10% of successful requests for baseline visibility
4. Log 100% for critical services like authentication and payments
5. Disable logging entirely for noisy internal endpoints like health checks

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
        expression: "response.code >= 400 || response.duration > duration('500ms')"
```

Then override for specific namespaces or workloads as needed.

## Common Pitfalls

One thing that catches people off guard is that the Telemetry API uses a merge strategy. If you have a mesh-wide Telemetry resource and a namespace-level one, the namespace-level config takes precedence for workloads in that namespace. It does not combine with the mesh-wide config.

Another gotcha is that CEL expressions in the filter field are evaluated per-request. If your expression is computationally expensive, it could add latency. Keep expressions simple and focused on readily available attributes like response codes and durations.

Finally, remember that disabling access logs does not affect metrics or traces. Those are configured separately. You can have full metrics collection with minimal access logging, which is often the right balance for production.

## Wrapping Up

Access log sampling in Istio is about finding the right balance between visibility and resource consumption. Start with the Telemetry API and CEL-based filtering for the most flexibility. Use error-based and latency-based filters to capture the logs that actually matter, and apply per-workload overrides for your most critical services. Your log aggregation pipeline and your cloud bill will thank you.
