# How to Debug Scheduling Failures with Scheduler Event Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Debugging, Scheduler

Description: Master the techniques for debugging Kubernetes scheduling failures using event logs, scheduler logs, and diagnostic tools to quickly identify and resolve why pods remain pending.

---

When pods get stuck in Pending state, you need to quickly identify why the scheduler couldn't place them. Kubernetes provides detailed event logs that explain scheduling failures, but you need to know where to look and how to interpret them.

This guide shows you how to systematically debug scheduling issues using events, logs, and diagnostic commands.

## Common Scheduling Failure Reasons

Pods remain pending due to:

- Insufficient CPU or memory resources
- No nodes matching node selector or affinity rules
- Taints without matching tolerations
- Pod topology spread constraints cannot be satisfied
- Persistent volume not available in required zone
- Resource quotas exceeded
- Image pull failures
- Admission webhook rejections

## Checking Pod Events

Start with pod events:

```bash
# View events for a specific pod
kubectl describe pod <pod-name> -n <namespace>

# Look specifically at the Events section
kubectl describe pod nginx-7d8f9c5b-xyz12 -n production | grep -A 20 "Events:"

# Get events in JSON format for parsing
kubectl get events -n production --field-selector involvedObject.name=nginx-7d8f9c5b-xyz12 -o json

# Sort events by timestamp
kubectl get events -n production --sort-by='.lastTimestamp' | grep nginx-7d8f9c5b-xyz12
```

Example output:

```
Events:
  Type     Reason            Age   From               Message
  ----     ------            ----  ----               -------
  Warning  FailedScheduling  2m    default-scheduler  0/5 nodes are available: 2 Insufficient cpu, 3 node(s) had taint {node-role.kubernetes.io/master: }, that the pod didn't tolerate.
```

## Interpreting Common Error Messages

**Insufficient Resources**:
```
0/5 nodes are available: 3 Insufficient cpu, 2 Insufficient memory
```

Check node resources:

```bash
# View node allocatable resources
kubectl describe nodes | grep -A 5 "Allocatable:"

# Check current resource usage
kubectl top nodes

# See what's consuming resources
kubectl describe node <node-name> | grep -A 20 "Allocated resources"
```

**Taint-Related Failures**:
```
0/5 nodes are available: 5 node(s) had taint {dedicated: gpu}, that the pod didn't tolerate
```

Solution:

```yaml
# Add toleration to pod spec
spec:
  tolerations:
  - key: "dedicated"
    operator: "Equal"
    value: "gpu"
    effect: "NoSchedule"
```

**Node Selector Mismatch**:
```
0/5 nodes are available: 5 node(s) didn't match Pod's node affinity/selector
```

Check:

```bash
# View pod's node selector
kubectl get pod <pod-name> -o jsonpath='{.spec.nodeSelector}' | jq

# List available node labels
kubectl get nodes --show-labels

# Find nodes with specific label
kubectl get nodes -l disktype=ssd
```

**Topology Spread Violations**:
```
0/5 nodes are available: 3 node(s) didn't match pod topology spread constraints, 2 Insufficient cpu
```

Investigate:

```bash
# Check topology spread configuration
kubectl get pod <pod-name> -o jsonpath='{.spec.topologySpreadConstraints}' | jq

# View pod distribution across zones
kubectl get pods -l app=myapp -o wide
```

## Accessing Scheduler Logs

View scheduler decision-making:

```bash
# Find scheduler pod
kubectl get pods -n kube-system -l component=kube-scheduler

# View scheduler logs
kubectl logs -n kube-system kube-scheduler-<node-name>

# Follow logs in real-time
kubectl logs -n kube-system kube-scheduler-<node-name> -f

# Filter for specific pod
kubectl logs -n kube-system kube-scheduler-<node-name> | grep <pod-name>

# Search for scheduling failures
kubectl logs -n kube-system kube-scheduler-<node-name> | grep -i "failed\|error"
```

