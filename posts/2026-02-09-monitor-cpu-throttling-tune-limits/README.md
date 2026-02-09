# How to Monitor Pod CPU Throttling and Tune CPU Limits Accordingly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CPU, Performance

Description: Learn how to detect CPU throttling in Kubernetes pods, understand its impact on application performance, and properly tune CPU limits to eliminate throttling while maintaining resource efficiency.

---

CPU throttling is a common performance issue in Kubernetes that often goes unnoticed. When containers reach their CPU limits, the kernel throttles their CPU time, causing increased latency and degraded performance even when the node has idle CPU capacity. Understanding how to detect and resolve CPU throttling is critical for maintaining application performance.

This guide covers how to monitor CPU throttling metrics, identify which pods are affected, and tune CPU limits to eliminate unnecessary throttling while maintaining fair resource allocation.

## Understanding CPU Throttling in Kubernetes

Kubernetes uses CPU limits to prevent containers from consuming excessive CPU time. When a container tries to use more CPU than its limit allows, the Linux kernel throttles it by temporarily pausing execution.

CPU throttling occurs even when:
- The node has idle CPU capacity
- No other containers are competing for CPU
- The workload could benefit from more CPU time

This happens because CPU limits create a hard ceiling, unlike memory limits which only trigger action when memory is scarce.

## How CPU Limits Work

Kubernetes translates CPU limits into CFS (Completely Fair Scheduler) parameters:

```
cpu.cfs_period_us = 100000 (100ms)
cpu.cfs_quota_us = (CPU limit) * 100000

Example: 2 CPU limit
cpu.cfs_quota_us = 2 * 100000 = 200000
```

If a container uses 200ms of CPU time within a 100ms period (possible with multiple cores), it gets throttled for the remainder of that period.

## Viewing CPU Throttling Metrics

Check throttling metrics directly from cgroup files:

```bash
# Find container ID
kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[0].containerID}'

# On the node, view throttling stats
CONTAINER_ID=<container-id>
CGROUP_PATH=$(crictl inspect $CONTAINER_ID | jq -r '.info.runtimeSpec.linux.cgroupsPath')

# For cgroups v1
cat /sys/fs/cgroup/cpu/$CGROUP_PATH/cpu.stat

# For cgroups v2
cat /sys/fs/cgroup/$CGROUP_PATH/cpu.stat

# Output shows:
# nr_periods: Number of enforcement periods
# nr_throttled: Number of times throttled
# throttled_time: Total time throttled (nanoseconds)
```

Calculate throttling percentage:

```bash
# Throttling rate = (nr_throttled / nr_periods) * 100
```

A throttling rate above 5% typically indicates performance impact.

## Monitoring Throttling with kubectl top

While `kubectl top` shows current CPU usage, it doesn't show throttling. You need to access node metrics:

```bash
# View current CPU usage
kubectl top pods

# View node-level metrics
kubectl top nodes

# For detailed metrics, query metrics-server API
kubectl get --raw /apis/metrics.k8s.io/v1beta1/pods | jq
```

## Setting Up Prometheus Monitoring

Deploy Prometheus with cAdvisor to monitor throttling:

```yaml
# prometheus-scrape-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'kubernetes-cadvisor'
      kubernetes_sd_configs:
      - role: node
      relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
      - target_label: __metrics_path__
        replacement: /metrics/cadvisor
      metric_relabel_configs:
      - source_labels: [__name__]
        regex: 'container_cpu_cfs_(throttled_seconds_total|periods_total|throttled_periods_total)'
        action: keep
```

Query throttling metrics in Prometheus:

```promql
# Throttling rate per container
rate(container_cpu_cfs_throttled_periods_total[5m]) /
rate(container_cpu_cfs_periods_total[5m]) * 100

# Time spent throttled per container
rate(container_cpu_cfs_throttled_seconds_total[5m])

# Find containers with throttling > 5%
(
  rate(container_cpu_cfs_throttled_periods_total[5m]) /
  rate(container_cpu_cfs_periods_total[5m])
) > 0.05
```

