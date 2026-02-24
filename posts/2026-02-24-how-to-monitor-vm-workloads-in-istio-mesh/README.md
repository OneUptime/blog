# How to Monitor VM Workloads in Istio Mesh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Monitoring, Virtual Machine, Prometheus, Observability

Description: How to collect metrics, traces, and logs from VM workloads in an Istio service mesh and integrate them with your existing observability stack.

---

VM workloads in an Istio mesh generate the same telemetry data as Kubernetes workloads. The sidecar proxy on the VM produces Prometheus metrics, distributes trace spans, and writes access logs. The challenge is collecting this data, since VMs are not part of Kubernetes and do not have the same service discovery and scraping infrastructure.

This post covers how to scrape metrics from VM sidecars, collect traces, aggregate logs, and build dashboards that give you visibility into both VM and Kubernetes workloads.

## What Telemetry VM Sidecars Generate

The Istio sidecar on a VM generates the same standard Istio metrics as Kubernetes pods:

- `istio_requests_total` - total request count
- `istio_request_duration_milliseconds` - request latency histogram
- `istio_request_bytes` - request size
- `istio_response_bytes` - response size
- `istio_tcp_connections_opened_total` - TCP connections
- `istio_tcp_connections_closed_total` - TCP connection closures

These metrics are available on the sidecar's Prometheus endpoint:

```bash
# On the VM
curl localhost:15090/stats/prometheus
```

The metrics include standard Istio labels like `source_workload`, `destination_service`, `response_code`, and importantly `source_cluster` and `destination_cluster`.

## Scraping Metrics from VMs

### Approach 1: Prometheus Static Targets

If you have a small number of VMs, add them as static targets in your Prometheus configuration:

```yaml
scrape_configs:
- job_name: 'istio-vm-proxies'
  metrics_path: /stats/prometheus
  static_configs:
  - targets:
    - '10.0.1.10:15090'
    - '10.0.1.11:15090'
    - '10.0.1.12:15090'
    labels:
      cluster: cluster1
      source: vm
```

This works but requires manual updates when VMs are added or removed.

### Approach 2: Prometheus File-Based Service Discovery

Better than static configs, use file-based service discovery so you can update targets without restarting Prometheus:

```yaml
scrape_configs:
- job_name: 'istio-vm-proxies'
  metrics_path: /stats/prometheus
  file_sd_configs:
  - files:
    - /etc/prometheus/vm-targets/*.json
    refresh_interval: 30s
```

Create a JSON file with your VM targets:

```json
[
  {
    "targets": ["10.0.1.10:15090", "10.0.1.11:15090"],
    "labels": {
      "app": "legacy-db",
      "namespace": "vm-apps",
      "cluster": "cluster1"
    }
  },
  {
    "targets": ["10.0.2.20:15090"],
    "labels": {
      "app": "legacy-api",
      "namespace": "vm-apps",
      "cluster": "cluster1"
    }
  }
]
```

Automate the generation of this file using your VM inventory system (Ansible, Terraform, etc.).

### Approach 3: Prometheus Consul or DNS Service Discovery

If your VMs are registered in Consul or have DNS records:

```yaml
scrape_configs:
- job_name: 'istio-vm-proxies'
  metrics_path: /stats/prometheus
  consul_sd_configs:
  - server: 'consul.example.com:8500'
    services:
    - 'istio-vm'
  relabel_configs:
  - source_labels: [__address__]
    regex: '(.+):.*'
    target_label: __address__
    replacement: '${1}:15090'
```

### Approach 4: Push-Based Metrics with OpenTelemetry Collector

Instead of having Prometheus pull from VMs, install an OpenTelemetry Collector on each VM that pushes metrics:

```yaml
# otel-collector-config.yaml on the VM
receivers:
  prometheus:
    config:
      scrape_configs:
      - job_name: 'istio-proxy'
        metrics_path: /stats/prometheus
        static_configs:
        - targets: ['localhost:15090']

exporters:
  prometheusremotewrite:
    endpoint: https://mimir.example.com/api/v1/push
    headers:
      X-Scope-OrgID: istio-mesh
    external_labels:
      cluster: cluster1
      source: vm

service:
  pipelines:
    metrics:
      receivers: [prometheus]
      exporters: [prometheusremotewrite]
```

This is the most scalable approach because you do not need to expose the VM's metrics port externally.

## Distributed Tracing from VMs

The VM sidecar automatically generates trace spans. Configure the tracing backend in the mesh configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    extensionProviders:
    - name: jaeger
      opentelemetry:
        service: jaeger-collector.observability.example.com
        port: 4317
