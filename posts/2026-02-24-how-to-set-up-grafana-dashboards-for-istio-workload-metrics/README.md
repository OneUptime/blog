# How to Set Up Grafana Dashboards for Istio Workload Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Grafana, Workload Metrics, Monitoring, Kubernetes

Description: Create Grafana dashboards focused on workload-level metrics in Istio to monitor individual deployments and their pod-level behavior.

---

Service-level dashboards tell you how a service is performing overall, but workload-level dashboards go deeper. They show you how specific deployments, replica sets, and pods are behaving within a service. This matters because a service might have multiple workloads (different versions, canary deployments, or separate components behind the same service name), and problems often hide at the workload level.

## Understanding Workload vs Service Metrics

In Istio's metric model, a "service" is the Kubernetes Service resource, while a "workload" is the actual running deployment. A single service can have multiple workloads behind it (for example, v1 and v2 deployments).

When you look at service-level metrics, you see aggregated numbers. Workload-level metrics break that down by `destination_workload` and `destination_workload_namespace`, letting you compare different workloads serving the same service.

## Installing the Istio Workload Dashboard

Istio includes a pre-built workload dashboard. If you installed the Grafana addon:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
```

Access it:

```bash
istioctl dashboard grafana
```

Navigate to Dashboards -> Browse -> Istio -> Istio Workload Dashboard.

## Building Custom Workload Panels

### Inbound Request Rate by Source

See who's sending traffic to this specific workload:

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload=~"$workload",
  destination_workload_namespace=~"$namespace"
}[5m])) by (source_workload, source_workload_namespace)
```

This is especially useful when you have a canary deployment. You can confirm that only the expected percentage of traffic is hitting the canary workload.

### Request Rate per Pod

Go one level deeper and see request rates per individual pod:

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload=~"$workload",
  destination_workload_namespace=~"$namespace"
}[5m])) by (pod)
```

This panel immediately shows load balancing effectiveness. If one pod has 3x the rate of others, you have an imbalance.

### Success Rate by Workload Version

Compare success rates across different versions of the same workload:

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload=~"$workload",
  destination_workload_namespace=~"$namespace",
  response_code!~"5.*"
}[5m])) by (destination_version)
/
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload=~"$workload",
  destination_workload_namespace=~"$namespace"
}[5m])) by (destination_version)
* 100
```

During a canary rollout, this panel tells you whether the new version is performing as well as the old one.

### Latency by Pod

Track P95 latency per pod to spot outliers:

```promql
histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{
  reporter="destination",
  destination_workload=~"$workload",
  destination_workload_namespace=~"$namespace"
}[5m])) by (le, pod))
```

If one pod consistently shows higher latency, it might be on a noisy neighbor node or running low on resources.

### Outbound Dependency Latency

See how fast each downstream dependency is responding:

```promql
histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{
  reporter="source",
  source_workload=~"$workload",
  source_workload_namespace=~"$namespace"
}[5m])) by (le, destination_service))
```

When your workload's overall latency spikes, this panel tells you which dependency caused it.

### Error Breakdown by Response Code

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload=~"$workload",
  destination_workload_namespace=~"$namespace"
}[5m])) by (response_code)
```

Use a stacked area chart to show how the mix of response codes changes over time. A sudden increase in 503s might indicate connection pool overflow, while 429s suggest rate limiting.

### TCP Metrics

For workloads using TCP connections:

```promql
# Bytes sent per second
sum(rate(istio_tcp_sent_bytes_total{
  reporter="destination",
  destination_workload=~"$workload",
  destination_workload_namespace=~"$namespace"
}[5m]))

# Bytes received per second
sum(rate(istio_tcp_received_bytes_total{
  reporter="destination",
  destination_workload=~"$workload",
  destination_workload_namespace=~"$namespace"
}[5m]))
```

## Dashboard Variables

Set up these template variables for your workload dashboard:

```text
# Namespace variable
label_values(istio_requests_total{reporter="destination"}, destination_workload_namespace)

# Workload variable (dependent on namespace)
label_values(istio_requests_total{reporter="destination", destination_workload_namespace=~"$namespace"}, destination_workload)
```

## Adding Kubernetes Resource Metrics

Workload dashboards benefit from including Kubernetes resource metrics alongside Istio metrics. If you have kube-state-metrics installed:

```promql
# CPU usage per pod
sum(rate(container_cpu_usage_seconds_total{
  namespace=~"$namespace",
  pod=~"$workload.*",
  container!="istio-proxy",
  container!=""
}[5m])) by (pod)

# Memory usage per pod
sum(container_memory_working_set_bytes{
  namespace=~"$namespace",
  pod=~"$workload.*",
  container!="istio-proxy",
  container!=""
}) by (pod)
```

These panels help correlate performance issues with resource consumption. A pod that's CPU-throttled will naturally have higher latency.

### Sidecar Proxy Resource Usage

Don't forget to monitor the Istio sidecar itself:

```promql
# Envoy CPU usage
sum(rate(container_cpu_usage_seconds_total{
  namespace=~"$namespace",
  pod=~"$workload.*",
  container="istio-proxy"
}[5m])) by (pod)

# Envoy memory usage
sum(container_memory_working_set_bytes{
  namespace=~"$namespace",
  pod=~"$workload.*",
  container="istio-proxy"
}) by (pod)
```

High sidecar resource usage can indicate configuration issues like too many routes or excessive logging.

## Comparing Workloads Side by Side

One powerful use of workload dashboards is comparing two workloads during a deployment. Create a dashboard with two rows, one for each workload, showing identical metrics:

```promql
# Row 1: Stable workload
sum(rate(istio_requests_total{reporter="destination", destination_workload="my-service-v1", destination_workload_namespace="$namespace"}[5m]))

# Row 2: Canary workload
sum(rate(istio_requests_total{reporter="destination", destination_workload="my-service-v2", destination_workload_namespace="$namespace"}[5m]))
```

This side-by-side comparison makes it obvious if the canary is performing differently from stable.

## Exporting Dashboard as JSON

Once you've built your dashboard, export it for version control:

1. Go to Dashboard Settings (gear icon)
2. Click "JSON Model" in the left sidebar
3. Copy the JSON
4. Save it to your Git repository

You can then provision it automatically:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio-workload-dashboard
  namespace: istio-system
  labels:
    grafana_dashboard: "1"
data:
  workload-dashboard.json: |
    <your dashboard JSON here>
```

## Summary

Workload-level Grafana dashboards for Istio give you visibility into individual deployments and pods within your services. They're essential for canary deployments, load balancing verification, and troubleshooting pod-specific issues. Key panels include per-pod request rates, latency comparisons, error breakdowns, and resource consumption. Combine Istio metrics with Kubernetes resource metrics for the complete picture, and use template variables to make your dashboard reusable across all workloads.