Increase scheduler verbosity:

```bash
# Edit scheduler manifest (for kubeadm clusters)
sudo vi /etc/kubernetes/manifests/kube-scheduler.yaml

# Add --v=4 flag for more verbose logging
spec:
  containers:
  - command:
    - kube-scheduler
    - --v=4  # Increase verbosity
```

## Using kubectl Events Command

Get cluster-wide scheduling events:

```bash
# All scheduling failures
kubectl get events --all-namespaces --field-selector reason=FailedScheduling

# Recent scheduling events
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | head -20

# Events for a specific namespace
kubectl get events -n production --field-selector reason=FailedScheduling

# Watch events in real-time
kubectl get events --all-namespaces --watch

# Filter by type
kubectl get events --all-namespaces --field-selector type=Warning
```

## Diagnostic Script for Pending Pods

Create a comprehensive diagnostic script:

```bash
#!/bin/bash
# debug-pending-pods.sh

NAMESPACE=${1:-default}
POD_NAME=${2}

if [ -z "$POD_NAME" ]; then
  echo "Usage: $0 <namespace> <pod-name>"
  exit 1
fi

echo "=== Pod Status ==="
kubectl get pod $POD_NAME -n $NAMESPACE

echo -e "\n=== Pod Events ==="
kubectl describe pod $POD_NAME -n $NAMESPACE | grep -A 20 "Events:"

echo -e "\n=== Node Selector ==="
kubectl get pod $POD_NAME -n $NAMESPACE -o jsonpath='{.spec.nodeSelector}' | jq

echo -e "\n=== Node Affinity ==="
kubectl get pod $POD_NAME -n $NAMESPACE -o jsonpath='{.spec.affinity}' | jq

echo -e "\n=== Tolerations ==="
kubectl get pod $POD_NAME -n $NAMESPACE -o jsonpath='{.spec.tolerations}' | jq

echo -e "\n=== Resource Requests ==="
kubectl get pod $POD_NAME -n $NAMESPACE -o jsonpath='{.spec.containers[*].resources}' | jq

echo -e "\n=== Available Node Resources ==="
kubectl describe nodes | grep -A 5 "Allocatable:"

echo -e "\n=== Node Taints ==="
kubectl get nodes -o json | jq -r '.items[] | {name: .metadata.name, taints: .spec.taints}'

echo -e "\n=== Topology Spread Constraints ==="
kubectl get pod $POD_NAME -n $NAMESPACE -o jsonpath='{.spec.topologySpreadConstraints}' | jq

echo -e "\n=== PVC Status (if any) ==="
kubectl get pod $POD_NAME -n $NAMESPACE -o jsonpath='{.spec.volumes[*].persistentVolumeClaim}' | jq
```

Make it executable:

```bash
chmod +x debug-pending-pods.sh
./debug-pending-pods.sh production nginx-7d8f9c5b-xyz12
```

## Checking Resource Quotas

If pods fail due to quotas:

```bash
# List resource quotas
kubectl get resourcequota -n production

# Describe quota details
kubectl describe resourcequota -n production

# Check current usage vs limits
kubectl describe resourcequota production-quota -n production

# Example output:
# Name:       production-quota
# Resource    Used   Hard
# --------    ----   ----
# cpu         45     50
# memory      90Gi   100Gi
# pods        48     50
```

## Analyzing Scheduler Predicates

Understand why nodes were filtered out:

```bash
# Enable scheduler debugging
kubectl get events --all-namespaces -o json | \
  jq '.items[] | select(.reason=="FailedScheduling") | .message'

# Common predicate failures:
# - PodFitsResources: Not enough CPU/memory
# - PodFitsHost: Hostname doesn't match
# - PodFitsHostPorts: Port conflict
# - PodMatchNodeSelector: Node selector mismatch
# - NoDiskConflict: Volume conflict
# - NoVolumeZoneConflict: Volume in wrong zone
# - CheckNodeMemoryPressure: Node under memory pressure
# - CheckNodeDiskPressure: Node under disk pressure
# - CheckNodePIDPressure: Node has too many processes
```

