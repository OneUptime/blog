# How to Monitor ztunnel Health and Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ztunnel, Monitoring, Ambient Mesh, Prometheus, Kubernetes

Description: Learn how to monitor ztunnel health and performance in Istio ambient mode using metrics, logs, and dashboards for production observability.

---

The ztunnel is the backbone of Istio's ambient mode. It runs as a DaemonSet on every node, handling mTLS encryption, L4 authorization, and basic telemetry for all pods in the ambient mesh. When ztunnel has problems, your entire mesh on that node has problems. Monitoring it properly isn't optional.

Unlike sidecar proxies where a failure impacts one pod, a ztunnel failure affects every ambient mesh pod on that node. That makes monitoring even more critical than it was in the sidecar world.

## Checking ztunnel Pod Status

Start with the basics. Make sure all ztunnel pods are running:

```bash
kubectl get pods -n istio-system -l app=ztunnel -o wide
```

You want to see one ztunnel pod per node, all in Running state. If any pod is in CrashLoopBackOff or Pending, that node's ambient mesh traffic is broken.

Check for recent restarts:

```bash
kubectl get pods -n istio-system -l app=ztunnel -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].restartCount}{"\n"}{end}'
```

A restart count that keeps climbing is a clear sign something is wrong, whether it's resource limits being hit or a bug causing crashes.

## ztunnel Metrics

ztunnel exposes Prometheus metrics on port 15020. These metrics give you visibility into traffic volume, connection health, and proxy performance.

Key metrics to watch:

**Connection metrics:**
- `istio_tcp_connections_opened_total` - Total TCP connections opened
- `istio_tcp_connections_closed_total` - Total TCP connections closed
- `istio_tcp_sent_bytes_total` - Bytes sent
- `istio_tcp_received_bytes_total` - Bytes received

**Request duration:**
- `istio_request_duration_milliseconds` - Request latency histogram (available when waypoint is involved)

To scrape these metrics, make sure your Prometheus is configured to discover ztunnel pods. If you're using the Prometheus Operator, add a PodMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: ztunnel-monitor
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: ztunnel
  podMetricsEndpoints:
  - port: http-monitoring
    path: /metrics
    interval: 15s
```

For standard Prometheus, add this scrape config:

```yaml
scrape_configs:
- job_name: 'ztunnel'
  kubernetes_sd_configs:
  - role: pod
    namespaces:
      names:
      - istio-system
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_label_app]
    action: keep
    regex: ztunnel
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
    action: replace
    target_label: __address__
    regex: (.+)
    replacement: ${1}:15020
```

## Checking ztunnel Logs

ztunnel logs are your first stop when debugging issues. By default, ztunnel logs at the info level:

```bash
kubectl logs -n istio-system -l app=ztunnel --tail=100
```

To get logs from a specific node's ztunnel:

```bash
# Find which ztunnel runs on a specific node
NODE_NAME="your-node-name"
ZTUNNEL_POD=$(kubectl get pods -n istio-system -l app=ztunnel --field-selector spec.nodeName=$NODE_NAME -o jsonpath='{.items[0].metadata.name}')
kubectl logs -n istio-system $ZTUNNEL_POD --tail=200
```

You can change the log level dynamically without restarting:

```bash
istioctl ztunnel-config log $ZTUNNEL_POD --level debug
```

Watch for these log patterns that indicate problems:
- `connection refused` - Target service is down or not in the mesh
- `certificate expired` - mTLS certificate rotation failed
- `policy denied` - Authorization policy blocking traffic
- `upstream connect error` - Network connectivity issues between nodes

## Resource Monitoring

ztunnel handles all ambient mesh traffic on a node, so its resource usage matters. Monitor CPU and memory:

```bash
kubectl top pods -n istio-system -l app=ztunnel
```

Check the current resource limits:

```bash
kubectl get daemonset ztunnel -n istio-system -o jsonpath='{.spec.template.spec.containers[0].resources}' | python3 -m json.tool
```

If ztunnel is getting OOMKilled, you'll need to bump the memory limits. Edit the Istio installation values:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    ztunnel:
      resources:
        requests:
          cpu: 200m
          memory: 256Mi
        limits:
          cpu: "1"
          memory: 1Gi
```

## Grafana Dashboards

If you're using Grafana (and you should be), set up dashboards for ztunnel monitoring. Here's a useful dashboard panel query for tracking connection rates per node:

```text
sum(rate(istio_tcp_connections_opened_total{app="ztunnel"}[5m])) by (instance)
```

For byte throughput:

```text
sum(rate(istio_tcp_sent_bytes_total{app="ztunnel"}[5m])) by (instance)
```

For tracking connection errors:

```text
sum(rate(istio_tcp_connections_closed_total{app="ztunnel", response_flags!=""}[5m])) by (response_flags)
```

## Health Check Endpoints

ztunnel exposes health endpoints that you can use for liveness and readiness probes (these are already configured in the DaemonSet, but useful for manual checks):

```bash
# Port-forward to a ztunnel pod
kubectl port-forward -n istio-system $ZTUNNEL_POD 15021:15021 &

# Check readiness
curl localhost:15021/healthz/ready

# Check the config dump
curl localhost:15020/config_dump
```

The config dump is particularly useful. It shows you what workloads ztunnel knows about, what certificates it has, and what policies are loaded.

## Using istioctl for Diagnostics

The `istioctl` CLI has built-in commands for ztunnel diagnostics:

```bash
# List all ztunnel workloads
istioctl ztunnel-config workloads

# Check certificates
istioctl ztunnel-config certificates

# View authorization policies loaded in ztunnel
istioctl ztunnel-config authorization
```

These commands talk directly to the ztunnel's admin interface and give you a real-time view of what it knows.

## Setting Up Alerts

You should have alerts for these critical scenarios:

**ztunnel pod not running on a node:**

```yaml
groups:
- name: ztunnel-alerts
  rules:
  - alert: ZtunnelPodMissing
    expr: |
      count(kube_node_info) - count(kube_pod_info{namespace="istio-system", pod=~"ztunnel-.*"}) > 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "ztunnel pod missing on one or more nodes"
```

**High restart count:**

```yaml
  - alert: ZtunnelHighRestarts
    expr: |
      increase(kube_pod_container_status_restarts_total{namespace="istio-system", container="ztunnel"}[1h]) > 3
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "ztunnel restarting frequently"
```

**High memory usage:**

```yaml
  - alert: ZtunnelHighMemory
    expr: |
      container_memory_working_set_bytes{namespace="istio-system", container="ztunnel"} / container_spec_memory_limit_bytes{namespace="istio-system", container="ztunnel"} > 0.85
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "ztunnel memory usage above 85%"
```

## Wrapping Up

Monitoring ztunnel is about watching three things: is it running everywhere it should be, is it healthy in terms of resources, and is it handling traffic properly. Set up Prometheus scraping, build Grafana dashboards for the key TCP metrics, configure alerts for pod failures and resource pressure, and use `istioctl ztunnel-config` for on-demand diagnostics. Since ztunnel is a per-node component, a single failure has a wider blast radius than a sidecar, so keep a close eye on it in production.
