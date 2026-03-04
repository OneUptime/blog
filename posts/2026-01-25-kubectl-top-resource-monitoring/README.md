# How to Use kubectl top for Resource Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Monitoring, Resources, CPU, Memory, DevOps

Description: Learn how to use kubectl top to monitor CPU and memory usage in Kubernetes. This guide covers pod and node metrics, sorting and filtering, and integrating with scripts for resource management.

---

The `kubectl top` command shows real-time CPU and memory usage for pods and nodes. It is the quickest way to spot resource hogs, verify your resource requests, and troubleshoot performance issues without setting up a full monitoring stack.

## Prerequisites

kubectl top requires the Metrics Server to be installed:

```bash
# Check if metrics-server is running
kubectl get deployment metrics-server -n kube-system

# Install if missing
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Wait for it to be ready
kubectl wait --for=condition=Available deployment/metrics-server -n kube-system --timeout=120s
```

For local clusters like minikube:

```bash
minikube addons enable metrics-server
```

## Node Resource Usage

### View All Nodes

```bash
kubectl top nodes

# Output:
# NAME     CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
# node-1   850m         21%    3842Mi          50%
# node-2   1250m        31%    5120Mi          67%
# node-3   450m         11%    2048Mi          27%
```

CPU is shown in millicores (1000m = 1 CPU core). Memory is shown in mebibytes (Mi) or gibibytes (Gi).

### Sort by Resource Usage

```bash
# Sort by CPU usage
kubectl top nodes --sort-by=cpu

# Sort by memory usage
kubectl top nodes --sort-by=memory
```

### Specific Node

```bash
kubectl top node node-1
```

## Pod Resource Usage

### All Pods in Current Namespace

```bash
kubectl top pods

# Output:
# NAME                    CPU(cores)   MEMORY(bytes)
# api-server-abc123       125m         256Mi
# worker-def456           450m         512Mi
# database-ghi789         85m          1024Mi
```

### All Pods Across All Namespaces

```bash
kubectl top pods -A

# Or
kubectl top pods --all-namespaces
```

### Pods in Specific Namespace

```bash
kubectl top pods -n production
kubectl top pods -n kube-system
```

### Sort Pods by Resource

```bash
# Sort by CPU (highest first)
kubectl top pods --sort-by=cpu

# Sort by memory
kubectl top pods --sort-by=memory
```

### Filter by Label

```bash
# Pods with specific label
kubectl top pods -l app=api-server -n production

# Multiple labels
kubectl top pods -l app=api-server,tier=backend -n production
```

## Container-Level Metrics

### Show Metrics per Container

```bash
kubectl top pods --containers

# Output:
# POD                     NAME        CPU(cores)   MEMORY(bytes)
# api-server-abc123       api         100m         200Mi
# api-server-abc123       sidecar     25m          56Mi
# worker-def456           worker      450m         512Mi
```

### Specific Pod Containers

```bash
kubectl top pod api-server-abc123 --containers -n production
```

## Practical Examples

### Find Top Resource Consumers

```bash
# Top 10 CPU-consuming pods cluster-wide
kubectl top pods -A --sort-by=cpu | head -11

# Top 10 memory-consuming pods
kubectl top pods -A --sort-by=memory | head -11
```

### Compare Usage to Requests

```bash
#!/bin/bash
# compare-resources.sh

NAMESPACE=${1:-default}

echo "Pod Resource Usage vs Requests in $NAMESPACE"
echo "=============================================="

kubectl top pods -n $NAMESPACE --no-headers | while read pod cpu mem; do
    # Get requests
    cpu_req=$(kubectl get pod $pod -n $NAMESPACE -o jsonpath='{.spec.containers[0].resources.requests.cpu}' 2>/dev/null)
    mem_req=$(kubectl get pod $pod -n $NAMESPACE -o jsonpath='{.spec.containers[0].resources.requests.memory}' 2>/dev/null)

    printf "%-40s CPU: %8s / %8s  MEM: %8s / %8s\n" "$pod" "$cpu" "${cpu_req:-N/A}" "$mem" "${mem_req:-N/A}"
done
```

### Monitor Specific Pod Over Time

```bash
#!/bin/bash
# monitor-pod.sh

POD=$1
NAMESPACE=${2:-default}
INTERVAL=${3:-5}

echo "Monitoring $POD every ${INTERVAL}s (Ctrl+C to stop)"
echo "Timestamp,CPU,Memory"

while true; do
    metrics=$(kubectl top pod $POD -n $NAMESPACE --no-headers 2>/dev/null)
    if [ -n "$metrics" ]; then
        echo "$(date +%H:%M:%S),$(echo $metrics | awk '{print $2","$3}')"
    fi
    sleep $INTERVAL
done
```

Usage:

```bash
./monitor-pod.sh api-server-abc123 production 10
```

### Find Over-Provisioned Pods

