# How to Use Cluster Capacity Planning Tools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Capacity Planning, Resource Management

Description: Learn how to use cluster capacity planning tools to forecast resource needs, simulate workload placement, and make informed scaling decisions in Kubernetes environments.

---

Running out of cluster capacity at 3 AM is a nightmare scenario. Capacity planning tools help you forecast resource needs before you hit limits, simulate workload changes, and make data-driven scaling decisions. The right tools transform capacity management from reactive firefighting into proactive planning.

Kubernetes provides several tools for capacity analysis, from simple CLI utilities to sophisticated simulation frameworks. Understanding which tool to use for each scenario determines whether you can accurately predict capacity needs.

## Using kubectl top for Real-Time Capacity

The simplest capacity tool is built into kubectl. The top command shows current resource usage across nodes and pods:

```bash
# View node capacity and usage
kubectl top nodes

# Output shows:
# NAME          CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
# node-1        2450m        61%    7256Mi          45%
# node-2        1890m        47%    5432Mi          34%
# node-3        3100m        77%    9876Mi          61%

# View pod resource consumption
kubectl top pods --all-namespaces --sort-by=memory

# View pods consuming most CPU
kubectl top pods --all-namespaces --sort-by=cpu | head -20
```

Calculate cluster-wide utilization:

```bash
# Total allocated vs available resources
kubectl describe nodes | grep -A 5 "Allocated resources" | \
  awk '/cpu/ {cpu+=$2} /memory/ {mem+=$2} END {print "Total CPU:", cpu; print "Total Memory:", mem}'
```

This gives you snapshot capacity data but doesn't help with forecasting or what-if scenarios.

## Cluster Capacity Tool for Simulation

The cluster-capacity tool simulates pod scheduling without actually deploying pods. This answers "can my cluster handle X more pods?" questions:

```bash
# Install cluster-capacity
git clone https://github.com/kubernetes-sigs/cluster-capacity
cd cluster-capacity
make build

# Create a pod spec representing your workload
cat > example-pod.yaml <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        cpu: "500m"
        memory: "512Mi"
EOF

# Run capacity simulation
./cluster-capacity --kubeconfig ~/.kube/config --podspec example-pod.yaml

# Output shows how many instances of this pod can schedule
# and which nodes would host them
```

The tool simulates the scheduler algorithm, accounting for:
- Resource requests and limits
- Node affinity and anti-affinity
- Taints and tolerations
- Pod topology spread constraints
- Resource quotas

This reveals your cluster's true capacity for specific workload profiles.

## Using Prometheus for Historical Analysis

Prometheus provides historical capacity data for trend analysis:

```yaml
# Record rules for capacity metrics
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-capacity-rules
  namespace: monitoring
data:
  capacity.rules: |
    groups:
    - name: capacity
      interval: 30s
      rules:
      # Cluster-wide CPU capacity
      - record: cluster:cpu_capacity:total
        expr: sum(kube_node_status_capacity{resource="cpu"})

      # Cluster-wide CPU requests
      - record: cluster:cpu_requests:total
        expr: sum(kube_pod_container_resource_requests{resource="cpu"})

      # CPU utilization percentage
      - record: cluster:cpu_utilization:percent
        expr: |
          (cluster:cpu_requests:total / cluster:cpu_capacity:total) * 100

      # Memory capacity
      - record: cluster:memory_capacity:total
        expr: sum(kube_node_status_capacity{resource="memory"})

      # Memory requests
      - record: cluster:memory_requests:total
        expr: sum(kube_pod_container_resource_requests{resource="memory"})

      # Memory utilization percentage
      - record: cluster:memory_utilization:percent
        expr: |
          (cluster:memory_requests:total / cluster:memory_capacity:total) * 100
```

Query these metrics to understand capacity trends:

```promql
# CPU utilization over last 30 days
cluster:cpu_utilization:percent[30d]

# Predict when capacity will be exhausted (linear regression)
predict_linear(cluster:cpu_utilization:percent[7d], 86400 * 30)

# Growth rate of resource requests
rate(cluster:cpu_requests:total[7d]) * 86400 * 7
```

## Building a Capacity Dashboard

Create a Grafana dashboard for capacity visibility:

```json
{
  "dashboard": {
    "title": "Cluster Capacity Planning",
    "panels": [
      {
        "title": "CPU Capacity vs Requests",
        "targets": [
          {
            "expr": "cluster:cpu_capacity:total",
            "legendFormat": "Total Capacity"
          },
          {
            "expr": "cluster:cpu_requests:total",
            "legendFormat": "Requested"
          },
          {
            "expr": "sum(rate(container_cpu_usage_seconds_total{container!=\"\"}[5m]))",
            "legendFormat": "Actual Usage"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Memory Capacity vs Requests",
        "targets": [
          {
            "expr": "cluster:memory_capacity:total",
            "legendFormat": "Total Capacity"
          },
          {
            "expr": "cluster:memory_requests:total",
            "legendFormat": "Requested"
          },
          {
            "expr": "sum(container_memory_working_set_bytes{container!=\"\"})",
            "legendFormat": "Actual Usage"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Days Until Capacity Exhaustion",
        "targets": [
          {
            "expr": "((100 - cluster:cpu_utilization:percent) / (rate(cluster:cpu_utilization:percent[7d]) * 86400)) / 86400",
            "legendFormat": "CPU"
          },
          {
            "expr": "((100 - cluster:memory_utilization:percent) / (rate(cluster:memory_utilization:percent[7d]) * 86400)) / 86400",
            "legendFormat": "Memory"
          }
        ],
        "type": "stat"
      }
    ]
  }
}
```