## Creating Throttling Alerts

Set up alerts for excessive CPU throttling:

```yaml
# prometheus-alerts.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  alerts.yml: |
    groups:
    - name: cpu_throttling
      interval: 30s
      rules:
      - alert: HighCPUThrottling
        expr: |
          100 * sum by (namespace, pod, container) (
            rate(container_cpu_cfs_throttled_periods_total[5m])
          ) / sum by (namespace, pod, container) (
            rate(container_cpu_cfs_periods_total[5m])
          ) > 25
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU throttling detected"
          description: "Pod {{ $labels.namespace }}/{{ $labels.pod }} container {{ $labels.container }} is throttled {{ $value | printf \"%.2f\" }}% of the time"

      - alert: CriticalCPUThrottling
        expr: |
          100 * sum by (namespace, pod, container) (
            rate(container_cpu_cfs_throttled_periods_total[5m])
          ) / sum by (namespace, pod, container) (
            rate(container_cpu_cfs_periods_total[5m])
          ) > 50
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Critical CPU throttling detected"
          description: "Pod {{ $labels.namespace }}/{{ $labels.pod }} container {{ $labels.container }} is severely throttled {{ $value | printf \"%.2f\" }}%"
```

## Building a Throttling Dashboard

Create a Grafana dashboard to visualize throttling:

```json
{
  "dashboard": {
    "title": "CPU Throttling Overview",
    "panels": [
      {
        "title": "Throttling Rate by Pod",
        "targets": [
          {
            "expr": "100 * sum by (namespace, pod) (rate(container_cpu_cfs_throttled_periods_total[5m])) / sum by (namespace, pod) (rate(container_cpu_cfs_periods_total[5m]))"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Top 10 Throttled Pods",
        "targets": [
          {
            "expr": "topk(10, sum by (namespace, pod) (rate(container_cpu_cfs_throttled_seconds_total[5m])))"
          }
        ],
        "type": "graph"
      },
      {
        "title": "CPU Usage vs Limit",
        "targets": [
          {
            "expr": "sum by (namespace, pod) (rate(container_cpu_usage_seconds_total[5m]))",
            "legendFormat": "Usage - {{namespace}}/{{pod}}"
          },
          {
            "expr": "sum by (namespace, pod) (container_spec_cpu_quota / container_spec_cpu_period)",
            "legendFormat": "Limit - {{namespace}}/{{pod}}"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

## Analyzing CPU Usage Patterns

Before adjusting limits, analyze actual CPU usage patterns:

```bash
# Create a script to collect CPU metrics over time
cat > analyze-cpu.sh << 'EOF'
#!/bin/bash
NAMESPACE=$1
POD=$2
DURATION=${3:-3600}  # Default 1 hour

echo "Monitoring CPU usage for $NAMESPACE/$POD for ${DURATION}s"
echo "Timestamp,CPU_Usage_Cores" > cpu-data.csv

END=$(($(date +%s) + DURATION))
while [ $(date +%s) -lt $END ]; do
    USAGE=$(kubectl top pod -n $NAMESPACE $POD --no-headers | awk '{print $2}' | sed 's/m$//')
    TIMESTAMP=$(date +%s)
    echo "$TIMESTAMP,$USAGE" >> cpu-data.csv
    sleep 10
done

# Calculate statistics
awk -F',' 'NR>1 {sum+=$2; if($2>max) max=$2; if(NR==2 || $2<min) min=$2} END {print "Avg:", sum/(NR-1), "Min:", min, "Max:", max}' cpu-data.csv
EOF