```bash
#!/bin/bash
# find-overprovisioned.sh

echo "Pods using less than 50% of requested CPU:"
echo "==========================================="

kubectl top pods -A --no-headers | while read ns pod cpu mem; do
    # Convert cpu to millicores
    cpu_used=$(echo $cpu | sed 's/m//')

    # Get CPU request
    cpu_req=$(kubectl get pod $pod -n $ns -o jsonpath='{.spec.containers[0].resources.requests.cpu}' 2>/dev/null)

    if [ -n "$cpu_req" ]; then
        # Convert request to millicores
        if [[ $cpu_req == *m ]]; then
            cpu_req_m=$(echo $cpu_req | sed 's/m//')
        else
            cpu_req_m=$((cpu_req * 1000))
        fi

        # Calculate percentage
        if [ $cpu_req_m -gt 0 ]; then
            usage_pct=$((cpu_used * 100 / cpu_req_m))
            if [ $usage_pct -lt 50 ]; then
                printf "%-40s %-40s %4d%% (%sm / %s)\n" "$ns" "$pod" "$usage_pct" "$cpu_used" "$cpu_req"
            fi
        fi
    fi
done
```

## Watch Mode

### Continuous Monitoring

```bash
# Watch node metrics (refreshes every 2 seconds)
watch kubectl top nodes

# Watch pod metrics
watch kubectl top pods -n production

# Custom interval
watch -n 5 kubectl top pods -A --sort-by=cpu
```

### Combined with Other Commands

```bash
# Watch pods and their metrics side by side
watch -n 5 'kubectl top pods -n production && echo "---" && kubectl get pods -n production'
```

## Troubleshooting kubectl top

### Metrics Not Available

```bash
# Error: Metrics not available for pod
kubectl top pods
# error: Metrics API not available

# Check metrics-server
kubectl get apiservices | grep metrics
# v1beta1.metrics.k8s.io   kube-system/metrics-server   True

kubectl get pods -n kube-system -l k8s-app=metrics-server
```

### Metrics Server Issues

```bash
# Check metrics-server logs
kubectl logs -n kube-system -l k8s-app=metrics-server

# Common issues:
# - TLS certificate errors (add --kubelet-insecure-tls)
# - Cannot reach kubelets (network policy issues)
```

Fix for self-signed certificates:

```yaml
# metrics-server deployment patch
spec:
  containers:
    - name: metrics-server
      args:
        - --kubelet-insecure-tls
        - --kubelet-preferred-address-types=InternalIP
```

### Partial Metrics

```bash
# Some pods show metrics, others do not
# Check if pods are running
kubectl get pods -n production

# Metrics take ~60 seconds after pod starts
# Wait and retry
```

## Integration with Prometheus

For historical data, export kubectl top data to Prometheus:

```bash
#!/bin/bash
# export-metrics.sh

# Run in a loop and write to node_exporter textfile directory
TEXTFILE_DIR="/var/lib/node_exporter/textfile_collector"

while true; do
    # Pod metrics
    kubectl top pods -A --no-headers | while read ns pod cpu mem; do
        cpu_val=$(echo $cpu | sed 's/m//')
        mem_val=$(echo $mem | sed 's/Mi//')
        echo "kubectl_top_pod_cpu_millicores{namespace=\"$ns\",pod=\"$pod\"} $cpu_val"
        echo "kubectl_top_pod_memory_mebibytes{namespace=\"$ns\",pod=\"$pod\"} $mem_val"
    done > $TEXTFILE_DIR/kubectl_top.prom.$$

    mv $TEXTFILE_DIR/kubectl_top.prom.$$ $TEXTFILE_DIR/kubectl_top.prom
    sleep 60
done
```

## Useful Aliases

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# Quick resource checks
alias ktopn='kubectl top nodes'
alias ktopp='kubectl top pods'
alias ktopa='kubectl top pods -A'
alias ktopc='kubectl top pods --containers'

# Sorted views
alias ktopcpu='kubectl top pods -A --sort-by=cpu'
alias ktopmem='kubectl top pods -A --sort-by=memory'

# Top consumers
alias ktop10cpu='kubectl top pods -A --sort-by=cpu | head -11'
alias ktop10mem='kubectl top pods -A --sort-by=memory | head -11'
```

## Output Formatting

### JSON Output (Not Directly Supported)

kubectl top does not support JSON output, but you can parse it:

```bash
# Convert to JSON-like format
kubectl top pods -n production --no-headers | \
  awk '{print "{\"pod\":\""$1"\",\"cpu\":\""$2"\",\"memory\":\""$3"\"}"}'
```

### CSV Output

```bash
# CSV format for spreadsheets
echo "namespace,pod,cpu,memory"
kubectl top pods -A --no-headers | awk '{print $1","$2","$3","$4}'
```

## Best Practices

1. **Install metrics-server** on every cluster
2. **Use watch** for real-time monitoring during incidents
3. **Combine with kubectl describe** for full picture
4. **Compare to requests** to find right-sizing opportunities
5. **Script common checks** for faster troubleshooting
6. **Use proper monitoring** (Prometheus) for historical data

```bash
# Quick health check script
#!/bin/bash
echo "=== Node Resources ==="
kubectl top nodes

echo -e "\n=== High CPU Pods (>500m) ==="
kubectl top pods -A --no-headers | awk '$3 ~ /[0-9]+m/ {gsub("m","",$3); if($3>500) print $0}'

echo -e "\n=== High Memory Pods (>1Gi) ==="
kubectl top pods -A --no-headers | awk '$4 ~ /[0-9]+Mi/ {gsub("Mi","",$4); if($4>1024) print $0}'
```

---

kubectl top is your first line of defense for resource troubleshooting. It shows what is happening right now without the overhead of a full monitoring stack. Use it to spot problems quickly, then dig deeper with Prometheus and Grafana for historical analysis.
