# How to Troubleshoot GKE Node NotReady Status Caused by Resource Pressure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Kubernetes, Troubleshooting, Node Management, Resource Pressure

Description: A practical guide to diagnosing and resolving GKE nodes stuck in NotReady status due to memory pressure, disk pressure, or PID pressure conditions.

---

You check your cluster and see nodes in `NotReady` status. Pods are being evicted. New pods cannot schedule. Your application is degraded. This is one of those situations where you need to act fast, but understanding what is happening is essential to fixing it correctly.

When a GKE node goes NotReady, it means the kubelet on that node has stopped reporting healthy status to the API server. One of the most common causes is resource pressure - the node has run out of memory, disk space, or process IDs. The kubelet detects the pressure, marks the node with a condition, and eventually stops accepting new pods.

## Identifying the Problem

Start by checking the node status:

```bash
# List all nodes and their status
kubectl get nodes
```

For nodes showing NotReady, get the detailed conditions:

```bash
# Get detailed conditions for a specific node
kubectl describe node gke-my-cluster-default-pool-abc123
```

Look at the Conditions section. You will see one or more of these pressure conditions:

- **MemoryPressure**: The node is running low on memory
- **DiskPressure**: The node is running low on disk space
- **PIDPressure**: The node is running out of process IDs
- **Ready = False**: The kubelet has stopped responding

Also check the events at the bottom for messages about eviction or resource thresholds.

## Diagnosing Memory Pressure

Memory pressure is the most common cause. It happens when pods use more memory than their requests, consuming the node's allocatable memory.

Check memory usage on the node:

```bash
# Check memory usage across all nodes
kubectl top nodes

# Check which pods on the problem node are using the most memory
kubectl top pods --all-namespaces --sort-by=memory | head -20
```

If kubectl top is not working (because the node is NotReady), check through the GCP console or use gcloud:

```bash
# SSH into the node to check memory directly
gcloud compute ssh gke-my-cluster-default-pool-abc123 \
  --zone us-central1-a \
  --command "free -h"

# Check which processes are using the most memory
gcloud compute ssh gke-my-cluster-default-pool-abc123 \
  --zone us-central1-a \
  --command "ps aux --sort=-%mem | head -20"
```

The kubelet starts evicting pods when available memory drops below the eviction threshold (default is 100Mi). It evicts pods in this order:

1. Pods exceeding their resource requests
2. Pods with the lowest priority
3. Pods using the most memory relative to their requests

## Fixing Memory Pressure

Immediate fix - cordon the node and move workloads:

```bash
# Prevent new pods from being scheduled on the stressed node
kubectl cordon gke-my-cluster-default-pool-abc123

# Drain existing pods to other nodes (with a grace period)
kubectl drain gke-my-cluster-default-pool-abc123 \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --grace-period=60
```

Long-term fixes:

Set memory limits on all pods to prevent runaway memory consumption:

```yaml
# deployment.yaml - Deployment with proper memory limits to prevent pressure
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: my-app:v1
          resources:
            requests:
              # Request what the app typically uses
              memory: 256Mi
              cpu: 250m
            limits:
              # Set a ceiling to prevent runaway memory usage
              memory: 512Mi
              cpu: 500m
```

Use LimitRange to enforce defaults on namespaces:

```yaml
# limitrange.yaml - Default resource limits for the namespace
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: default
spec:
  limits:
    - default:
        memory: 512Mi
        cpu: 500m
      defaultRequest:
        memory: 128Mi
        cpu: 100m
      type: Container
```

## Diagnosing Disk Pressure

Disk pressure happens when the node's root filesystem or the container runtime storage fills up. Common causes include:

- Container images accumulating on the node
- Large log files from chatty applications
- emptyDir volumes filling up
- Container writable layers growing

Check disk usage on the node:

