# How to Monitor Wasm Plugin Performance Impact in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WASM, Performance, Monitoring, Prometheus, Envoy

Description: A practical guide to measuring and monitoring the performance impact of WebAssembly plugins running in your Istio service mesh proxies.

---

Running Wasm plugins in your Istio mesh is great for extensibility, but every plugin adds processing time to each request that flows through Envoy. If you are not watching the performance impact closely, a poorly optimized plugin can silently add latency across your entire mesh. Here is how to set up proper monitoring so you always know what your Wasm plugins are costing you.

## Why Wasm Plugin Performance Matters

Every HTTP request in an Istio mesh goes through at least two Envoy proxies (one on the client side, one on the server side). If your Wasm plugin adds 2ms of processing time per request, that is actually 4ms of added latency for each call. At high request rates, this adds up fast. You need visibility into exactly how much time your plugins consume.

## Key Metrics to Track

Envoy exposes several metrics related to Wasm execution. The ones you care about most are:

- **Request duration increase** - How much latency does the plugin add?
- **Memory consumption** - How much memory does the Wasm VM use?
- **Plugin execution errors** - Is the plugin failing on some requests?
- **VM creation and destruction rates** - Are VMs being recycled too frequently?

## Setting Up Prometheus to Scrape Wasm Metrics

If you already have Prometheus scraping your Istio mesh (which you should), Envoy's Wasm metrics are already being collected. You can verify by checking the raw metrics endpoint of any sidecar:

```bash
kubectl exec my-service-pod-xyz -c istio-proxy -- \
  curl -s localhost:15000/stats/prometheus | grep wasm
```

You should see metrics like:

```
envoy_wasm_envoy_wasm_runtime_v8_active{} 2
envoy_wasm_envoy_wasm_runtime_v8_created{} 5
envoy_wasm_remote_load_cache_entries{} 1
envoy_wasm_remote_load_cache_hits{} 45
envoy_wasm_remote_load_cache_misses{} 1
```

## Measuring Latency Impact with Istio Telemetry

The most direct way to measure plugin impact is to compare request latency before and after deploying the plugin. Istio already tracks request duration through its standard metrics. Use this Prometheus query to see p99 latency for a specific service:

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service_name="my-service",
    reporter="destination"
  }[5m])) by (le)
)
```

Run this query before deploying your Wasm plugin and again after. The difference tells you the latency cost.

For a more granular view, you can use Envoy's built-in filter timing. Add stats tags to your WasmPlugin to make it easier to identify in metrics:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-custom-plugin
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: my-service
  url: oci://registry.example.com/wasm-plugins/custom:v1.0.0
  phase: STATS
  pluginConfig:
    enable_timing: true
```

## Tracking Wasm VM Memory Usage

Each Wasm plugin runs inside a V8 virtual machine in Envoy. These VMs consume memory, and if you have many plugins or high concurrency, memory usage can grow significantly. Monitor the proxy container memory usage:

```promql
container_memory_working_set_bytes{
  container="istio-proxy",
  pod=~"my-service.*"
}
```

Compare this against pods that do not have your Wasm plugin loaded. You can also get per-proxy memory stats from the Envoy admin interface:

```bash
kubectl exec my-service-pod-xyz -c istio-proxy -- \
  curl -s localhost:15000/memory
```

This returns a JSON response showing allocated and heap memory sizes.

## Creating a Grafana Dashboard

Put all these metrics together in a Grafana dashboard. Here is a JSON snippet for a panel that tracks Wasm-related metrics:

```json
{
  "targets": [
    {
      "expr": "sum(envoy_wasm_envoy_wasm_runtime_v8_active) by (pod)",
      "legendFormat": "Active VMs - {{pod}}"
    },
    {
      "expr": "sum(rate(envoy_wasm_envoy_wasm_runtime_v8_created[5m])) by (pod)",
      "legendFormat": "VM Creation Rate - {{pod}}"
    }
  ],
  "title": "Wasm VM Activity",
  "type": "timeseries"
}
```