```

The VM sidecar picks up this configuration from Istiod and sends spans to the configured collector. No additional configuration is needed on the VM itself.

Verify traces are being sent:

```bash
# Check Envoy stats on the VM for tracing
curl localhost:15000/stats | grep tracing
```

Look for `tracing.opentelemetry.spans_sent` to confirm spans are being sent.

### Application-Level Tracing

For end-to-end distributed tracing, your VM application needs to propagate trace headers. The sidecar handles the first and last span, but your application must pass headers like `x-request-id`, `x-b3-traceid`, `x-b3-spanid`, and `traceparent` (for W3C) to downstream calls.

If your application does not propagate headers, you will see disconnected spans rather than a complete trace.

## Access Logging

Enable access logging for VM workloads through the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: vm-logging
  namespace: vm-apps
spec:
  accessLogging:
  - providers:
    - name: envoy
```

Access logs are written to the sidecar's stdout on the VM, which goes to the systemd journal:

```bash
# View access logs on the VM
sudo journalctl -u istio -f | grep '\[accesslog\]'
```

To ship these logs to a central system, use a log collector on the VM:

```yaml
# Promtail configuration for VM Istio logs
scrape_configs:
- job_name: istio-access-logs
  journal:
    labels:
      job: istio-vm
    path: /var/log/journal
  relabel_configs:
  - source_labels: ['__journal__systemd_unit']
    target_label: 'unit'
  pipeline_stages:
  - match:
      selector: '{unit="istio.service"}'
      stages:
      - json:
          expressions:
            method: method
            path: path
            response_code: response_code
            duration: duration
      - labels:
          method:
          response_code:
  - static_labels:
      cluster: cluster1
      workload_type: vm
```

## Grafana Dashboards for VM Workloads

Create dashboards that show VM-specific metrics:

### VM Workload Request Rate

```
sum(rate(istio_requests_total{
  source_workload_namespace="vm-apps",
  reporter="source"
}[5m])) by (source_workload, destination_service)
```

### VM to Kubernetes Traffic

```
sum(rate(istio_requests_total{
  source_workload_namespace="vm-apps",
  destination_workload_namespace!="vm-apps",
  reporter="source"
}[5m])) by (source_workload, destination_workload)
```

### VM Error Rate

```
sum(rate(istio_requests_total{
  destination_workload_namespace="vm-apps",
  response_code=~"5..",
  reporter="destination"
}[5m]))
/
sum(rate(istio_requests_total{
  destination_workload_namespace="vm-apps",
  reporter="destination"
}[5m]))
```

### VM Latency P99

```
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_workload_namespace="vm-apps",
    reporter="destination"
  }[5m])) by (le, destination_workload)
)
```

## Alerting on VM Workloads

Set up alerts specific to VM workloads:

```yaml
groups:
- name: istio-vm-alerts
  rules:
  - alert: VMWorkloadHighErrorRate
    expr: |
      sum(rate(istio_requests_total{
        destination_workload_namespace="vm-apps",
        response_code=~"5.."
      }[5m])) by (destination_workload)
      /
      sum(rate(istio_requests_total{
        destination_workload_namespace="vm-apps"
      }[5m])) by (destination_workload) > 0.05
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "VM workload {{ $labels.destination_workload }} error rate above 5%"

  - alert: VMSidecarDisconnected
    expr: |
      absent(up{job="istio-vm-proxies"} == 1)
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "VM sidecar is not responding to scrapes"
```

## Kiali Visibility for VM Workloads

Kiali automatically displays VM workloads in the service graph if they are registered as WorkloadEntries. You will see:

- VM workloads as nodes in the graph (with a VM icon)
- Traffic edges between VM and Kubernetes workloads
- Error rates and latency for VM endpoints

Make sure Kiali has access to the namespace where your WorkloadEntries live.

## Troubleshooting

**No metrics from VM**: Check that port 15090 is accessible and the sidecar is running:

```bash
curl localhost:15090/stats/prometheus | head -20
```

**Missing labels on metrics**: Some labels like `destination_cluster` only appear when the VM sidecar has properly registered with Istiod. Check proxy status:

```bash
istioctl proxy-status | grep vm
```

**Traces not connecting**: Verify your application propagates trace context headers. The sidecar creates spans, but the application must bridge them.

## Summary

Monitoring VM workloads in Istio uses the same metrics, traces, and logs as Kubernetes workloads. The difference is in collection - you need to set up scraping or pushing for VM metrics since they are not discoverable through Kubernetes service discovery. Use file-based service discovery or an OpenTelemetry Collector for metrics, the mesh-level tracing configuration for distributed traces, and a log shipper for access logs. Once the data reaches your observability stack, VM and Kubernetes workloads appear side by side in dashboards and service graphs.