```bash
# SSH into the node and check disk usage
gcloud compute ssh gke-my-cluster-default-pool-abc123 \
  --zone us-central1-a \
  --command "df -h"

# Check what is using the most space
gcloud compute ssh gke-my-cluster-default-pool-abc123 \
  --zone us-central1-a \
  --command "du -sh /var/lib/docker/* 2>/dev/null | sort -rh | head -10"
```

The kubelet evicts pods when available disk space drops below 15% (default) and starts garbage collecting container images when it drops below 85% utilization.

## Fixing Disk Pressure

Immediate fix - clean up unused images and containers:

```bash
# SSH to the node and clean up unused container resources
gcloud compute ssh gke-my-cluster-default-pool-abc123 \
  --zone us-central1-a \
  --command "sudo crictl rmi --prune"
```

Long-term fixes:

Use larger boot disks for your node pool:

```bash
# Create a new node pool with a larger boot disk
gcloud container node-pools create larger-disk-pool \
  --cluster=my-cluster \
  --zone=us-central1-a \
  --disk-size=200 \
  --disk-type=pd-ssd \
  --num-nodes=3
```

Set ephemeral storage limits on pods:

```yaml
# Pod with ephemeral storage limits to prevent disk pressure
resources:
  requests:
    ephemeral-storage: 1Gi
  limits:
    # Prevent any single pod from using more than 5Gi of disk
    ephemeral-storage: 5Gi
```

Configure log rotation to prevent log files from filling the disk. GKE handles this automatically for container stdout/stderr, but application logs written to files inside the container need explicit rotation.

## Diagnosing PID Pressure

PID pressure is less common but can happen with applications that spawn many threads or child processes. The default PID limit per node is usually in the tens of thousands.

Check PID usage:

```bash
# Check current PID usage on the node
gcloud compute ssh gke-my-cluster-default-pool-abc123 \
  --zone us-central1-a \
  --command "ps aux | wc -l"

# Check which processes are spawning the most child processes
gcloud compute ssh gke-my-cluster-default-pool-abc123 \
  --zone us-central1-a \
  --command "ps -e --no-headers | awk '{print \$4}' | sort | uniq -c | sort -rn | head -10"
```

The fix is usually application-level: limit the number of threads or worker processes your application creates. You can also set PID limits per pod in the kubelet configuration.

## Preventing Resource Pressure

The best approach is prevention. Here is a checklist:

### Use Resource Quotas

Apply resource quotas to each namespace to prevent any single team from consuming all node resources:

```yaml
# resource-quota.yaml - Limit total resource consumption per namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-quota
  namespace: team-alpha
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "50"
```

### Enable Cluster Autoscaler

Make sure the cluster autoscaler is configured to add nodes before existing ones hit capacity:

```bash
# Enable autoscaling on the node pool
gcloud container node-pools update default-pool \
  --cluster=my-cluster \
  --zone=us-central1-a \
  --enable-autoscaling \
  --min-nodes=2 \
  --max-nodes=10
```

### Set Up Monitoring Alerts

Create alerts that fire before nodes reach critical pressure:

```bash
# Create an alert for high node memory usage (above 85%)
gcloud alpha monitoring policies create \
  --display-name="GKE Node High Memory" \
  --condition-filter='resource.type="k8s_node" AND metric.type="kubernetes.io/node/memory/allocatable_utilization"' \
  --condition-threshold-value=0.85 \
  --condition-threshold-comparison=COMPARISON_GT \
  --duration=300s
```

### Review Pod Priorities

Use PriorityClasses to ensure critical workloads survive eviction:

```yaml
# priority-class.yaml - High priority for critical workloads
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
globalDefault: false
description: "Priority class for critical production workloads"
```

Node resource pressure is a signal that your cluster capacity planning needs attention. Fix the immediate issue by draining or replacing the affected node, then put the long-term fixes in place - resource limits, quotas, autoscaling, and monitoring. The goal is to catch pressure building before it takes a node offline.
