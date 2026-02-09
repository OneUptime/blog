# How to Monitor Upgrade Progress with Node Conditions and Pod Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Monitoring, Observability

Description: Learn how to monitor Kubernetes upgrade progress using node conditions, pod events, metrics, and automated alerting to track upgrade status and detect issues early during cluster maintenance.

---

Monitoring upgrade progress is essential for catching issues early and understanding upgrade health. Kubernetes provides rich telemetry through node conditions, pod events, metrics, and logs that reveal exactly what's happening during upgrades.## Understanding Node Conditions

Node conditions report the health status of each node. During upgrades, monitoring these conditions helps identify problems immediately.

```bash
#!/bin/bash
# monitor-node-conditions.sh

echo "Monitoring node conditions during upgrade..."

# Watch all node conditions
watch -n 5 'kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
STATUS:.status.conditions[?(@.type==\"Ready\")].status,\
DISK:.status.conditions[?(@.type==\"DiskPressure\")].status,\
MEMORY:.status.conditions[?(@.type==\"MemoryPressure\")].status,\
PID:.status.conditions[?(@.type==\"PIDPressure\")].status,\
NETWORK:.status.conditions[?(@.type==\"NetworkUnavailable\")].status'

# Get detailed condition information
kubectl get nodes -o json | jq -r '
  .items[] |
  {
    name: .metadata.name,
    conditions: [.status.conditions[] | {type: .type, status: .status, reason: .reason, message: .message}]
  }
'
```

Monitor specific node conditions that indicate problems:

```bash
#!/bin/bash
# check-problem-conditions.sh

# Check for nodes with issues
kubectl get nodes -o json | jq -r '
  .items[] |
  select(.status.conditions[] |
    select((.type == "Ready" and .status != "True") or
           (.type == "DiskPressure" and .status == "True") or
           (.type == "MemoryPressure" and .status == "True") or
           (.type == "PIDPressure" and .status == "True"))) |
  .metadata.name
'
```

## Tracking Pod Events

Pod events provide detailed information about what's happening during node drains and pod rescheduling.

```bash
#!/bin/bash
# monitor-pod-events.sh

echo "Monitoring pod events during upgrade..."

# Watch all pod events
kubectl get events --all-namespaces --watch \
  --field-selector type=Warning

# Monitor specific event reasons
kubectl get events -A --watch | grep -E "Evicted|Killing|Failed|Unhealthy"

# Get events for specific node
NODE_NAME="worker-1"
kubectl get events -A --field-selector involvedObject.kind=Node,involvedObject.name=$NODE_NAME

# Monitor pod deletion events
kubectl get events -A -o json | jq -r '
  .items[] |
  select(.reason == "Killing" or .reason == "Evicted") |
  "\(.lastTimestamp) \(.involvedObject.namespace)/\(.involvedObject.name): \(.message)"
'
```

Create a comprehensive event monitor:

```bash
#!/bin/bash
# comprehensive-event-monitor.sh

LOG_FILE="upgrade-events-$(date +%Y%m%d-%H%M%S).log"

while true; do
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')

  # Get recent events
  events=$(kubectl get events -A \
    --sort-by='.lastTimestamp' \
    --field-selector type=Warning \
    -o json | jq -r '
    .items[-10:] |
    .[] |
    "\(.involvedObject.namespace)/\(.involvedObject.name): \(.reason) - \(.message)"
  ')

  if [ ! -z "$events" ]; then
    echo "[$timestamp] Recent warnings:" | tee -a $LOG_FILE
    echo "$events" | tee -a $LOG_FILE
    echo "" | tee -a $LOG_FILE
  fi

  sleep 30
done
```

## Monitoring Node Upgrade Status

Track which nodes are upgraded and their current status.

