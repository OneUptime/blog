# Monitoring a Master Node for Cilium Installation Using K3s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, K3s, Monitoring

Description: Set up monitoring for the K3s master node running Cilium, tracking control plane health, Cilium agent metrics, and resource utilization.

---

## Introduction

The master node in a K3s cluster running Cilium serves double duty: it hosts the Kubernetes control plane and runs the Cilium agent that manages networking for all pods, including control plane components. Monitoring this node is critical because a master node failure affects both cluster management and pod networking.

Effective monitoring of the K3s master node requires tracking three layers: the K3s server process health, the Cilium agent status, and the underlying system resources. Issues at any layer can cascade into cluster-wide networking failures.

This guide covers setting up comprehensive monitoring for the K3s master node in a Cilium-based deployment.

## Prerequisites

- A K3s cluster with Cilium installed on the master node
- Prometheus and Grafana for monitoring
- `kubectl` with cluster-admin access
- Node-level access for system metrics collection

## Monitoring K3s Server Health

Track the K3s server process and its API availability:

```yaml
# k3s-server-monitor.yaml
# ServiceMonitor for K3s API server metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: k3s-apiserver
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  endpoints:
    - port: https
      scheme: https
      tlsConfig:
        insecureSkipVerify: true
      bearerTokenFile: /var/run/secrets/kubernetes.io/serviceaccount/token
      interval: 15s
  namespaceSelector:
    matchNames:
      - default
  selector:
    matchLabels:
      component: apiserver
```

Set up alerts for K3s master health:

```yaml
# k3s-master-alerts.yaml
# Alerts for K3s master node health
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: k3s-master-alerts
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  groups:
    - name: k3s.master
      rules:
        - alert: K3sMasterNodeNotReady
          expr: |
            kube_node_status_condition{condition="Ready",status="true",node=~".*master.*"} == 0
          for: 3m
          labels:
            severity: critical
          annotations:
            summary: "K3s master node not Ready"
            description: "The master node {{ $labels.node }} has been in a NotReady state for 3 minutes."
        - alert: K3sAPIServerHighLatency
          expr: |
            histogram_quantile(0.99, rate(apiserver_request_duration_seconds_bucket[5m])) > 2
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "K3s API server high latency"
            description: "P99 API server latency is {{ $value }}s, which may affect Cilium policy updates."
```

## Monitoring Cilium Agent on the Master Node

Track Cilium-specific metrics on the master:

```bash
# Check Cilium agent health on the master node
MASTER_NODE=$(kubectl get nodes -l node-role.kubernetes.io/master -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || kubectl get nodes -o jsonpath='{.items[0].metadata.name}')
CILIUM_POD=$(kubectl get pod -n kube-system -l k8s-app=cilium \
  --field-selector spec.nodeName=$MASTER_NODE -o jsonpath='{.items[0].metadata.name}')

# Get Cilium agent metrics
kubectl exec -n kube-system $CILIUM_POD -- cilium metrics list | head -20

# Check endpoint status on the master node
kubectl exec -n kube-system $CILIUM_POD -- cilium endpoint list

# Monitor BPF map usage
kubectl exec -n kube-system $CILIUM_POD -- cilium bpf ct list global | wc -l
```

Key PromQL queries for the master node:

```bash
# Cilium agent CPU usage on master node
rate(container_cpu_usage_seconds_total{namespace="kube-system",pod=~"cilium-.*",node=~".*master.*"}[5m])

# Cilium agent memory usage on master node
container_memory_working_set_bytes{namespace="kube-system",pod=~"cilium-.*",node=~".*master.*"}

# BPF map operations rate
rate(cilium_bpf_map_ops_total{instance=~".*master.*"}[5m])

# Policy import events
rate(cilium_policy_import_errors_total{instance=~".*master.*"}[5m])
```

## Monitoring System Resources on the Master Node

Deploy a node exporter to track system-level metrics:

```yaml
# node-exporter-master-alerts.yaml
# Resource alerts specific to the master node running Cilium
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: master-resource-alerts
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  groups:
    - name: master.resources
      rules:
        - alert: MasterNodeHighCPU
          expr: |
            100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle",instance=~".*master.*"}[5m])) * 100) > 85
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Master node CPU usage above 85%"
            description: "High CPU on master affects both K3s control plane and Cilium agent."
        - alert: MasterNodeHighMemory
          expr: |
            (1 - node_memory_MemAvailable_bytes{instance=~".*master.*"} / node_memory_MemTotal_bytes{instance=~".*master.*"}) * 100 > 90
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Master node memory usage above 90%"
            description: "Low memory on master can cause OOM kills of K3s or Cilium components."
```

```bash
kubectl apply -f k3s-master-alerts.yaml
kubectl apply -f node-exporter-master-alerts.yaml
```

## Building a Master Node Dashboard

Create a Grafana dashboard focused on the master node:

```bash
# Key Grafana panels for the master node dashboard:

# Row 1: K3s Control Plane
# - API Server Request Rate: rate(apiserver_request_total[5m])
# - API Server Error Rate: rate(apiserver_request_total{code=~"5.."}[5m])
# - etcd Latency: histogram_quantile(0.99, rate(etcd_request_duration_seconds_bucket[5m]))

# Row 2: Cilium Agent
# - Agent Uptime: cilium_agent_uptime_seconds
# - Endpoint Count: cilium_endpoint_state
# - Drop Rate: rate(cilium_drop_count_total[5m])

# Row 3: System Resources
# - CPU Usage: 100 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100
# - Memory Usage: (1 - node_memory_MemAvailable_bytes/node_memory_MemTotal_bytes) * 100
# - Disk I/O: rate(node_disk_io_time_seconds_total[5m])
```

## Verification

Confirm monitoring is collecting data from the master node:

```bash
# Verify Prometheus targets
curl -s http://localhost:9090/api/v1/targets | python3 -c "
import sys, json
targets = json.load(sys.stdin)['data']['activeTargets']
for t in targets:
    job = t.get('labels', {}).get('job', '')
    if 'cilium' in job or 'apiserver' in job or 'node' in job:
        print(f'{job}: {t[\"health\"]}')
" 2>/dev/null || echo "Port-forward Prometheus first"

# Verify alerts are loaded
kubectl get prometheusrules -n monitoring | grep -E "master|cilium|k3s"

# Test alerting by checking current alert state
curl -s http://localhost:9090/api/v1/alerts | python3 -c "
import sys, json
alerts = json.load(sys.stdin)['data']['alerts']
for a in alerts:
    if 'master' in a['labels'].get('alertname','').lower() or 'cilium' in a['labels'].get('alertname','').lower():
        print(f'{a[\"labels\"][\"alertname\"]}: {a[\"state\"]}')
" 2>/dev/null
```

## Troubleshooting

- **No metrics from the master node**: Ensure node-exporter is running on the master. If using DaemonSet deployment, check tolerations allow scheduling on master nodes.
- **API server metrics not available**: K3s embeds the API server differently than standard Kubernetes. Metrics may be available at `https://localhost:6443/metrics` with proper authentication.
- **Cilium metrics show on worker but not master**: Verify the Cilium agent pod is running on the master node with `kubectl get pods -n kube-system -l k8s-app=cilium --field-selector spec.nodeName=MASTER_NAME`.
- **Alert noise from resource usage during updates**: Set appropriate `for` durations on alerts to avoid false positives during K3s or Cilium upgrades.

## Conclusion

Monitoring the K3s master node running Cilium requires tracking three layers: K3s server health and API latency, Cilium agent metrics and endpoint status, and system resource utilization. Because the master node handles both control plane operations and CNI networking, resource contention between these components is a key risk to monitor. Set up alerts for all three layers to detect issues before they cascade into cluster-wide failures.