## Checking Volume Topology

For pods with PVCs:

```bash
# Check PVC status
kubectl get pvc -n production

# Describe PVC
kubectl describe pvc data-postgres-0 -n production

# Check PV topology
kubectl get pv -o json | \
  jq -r '.items[] | {name: .metadata.name, zone: .metadata.labels["topology.kubernetes.io/zone"]}'

# Verify pod's node zone matches volume zone
kubectl get pod postgres-0 -n production -o json | \
  jq -r '.spec.nodeName' | \
  xargs kubectl get node -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}'
```

## Real-Time Scheduling Monitoring

Monitor scheduling activity:

```bash
# Watch pending pods
watch 'kubectl get pods --all-namespaces --field-selector=status.phase=Pending'

# Monitor scheduler decisions
kubectl logs -n kube-system kube-scheduler-master-1 -f | grep -E "pod|Attempting|Successfully"

# Track scheduling rate
kubectl get events --all-namespaces -o json | \
  jq -r '.items[] | select(.reason=="Scheduled") | .metadata.creationTimestamp' | \
  sort | uniq -c
```

## Prometheus Queries for Scheduling Metrics

Query scheduler metrics:

```promql
# Scheduling attempts
rate(scheduler_schedule_attempts_total[5m])

# Scheduling failures by reason
rate(scheduler_schedule_attempts_total{result="error"}[5m]) by (profile)

# Pending pods
sum(kube_pod_status_phase{phase="Pending"}) by (namespace)

# Scheduling latency
histogram_quantile(0.99, rate(scheduler_scheduling_duration_seconds_bucket[5m]))
```

## Common Scenarios and Solutions

**Scenario 1: Pod stuck pending with "Insufficient cpu"**

```bash
# Check if autoscaler can add nodes
kubectl get nodes
kubectl describe configmap cluster-autoscaler-status -n kube-system

# Temporary fix: Reduce resource requests
kubectl edit deployment <deployment-name>
```

**Scenario 2: PVC binding failure**

```bash
# Check storage class
kubectl get storageclass
kubectl describe storageclass <storage-class-name>

# Verify PVC events
kubectl describe pvc <pvc-name>

# Check if provisioner is running
kubectl get pods -n kube-system | grep provisioner
```

**Scenario 3: Pod affinity prevents scheduling**

```bash
# Check pod affinity rules
kubectl get pod <pod-name> -o jsonpath='{.spec.affinity.podAffinity}' | jq

# Find matching pods
kubectl get pods -l <label-selector> -o wide

# Temporarily relax affinity
# Change requiredDuringScheduling to preferredDuringScheduling
```

## Best Practices

1. **Check Events First**: Always start with `kubectl describe pod`
2. **Increase Verbosity**: Use `--v=4` or higher for detailed scheduler logs
3. **Monitor Trends**: Track scheduling failures over time
4. **Automate Diagnostics**: Create scripts for common debugging tasks
5. **Use Metrics**: Set up Prometheus alerts for scheduling issues
6. **Test Locally**: Validate resource requests and affinity rules before deployment
7. **Document Patterns**: Keep a runbook of common scheduling issues
8. **Clean Old Events**: Periodically clean up old events to reduce noise

## Troubleshooting Tools

```bash
# Install kubectl debug plugin
kubectl krew install debug

# Use stern for multi-pod logs
stern -n kube-system kube-scheduler

# Install k9s for interactive debugging
k9s

# Use kubectx and kubens
kubens production
kubectl get pods --field-selector=status.phase=Pending
```

Debugging scheduling failures systematically using event logs and scheduler diagnostics helps you quickly identify and resolve issues preventing pods from running. Start with pod events, escalate to scheduler logs when needed, and use automation to handle common scenarios efficiently.

