# How to Handle Prometheus Metric Scraping in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Prometheus, Metric Scraping, Envoy, Monitoring

Description: Practical guidance on handling Prometheus metric scraping in Istio mesh environments, covering merged metrics, scrape ports, mTLS challenges, and performance tuning.

---

Scraping metrics in an Istio mesh is not as straightforward as scraping a regular Kubernetes application. The Envoy sidecar adds its own metrics endpoint, mTLS can block scrape requests, and the way Istio merges application metrics with proxy metrics creates configuration challenges. This guide covers the practical details of getting metric scraping working correctly in an Istio environment.

## The Scraping Challenge with mTLS

In a mesh with mTLS enabled, all traffic between pods is encrypted. This means Prometheus cannot just reach into a pod and scrape its metrics endpoint over plain HTTP. The scrape request gets rejected because Prometheus is not part of the mesh (unless it has a sidecar too).

There are several ways to handle this.

### Option 1: Scrape Through the Sidecar Agent

Istio provides a mechanism called Prometheus metrics merging. The istio-agent process inside the sidecar pod listens on port 15020 and proxies both Envoy metrics and application metrics. This port is available over plain HTTP, bypassing mTLS:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enablePrometheusMerge: true
```

With this enabled, Prometheus scrapes port 15020 on each pod and gets both application and Envoy metrics in a single request:

```yaml
scrape_configs:
- job_name: 'istio-mesh'
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    action: keep
    regex: true
  - source_labels: [__address__]
    action: replace
    regex: ([^:]+)(?::\d+)?
    replacement: ${1}:15020
    target_label: __address__
  - replacement: /stats/prometheus
    target_label: __metrics_path__
```

### Option 2: Add a Sidecar to Prometheus

If Prometheus itself has an Istio sidecar, it can scrape other sidecars over mTLS. This works but adds complexity. The Prometheus pod needs to be in the mesh:

```bash
kubectl label namespace monitoring istio-injection=enabled
kubectl rollout restart deployment prometheus -n monitoring
```

The downside is that Prometheus now depends on the sidecar being healthy to scrape anything.

### Option 3: Use Envoy Stats Port

Envoy exposes its stats on port 15090 using plain HTTP by default. This port is not behind mTLS. Prometheus can scrape it directly:

```yaml
scrape_configs:
- job_name: 'envoy-stats'
  metrics_path: /stats/prometheus
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_container_name]
    action: keep
    regex: istio-proxy
  - source_labels: [__address__]
    action: replace
    regex: ([^:]+)(?::\d+)?
    replacement: ${1}:15090
    target_label: __address__
```

This gives you Envoy metrics but not your application metrics. You need a separate scrape config for application metrics.

## Application Metric Scraping

Your application exposes its own Prometheus metrics on a port and path you define. In a non-mesh environment, Prometheus scrapes that port directly. With Istio, you have options:

### Using Prometheus Merge

When `enablePrometheusMerge` is true, add standard Prometheus annotations to your pod:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: my-app
        ports:
        - containerPort: 8080
```

Istio will read these annotations and configure the agent on port 15020 to scrape your application at port 8080 and merge those metrics with the Envoy metrics.

### Without Merge

If you do not use metrics merging, you need two scrape configs. One for Envoy metrics on port 15090, and one for your application metrics. For the application metrics, you either need Prometheus in the mesh or you need to use a port that bypasses mTLS.

You can exclude specific ports from Istio traffic interception:

```yaml
metadata:
  annotations:
    traffic.istio.io/excludeInboundPorts: "8080"
```

This tells the Istio sidecar not to intercept traffic on port 8080, so Prometheus can scrape it over plain HTTP. The downside is that all traffic to that port bypasses the sidecar, not just Prometheus scrapes.

## Scrape Intervals and Performance

Every Envoy sidecar in a large mesh generates a lot of metrics. With thousands of pods, scraping every 15 seconds can put serious load on Prometheus.

Estimate the load:

```text
pods * metrics_per_pod * (1 / scrape_interval) = samples_per_second
```

A typical Envoy sidecar exposes around 500-1000 metrics. With 1000 pods and a 15-second scrape interval:

```text
1000 * 750 * (1/15) = 50,000 samples/second
```

That is manageable, but with higher pod counts it grows fast. Ways to reduce the load:

### Increase Scrape Interval

```yaml
scrape_configs:
- job_name: 'envoy-stats'
  scrape_interval: 30s
```

Going from 15s to 30s cuts the sample rate in half.

### Drop Unnecessary Metrics at Scrape Time

Use `metric_relabel_configs` to drop metrics you do not need:

```yaml
metric_relabel_configs:
- source_labels: [__name__]
  regex: 'envoy_cluster_upstream_cx_.*|envoy_listener_.*_downstream_cx_.*'
  action: drop
```

### Use Istio's Built-In Metric Filtering

Istio can be configured to only generate a subset of standard metrics:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyStatsMatcher:
        inclusionRegexps:
        - ".*circuit_breakers.*"
        inclusionPrefixes:
        - "upstream_rq_retry"
        - "upstream_cx"
```

Without `proxyStatsMatcher`, Envoy only reports the standard Istio metrics (istio_requests_total, etc.). Adding matchers enables additional Envoy-native metrics. Be careful not to enable too many.

## Handling Scrape Failures

When a sidecar is starting up or shutting down, metric scrapes might fail. This is normal and should not trigger alerts. Configure Prometheus to tolerate some failures:

```yaml
scrape_configs:
- job_name: 'envoy-stats'
  scrape_interval: 15s
  scrape_timeout: 10s
  sample_limit: 50000
```

The `sample_limit` prevents a single target from overwhelming Prometheus if something goes wrong and a sidecar starts generating an abnormal number of metrics.

## Verifying Scraping Works

After configuring scraping, verify that metrics are flowing:

```bash
# Check if Istio metrics are present
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
curl -s 'localhost:9090/api/v1/query?query=istio_requests_total' | jq '.data.result | length'
```

Check for scrape errors in the Prometheus targets page:

```bash
curl -s 'localhost:9090/api/v1/targets' | jq '.data.activeTargets[] | select(.health=="down") | {job: .labels.job, instance: .labels.instance, error: .lastError}'
```

## Common Pitfalls

**Duplicate metrics**: If you scrape both port 15020 (merged) and port 15090 (Envoy stats), you will get duplicate Envoy metrics. Pick one approach.

**Missing application metrics**: If `enablePrometheusMerge` is true but your application metrics are not showing up, check that the prometheus.io annotations are on the pod template, not the Deployment metadata.

**Stale metrics after pod deletion**: Prometheus keeps stale metrics for 5 minutes by default. If you see metrics from deleted pods, this is normal and they will disappear.

**High memory usage in Prometheus**: Usually caused by too many unique time series from Envoy sidecars. Use metric relabeling to drop what you do not need.

Getting metric scraping right in Istio takes some upfront configuration, but once it is working, it provides deep visibility into both your mesh traffic and your application performance.