Add panels for:

1. **P50/P95/P99 request latency** with a baseline annotation marking when the plugin was deployed
2. **Proxy memory usage** compared to pods without the plugin
3. **Wasm VM active count** to see how many VMs are running
4. **Error rates** filtered by Wasm-related error codes

## Using EnvoyFilter for Detailed Timing

If you need more precise timing data, you can add an EnvoyFilter that enables Envoy's detailed filter timing stats:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: enable-wasm-timing
  namespace: istio-system
spec:
  configPatches:
  - applyTo: LISTENER
    match:
      context: SIDECAR_INBOUND
    patch:
      operation: MERGE
      value:
        listener_filters_timeout: 5s
        per_connection_buffer_limit_bytes: 32768
```

This gives you more granular data about how long each filter in the chain takes to process requests.

## Load Testing to Measure Impact

Numbers from production are great, but you should also run controlled load tests. Use a tool like Fortio (which is already part of the Istio ecosystem):

```bash
# Baseline test without the plugin
kubectl exec fortio-pod -- fortio load \
  -c 50 -qps 1000 -t 60s \
  http://my-service:8080/api/test

# Deploy the plugin, then run the same test
kubectl apply -f wasmplugin.yaml

# Wait for the plugin to propagate
sleep 30

# Run the same test again
kubectl exec fortio-pod -- fortio load \
  -c 50 -qps 1000 -t 60s \
  http://my-service:8080/api/test
```

Compare the p50, p95, and p99 latency numbers from both runs. Also compare the error rates and max response times.

## Setting Up Alerts

Once you know what normal looks like, set up alerts for abnormal behavior. Here are some useful alert rules:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: wasm-plugin-alerts
  namespace: monitoring
spec:
  groups:
  - name: wasm-plugin-performance
    rules:
    - alert: WasmPluginHighLatency
      expr: |
        histogram_quantile(0.99,
          sum(rate(istio_request_duration_milliseconds_bucket{
            destination_service_name="my-service"
          }[5m])) by (le)
        ) > 500
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High latency detected on service with Wasm plugin"

    - alert: WasmVMMemoryHigh
      expr: |
        container_memory_working_set_bytes{
          container="istio-proxy",
          pod=~"my-service.*"
        } > 256e6
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Istio proxy memory usage exceeding 256MB"
```

## Debugging Performance Issues

If your monitoring shows a performance problem, here is how to dig in:

1. Check Envoy's active dump for the plugin:

```bash
kubectl exec my-service-pod-xyz -c istio-proxy -- \
  curl -s localhost:15000/config_dump | jq '.configs[] | select(.["@type"] | contains("listener"))'
```

2. Look at Envoy access logs with timing information:

```bash
kubectl logs my-service-pod-xyz -c istio-proxy --tail=100
```

3. Profile the proxy itself using Envoy's built-in profiling:

```bash
kubectl exec my-service-pod-xyz -c istio-proxy -- \
  curl -s localhost:15000/stats | grep -i wasm
```

4. Check if the Wasm binary size is reasonable. Larger binaries take longer to load:

```bash
kubectl exec my-service-pod-xyz -c istio-proxy -- \
  ls -la /var/lib/istio/data/
```

## Performance Best Practices

Based on what you learn from monitoring, here are some optimization tips:

- Keep your Wasm binary as small as possible. Strip debug symbols for production builds.
- Minimize memory allocations in your plugin code. Reuse buffers where possible.
- Avoid blocking operations in the plugin. Wasm plugins run synchronously in the request path.
- Use `imagePullPolicy: IfNotPresent` to avoid re-downloading the binary on every proxy restart.
- Test with realistic traffic patterns, not just synthetic benchmarks.

## Summary

Monitoring Wasm plugin performance is not something you do once and forget about. Set up proper dashboards, run load tests before and after deploying plugins, configure alerts for when things drift, and keep an eye on both latency and memory consumption. The metrics are all there in Envoy and Prometheus - you just need to know where to look and what thresholds matter for your services.
