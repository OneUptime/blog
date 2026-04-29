# How to Monitor K3s Resource Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Monitoring, Observability, DevOps

Description: Learn how to monitor CPU, memory, and storage resource usage in your K3s cluster using built-in tools and popular monitoring stacks.

## Introduction

Understanding resource utilization in your K3s cluster is essential for capacity planning, cost optimization, and preventing resource exhaustion. K3s supports the full Kubernetes monitoring ecosystem. This guide covers monitoring resource usage with kubectl inspection commands, the Kubernetes Metrics Server, and the Prometheus/Grafana stack.

## Prerequisites

- A running K3s cluster with worker nodes
- `kubectl` configured and working
- Basic familiarity with Kubernetes concepts

## Method 1: Basic kubectl Commands

Before installing any additional tools, kubectl provides basic visibility:

```bash
# List nodes with their status

kubectl get nodes -o wide

# Describe a node to see resource capacity and allocated resources
kubectl describe node <node-name>

# Key sections in the output:
# - Capacity: total resources on the node
# - Allocatable: resources available for pods
# - Allocated resources: requests and limits currently scheduled on the node
```

## Method 2: Verify the Metrics Server

K3s includes the Kubernetes Metrics Server as a packaged component by default, which enables `kubectl top` commands. If it was disabled with `--disable=metrics-server`, remove that flag from your K3s server configuration and restart K3s.

```bash
# Check that the packaged Metrics Server is present
kubectl get deployment metrics-server -n kube-system

# Wait for Metrics Server to be ready
kubectl rollout status deployment/metrics-server -n kube-system

# Verify it's working
kubectl top nodes
```

### Using kubectl top

```bash
# View CPU and memory usage per node
kubectl top nodes

# Example output:
# NAME         CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
# k3s-server   125m         3%     1024Mi          53%
# worker-01    245m         6%     2048Mi          51%

# View CPU and memory usage per pod (all namespaces)
kubectl top pods -A

# View pods sorted by CPU usage
kubectl top pods -A --sort-by=cpu

# View pods sorted by memory usage
kubectl top pods -A --sort-by=memory

# View pods in a specific namespace
kubectl top pods -n production

# Show containers within pods
kubectl top pods -A --containers
```

## Method 3: Resource Requests and Limits Visibility

Understanding what pods are requesting vs what they're using:

```bash
# Check resource requests and limits for all pods
kubectl get pods -A -o custom-columns=\
'NAMESPACE:.metadata.namespace,NAME:.metadata.name,\
CPU_REQ:.spec.containers[*].resources.requests.cpu,\
MEM_REQ:.spec.containers[*].resources.requests.memory,\
CPU_LIM:.spec.containers[*].resources.limits.cpu,\
MEM_LIM:.spec.containers[*].resources.limits.memory'

# Check for pods without resource limits (risky)
kubectl get pods -A -o json | \
  jq '.items[] | select(.spec.containers[].resources.limits == null) |
  .metadata.name + " in " + .metadata.namespace'
```

## Method 4: Deploy Prometheus and Grafana

For comprehensive monitoring, deploy the kube-prometheus-stack:

```bash
# Add Helm repository
helm repo add prometheus-community \
  https://prometheus-community.github.io/helm-charts
helm repo update

# Create monitoring namespace
kubectl create namespace monitoring

# Install kube-prometheus-stack
helm install kube-prometheus-stack \
  prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set grafana.adminPassword=admin123 \
  --set prometheus.prometheusSpec.retention=7d
```

### Access Grafana Dashboard

```bash
# Port-forward to access Grafana
kubectl port-forward -n monitoring \
  service/kube-prometheus-stack-grafana 3000:80

# Access at http://localhost:3000
# Default credentials: admin / admin123
```

### Useful Grafana Dashboards

Import these community dashboards for K3s:
- **ID 315**: Kubernetes cluster monitoring (via Prometheus)
- **ID 7249**: Kubernetes Cluster
- **ID 1860**: Node Exporter Full

## Method 5: Deploy Lightweight State Metrics with Kube State Metrics

For Kubernetes object-state metrics such as node capacity and pod requests/limits without the full Prometheus stack:

```bash
# Install kube-state-metrics
helm repo add prometheus-community \
  https://prometheus-community.github.io/helm-charts

helm install kube-state-metrics \
  prometheus-community/kube-state-metrics \
  --namespace kube-system

# Query state metrics
kubectl port-forward -n kube-system \
  service/kube-state-metrics 8080:8080

curl http://localhost:8080/metrics | grep kube_node_status_capacity
```

## Method 6: Node-Level Monitoring with System Tools

For lower-level resource monitoring on the node itself:

```bash
# Install htop for interactive process monitoring
apt-get install htop -y

# Check overall system resources
free -h          # Memory usage
df -h            # Disk usage
iostat -x 1      # I/O statistics
vmstat 1         # CPU/memory/IO statistics

# Watch K3s process resource usage
watch -n 2 'ps aux --sort=-%cpu | head -20'

# Watch K3s cgroups (includes embedded containerd)
systemd-cgtop

# Check K3s service logs on server nodes
systemctl status k3s
journalctl -u k3s --since "1 hour ago"

# Check K3s agent logs on agent-only nodes
systemctl status k3s-agent
journalctl -u k3s-agent --since "1 hour ago"

# Check K3s disk usage and embedded containerd logs
tail -f /var/lib/rancher/k3s/agent/containerd/containerd.log
du -sh /var/lib/rancher/k3s/
du -sh /var/lib/rancher/k3s/agent/containerd/
```

## Setting Up Alerts with Prometheus

Create alerting rules for resource thresholds:

```yaml
# k3s-resource-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: k3s-resource-alerts
  namespace: monitoring
  labels:
    # Set this to your Helm release name if you used a different one
    release: kube-prometheus-stack
spec:
  groups:
    - name: k3s-resources
      rules:
        # Alert if node CPU usage > 80% for 5 minutes
        - alert: NodeHighCPU
          expr: |
            100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High CPU usage on {{ $labels.instance }}"
            description: "CPU usage is {{ $value }}%"

        # Alert if node memory > 85%
        - alert: NodeHighMemory
          expr: |
            100 - ((node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100) > 85
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High memory usage on {{ $labels.instance }}"
            description: "Memory usage is {{ $value }}%"
```

Apply the alert rules:

```bash
kubectl apply -f k3s-resource-alerts.yaml
```

## Conclusion

Monitoring K3s resource usage ranges from simple `kubectl top` commands to full Prometheus/Grafana stacks depending on your needs. Start with `kubectl top` and K3s's packaged Metrics Server for basic visibility, then invest in Prometheus/Grafana for production monitoring with alerting. Always set resource requests and limits on your workloads - this not only prevents resource starvation but also improves the accuracy of resource metrics and scheduling decisions.