chmod +x analyze-cpu.sh
./analyze-cpu.sh default my-app 3600
```

## Tuning CPU Limits

Based on throttling data, adjust CPU limits following these strategies:

### Strategy 1: Remove Limits for Non-Critical Workloads

If throttling occurs but CPU isn't scarce, remove limits:

```yaml
# Before: Throttled due to limit
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
      - name: app
        resources:
          requests:
            cpu: "500m"
          limits:
            cpu: "1000m"  # Remove this

# After: No limit, no throttling
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
      - name: app
        resources:
          requests:
            cpu: "500m"
          # No limit specified
```

### Strategy 2: Increase Limits Based on P99 Usage

Set limits based on 99th percentile CPU usage:

```promql
# Query P99 CPU usage over last 7 days
quantile_over_time(0.99,
  sum by (namespace, pod) (
    rate(container_cpu_usage_seconds_total[5m])
  )[7d:5m]
)
```

Set limit = P99 usage * 1.5 (50% headroom):

```yaml
# P99 usage: 1.2 cores
# Limit: 1.2 * 1.5 = 1.8 cores
resources:
  requests:
    cpu: "500m"
  limits:
    cpu: "1800m"
```

### Strategy 3: Use Burst Limits for Periodic Workloads

For workloads with periodic spikes:

```yaml
# Background job with occasional bursts
apiVersion: batch/v1
kind: CronJob
metadata:
  name: report-generator
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: generator
            image: report-app:latest
            resources:
              requests:
                cpu: "500m"
              limits:
                cpu: "4000m"  # Allow bursts up to 4 cores
```

## Implementing Right-Sizing Automation

Use Vertical Pod Autoscaler (VPA) to automatically adjust CPU limits:

```yaml
# vpa-cpu-recommendation.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: web-app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: "100m"
      maxAllowed:
        cpu: "8000m"
      controlledResources: ["cpu"]
      # Only update limits, not requests
      mode: Auto
```

Check VPA recommendations:

```bash
kubectl describe vpa web-app-vpa

# Output shows recommended CPU values:
# Recommendation:
#   Container Recommendations:
#     Container Name:  app
#     Lower Bound:     500m
#     Target:          750m
#     Upper Bound:     1500m
```

## Testing Impact of Limit Changes

Before applying changes to production, test in staging:

```bash
# Deploy test version with modified limits
kubectl apply -f deployment-new-limits.yaml -n staging

# Run load test
kubectl run load-test --image=williamyeh/hey --rm -it --restart=Never -- \
  hey -z 300s -c 50 http://web-app.staging.svc.cluster.local

# Monitor throttling during test
watch 'kubectl top pods -n staging'

# Check Prometheus for throttling metrics
# (throttling should be < 5% for acceptable performance)
```

## Creating a CPU Optimization Runbook

Document your approach to CPU optimization:

```yaml
# cpu-optimization-runbook.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cpu-optimization-runbook
data:
  runbook.md: |
    # CPU Optimization Runbook

    ## Detection
    1. Check Prometheus alert for HighCPUThrottling
    2. Identify affected pods from alert labels
    3. Review Grafana CPU dashboard

    ## Analysis
    1. Check P99 CPU usage over 7 days
    2. Verify current CPU limit
    3. Calculate throttling percentage
    4. Review application logs for performance issues

    ## Remediation
    If throttling > 25% and P99 usage near limit:
    - Increase limit to P99 * 1.5
    - Monitor for 48 hours
    - Iterate if needed

    If throttling > 25% but P99 usage < 50% of limit:
    - Investigate CPU spikes
    - Consider if spikes are legitimate
    - Optimize application code if possible

    ## Prevention
    1. Set up VPA for automatic recommendations
    2. Review CPU limits quarterly
    3. Load test new services before production
```

CPU throttling can severely impact application performance even when nodes have spare capacity. Monitor throttling metrics using Prometheus, set alerts for excessive throttling, and tune CPU limits based on actual usage patterns rather than arbitrary values. Consider removing limits entirely for non-critical workloads, and use tools like VPA to automate right-sizing in dynamic environments.