```bash
#!/bin/bash
# track-node-upgrades.sh

TARGET_VERSION="v1.29.0"

echo "Tracking node upgrade progress to $TARGET_VERSION..."

while true; do
  clear
  echo "========================================  echo "Node Upgrade Status - $(date)"
  echo "========================================"

  # Count nodes by version
  echo "Nodes by version:"
  kubectl get nodes -o json | jq -r '
    .items |
    group_by(.status.nodeInfo.kubeletVersion) |
    .[] |
    "\(.[0].status.nodeInfo.kubeletVersion): \(length) nodes"
  '

  echo ""

  # List nodes with details
  kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
STATUS:.status.conditions[?(@.type==\"Ready\")].status,\
VERSION:.status.nodeInfo.kubeletVersion,\
OS:.status.nodeInfo.osImage

  # Calculate upgrade progress
  total_nodes=$(kubectl get nodes --no-headers | wc -l)
  upgraded_nodes=$(kubectl get nodes -o json | jq --arg version "$TARGET_VERSION" '[.items[] | select(.status.nodeInfo.kubeletVersion == $version)] | length')

  progress=$((upgraded_nodes * 100 / total_nodes))

  echo ""
  echo "Upgrade Progress: $upgraded_nodes/$total_nodes nodes ($progress%)"

  # Check if all nodes upgraded
  if [ $upgraded_nodes -eq $total_nodes ]; then
    echo "All nodes upgraded successfully!"
    break
  fi

  sleep 60
done
```

## Monitoring Pod Rescheduling

Track pods being evicted and rescheduled during node drains.

```bash
#!/bin/bash
# monitor-pod-rescheduling.sh

echo "Monitoring pod rescheduling..."

# Track pods in terminating state
watch -n 5 'kubectl get pods -A --field-selector status.phase=Terminating'

# Monitor pending pods
watch -n 5 'kubectl get pods -A --field-selector status.phase=Pending'

# Detailed rescheduling tracker
while true; do
  echo "========== $(date) =========="

  # Count pods by phase
  echo "Pods by phase:"
  kubectl get pods -A -o json | jq -r '
    .items |
    group_by(.status.phase) |
    .[] |
    "\(.[0].status.phase): \(length)"
  '

  # Show pods being rescheduled
  echo ""
  echo "Pods being rescheduled:"
  kubectl get pods -A -o json | jq -r '
    .items[] |
    select(.metadata.deletionTimestamp != null or .status.phase == "Pending") |
    "\(.metadata.namespace)/\(.metadata.name): \(.status.phase)"
  '

  sleep 10
done
```

## Using Metrics for Upgrade Monitoring

Monitor cluster metrics to track upgrade impact.

```bash
#!/bin/bash
# monitor-upgrade-metrics.sh

echo "Monitoring upgrade metrics..."

# Node resource usage
watch -n 10 'kubectl top nodes'

# Pod resource usage
watch -n 10 'kubectl top pods -A --sort-by=cpu | head -20'

# API server metrics
kubectl get --raw /metrics | grep -E "apiserver_request_total|apiserver_request_duration"

# etcd metrics
kubectl get --raw /metrics | grep etcd_disk

# Track cluster capacity changes
while true; do
  total_cpu=$(kubectl top nodes --no-headers | awk '{sum+=$2} END {print sum}')
  total_memory=$(kubectl top nodes --no-headers | awk '{sum+=$4} END {print sum}')

  echo "$(date): Total CPU: ${total_cpu}m, Total Memory: ${total_memory}Mi"

  sleep 60
done
```

## Creating Upgrade Dashboards

Build a comprehensive dashboard to visualize upgrade progress.

```yaml
# prometheus-upgrade-dashboard.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: upgrade-dashboard
  namespace: monitoring
data:
  dashboard.json: |
    {
      "dashboard": {
        "title": "Kubernetes Upgrade Progress",
        "panels": [
          {
            "title": "Nodes by Version",
            "targets": [
              {
                "expr": "count by (kubelet_version) (kubelet_running_pods)"
              }
            ]
          },
          {
            "title": "Pod Eviction Rate",
            "targets": [
              {
                "expr": "rate(kube_pod_deletion_total[5m])"
              }
            ]
          },
          {
            "title": "API Server Latency",
            "targets": [
              {
                "expr": "histogram_quantile(0.99, rate(apiserver_request_duration_seconds_bucket[5m]))"
              }
            ]
          }
        ]
      }
    }
```

## Automated Alerting

Set up alerts to notify you of upgrade issues.