This dashboard shows current capacity, usage trends, and projects when you'll need to scale.

## Automated Capacity Reports

Generate weekly capacity reports with a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: capacity-report
  namespace: monitoring
spec:
  schedule: "0 9 * * 1"  # Monday at 9 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: capacity-reporter
          containers:
          - name: reporter
            image: capacity-reporter:latest
            env:
            - name: PROMETHEUS_URL
              value: "http://prometheus.monitoring.svc:9090"
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: slack-webhook
                  key: url
            command:
            - /bin/bash
            - -c
            - |
              #!/bin/bash

              # Query current capacity
              CPU_UTIL=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=cluster:cpu_utilization:percent" | \
                jq -r '.data.result[0].value[1]')
              MEM_UTIL=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=cluster:memory_utilization:percent" | \
                jq -r '.data.result[0].value[1]')

              # Calculate growth rates
              CPU_GROWTH=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=rate(cluster:cpu_utilization:percent[7d])" | \
                jq -r '.data.result[0].value[1]')
              MEM_GROWTH=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=rate(cluster:memory_utilization:percent[7d])" | \
                jq -r '.data.result[0].value[1]')

              # Send Slack notification
              curl -X POST $SLACK_WEBHOOK \
                -H 'Content-Type: application/json' \
                -d "{
                  \"text\": \"Weekly Capacity Report\",
                  \"blocks\": [
                    {
                      \"type\": \"section\",
                      \"text\": {
                        \"type\": \"mrkdwn\",
                        \"text\": \"*Cluster Capacity Status*\n\nCPU Utilization: ${CPU_UTIL}%\nMemory Utilization: ${MEM_UTIL}%\n\nWeekly Growth:\nCPU: ${CPU_GROWTH}%/day\nMemory: ${MEM_GROWTH}%/day\"
                      }
                    }
                  ]
                }"
          restartPolicy: OnFailure
```

## KRR (Kubernetes Resource Recommendations)

KRR analyzes actual resource usage and provides rightsizing recommendations:

```bash
# Install KRR
pip install krr

# Run analysis
krr simple --context production-cluster

# Output shows:
# | Namespace  | Workload     | Container | CPU Rec | Mem Rec | Current CPU | Current Mem |
# |------------|--------------|-----------|---------|---------|-------------|-------------|
# | default    | web-app      | nginx     | 200m    | 256Mi   | 1000m       | 2Gi         |
# | api        | backend      | app       | 800m    | 1Gi     | 2000m       | 4Gi         |

# Export recommendations
krr simple --format json > capacity-recommendations.json

# Apply recommendations automatically (use with caution)
krr simple --strategy prometheus --prometheus-url http://prometheus:9090
```

KRR uses Prometheus metrics to calculate P95 usage and recommends appropriate resource requests.

## Goldilocks for VPA Recommendations

Goldilocks creates VPA objects in recommendation mode for all workloads:

```bash
# Install Goldilocks
helm repo add fairwinds-stable https://charts.fairwinds.com/stable
helm install goldilocks fairwinds-stable/goldilocks \
  --namespace goldilocks \
  --create-namespace

# Enable for a namespace
kubectl label namespace production goldilocks.fairwinds.com/enabled=true

# Access dashboard
kubectl port-forward -n goldilocks svc/goldilocks-dashboard 8080:80
```

Goldilocks provides a web UI showing VPA recommendations for all workloads, helping identify overprovisioned resources.

## Kube-capacity for Node-Level Analysis

Kube-capacity provides detailed node-level resource breakdown:

```bash
# Install kube-capacity
brew install kube-capacity  # macOS
# or download from https://github.com/robscott/kube-capacity

# Show capacity by node
kube-capacity

# Output shows requests and limits per node
# NODE       NAMESPACE  POD         CPU REQUESTS  CPU LIMITS  MEM REQUESTS  MEM LIMITS
# node-1     default    web-1       500m (12%)    1000m (25%) 512Mi (6%)    1Gi (12%)
# node-1     default    web-2       500m (12%)    1000m (25%) 512Mi (6%)    1Gi (12%)

# Show available capacity
kube-capacity --available

# Pod-level breakdown
kube-capacity --pod-count --util
```

This quickly identifies which nodes are at capacity and which have room for additional workloads.

## Building Custom Capacity Alerts

Set up proactive alerts before capacity issues occur:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: capacity-alerts
  namespace: monitoring
spec:
  groups:
  - name: capacity
    rules:
    - alert: ClusterCPUCapacityHigh
      expr: cluster:cpu_utilization:percent > 80
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Cluster CPU capacity at {{ $value }}%"
        description: "Consider adding nodes or optimizing workloads"

    - alert: ClusterCPUCapacityCritical
      expr: cluster:cpu_utilization:percent > 90
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Cluster CPU capacity at {{ $value }}%"
        description: "Immediate scaling required"

    - alert: CapacityExhaustionPredicted
      expr: |
        (predict_linear(cluster:cpu_utilization:percent[7d], 86400 * 14) > 95)
        or
        (predict_linear(cluster:memory_utilization:percent[7d], 86400 * 14) > 95)
      labels:
        severity: warning
      annotations:
        summary: "Cluster capacity will be exhausted in 14 days"
        description: "Plan scaling actions"
```

## Conclusion

Capacity planning tools transform cluster management from reactive to proactive. By combining simulation tools like cluster-capacity for what-if analysis, Prometheus for trend analysis and forecasting, and automated tools like KRR and Goldilocks for rightsizing recommendations, you gain complete visibility into current capacity and future needs. Regular capacity reviews using these tools prevent surprise outages and enable informed scaling decisions based on actual data rather than guesswork.