```yaml
# prometheus-upgrade-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: upgrade-alerts
  namespace: monitoring
spec:
  groups:
  - name: kubernetes-upgrade
    interval: 30s
    rules:
    - alert: NodeNotReady
      expr: kube_node_status_condition{condition="Ready",status="true"} == 0
      for: 5m
      annotations:
        summary: "Node {{ $labels.node }} is not ready"
        description: "Node has been not ready for more than 5 minutes during upgrade"

    - alert: HighPodEvictionRate
      expr: rate(kube_pod_deletion_total[5m]) > 10
      for: 2m
      annotations:
        summary: "High pod eviction rate detected"
        description: "More than 10 pods/second being evicted"

    - alert: PodsPendingTooLong
      expr: kube_pod_status_phase{phase="Pending"} > 0
      for: 10m
      annotations:
        summary: "Pods stuck in pending state"
        description: "{{ $value }} pods have been pending for more than 10 minutes"

    - alert: APIServerHighLatency
      expr: histogram_quantile(0.99, rate(apiserver_request_duration_seconds_bucket[5m])) > 1
      for: 5m
      annotations:
        summary: "API server latency is high"
        description: "99th percentile API latency is above 1 second"
```

## Logging Upgrade Progress

Create detailed logs of upgrade progress for post-mortem analysis.

```bash
#!/bin/bash
# log-upgrade-progress.sh

LOG_DIR="upgrade-logs-$(date +%Y%m%d-%H%M%S)"
mkdir -p $LOG_DIR

log_snapshot() {
  timestamp=$(date +%Y%m%d-%H%M%S)

  # Node status
  kubectl get nodes -o wide > $LOG_DIR/nodes-$timestamp.txt

  # Pod status
  kubectl get pods -A -o wide > $LOG_DIR/pods-$timestamp.txt

  # Events
  kubectl get events -A --sort-by='.lastTimestamp' > $LOG_DIR/events-$timestamp.txt

  # Metrics snapshot
  kubectl top nodes > $LOG_DIR/node-metrics-$timestamp.txt
  kubectl top pods -A > $LOG_DIR/pod-metrics-$timestamp.txt
}

# Take snapshots every minute
while true; do
  log_snapshot
  sleep 60
done
```

## Validating Upgrade Completion

Verify that the upgrade completed successfully across all components.

```bash
#!/bin/bash
# validate-upgrade-complete.sh

TARGET_VERSION="v1.29.0"

echo "Validating upgrade completion..."

# Check all nodes are at target version
mismatched=$(kubectl get nodes -o json | \
  jq -r --arg version "$TARGET_VERSION" \
  '.items[] | select(.status.nodeInfo.kubeletVersion != $version) | .metadata.name')

if [ ! -z "$mismatched" ]; then
  echo "ERROR: Nodes not at target version:"
  echo "$mismatched"
  exit 1
fi

# Check all nodes are ready
notready=$(kubectl get nodes -o json | \
  jq -r '.items[] | select(.status.conditions[] | select(.type=="Ready" and .status!="True")) | .metadata.name')

if [ ! -z "$notready" ]; then
  echo "ERROR: Nodes not ready:"
  echo "$notready"
  exit 1
fi

# Check no pods are terminating
terminating=$(kubectl get pods -A --field-selector status.phase=Terminating --no-headers | wc -l)

if [ $terminating -gt 0 ]; then
  echo "WARNING: $terminating pods still terminating"
fi

# Check pod health
unhealthy=$(kubectl get pods -A --field-selector status.phase!=Running,status.phase!=Succeeded -o json | jq '.items | length')

echo "Unhealthy pods: $unhealthy"

if [ $unhealthy -eq 0 ]; then
  echo "SUCCESS: Upgrade completed successfully"
else
  echo "WARNING: $unhealthy pods are unhealthy"
fi

# Generate completion report
cat > upgrade-completion-report.txt << EOF
Kubernetes Upgrade Completion Report
=====================================
Date: $(date)
Target Version: $TARGET_VERSION

Summary:
- All nodes upgraded: YES
- All nodes ready: YES
- Unhealthy pods: $unhealthy
- Pods terminating: $terminating

Status: $([ $unhealthy -eq 0 ] && echo "SUCCESSFUL" || echo "COMPLETED WITH WARNINGS")
EOF

cat upgrade-completion-report.txt
```

Monitoring upgrade progress with node conditions and pod events gives you real-time visibility into cluster health during maintenance. By tracking node status, pod rescheduling, metrics, and events, you can detect issues immediately and take corrective action before minor problems become major outages.
