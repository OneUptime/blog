# How to Fix GKE Pod Stuck in Pending State Due to Insufficient CPU or Memory Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GKE, Kubernetes, Troubleshooting, Pod Scheduling, Resource Management, GCP

Description: A practical guide to diagnosing and fixing GKE pods stuck in Pending state when the cluster lacks sufficient CPU or memory resources for scheduling.

---

You deploy your workload and it just sits there. The pod status says Pending, and nothing happens. No crash loops, no errors in the container logs - just silence. This is one of the most common issues in GKE, and it almost always comes down to the scheduler not being able to find a node with enough CPU or memory to place your pod.

Let's walk through how to diagnose this, fix it, and prevent it from happening again.

## Confirming the Problem

The first thing to do is check what the scheduler is actually telling you. Run kubectl describe on the stuck pod:

```bash
# Check the events section for scheduling failures
kubectl describe pod your-pod-name -n your-namespace
```

Look at the Events section at the bottom. If you see a message like this, you have a resource shortage:

```
Events:
  Type     Reason            Age   From               Message
  ----     ------            ----  ----               -------
  Warning  FailedScheduling  2m    default-scheduler  0/3 nodes are available:
           1 Insufficient cpu, 2 Insufficient memory.
```

That message is telling you that out of 3 nodes in your cluster, 1 does not have enough CPU and 2 do not have enough memory to fit your pod's resource requests.

## Understanding Resource Requests vs Limits

Before fixing anything, make sure you understand the difference between requests and limits. The scheduler only looks at requests when deciding where to place a pod. Limits come into play after the pod is running.

```yaml
# Resource requests are what the scheduler uses for placement decisions
# Limits cap what the container can actually use at runtime
resources:
  requests:
    cpu: "500m"      # scheduler reserves 0.5 CPU cores
    memory: "512Mi"  # scheduler reserves 512 MiB of memory
  limits:
    cpu: "1000m"     # container can burst up to 1 CPU core
    memory: "1Gi"    # container gets OOMKilled if it exceeds 1 GiB
```

If your requests are too high relative to what the pod actually needs, you are wasting cluster capacity. If they are too low, you risk performance issues from overcommitment.

## Step 1 - Check Current Node Resource Usage

See how much capacity your nodes actually have and how much is allocated:

```bash
# Show allocatable resources and current allocation for all nodes
kubectl describe nodes | grep -A 5 "Allocated resources"
```

For a more structured view, use kubectl top:

```bash
# Show actual CPU and memory usage across nodes
kubectl top nodes
```

You might see something like this:

```
NAME                    CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
gke-cluster-pool-abc    1850m        92%    5800Mi          90%
gke-cluster-pool-def    1920m        96%    6100Mi          95%
gke-cluster-pool-ghi    1780m        89%    5500Mi          85%
```

If all your nodes are above 85-90% allocation, there simply is not room for a new pod with meaningful resource requests.

## Step 2 - Right-Size Your Resource Requests

One of the fastest fixes is to reduce your pod's resource requests to match what it actually needs. Check the real usage of similar pods:

```bash
# Check actual resource consumption of running pods in a namespace
kubectl top pods -n your-namespace
```

If your pod requests 2Gi of memory but similar pods only use 800Mi, you are over-requesting. Adjust the deployment:

```yaml
# Adjusted resource requests based on actual observed usage
# Leave some headroom above real usage but don't over-provision
apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-app
spec:
  template:
    spec:
      containers:
      - name: app
        resources:
          requests:
            cpu: "250m"     # reduced from 500m based on actual usage
            memory: "384Mi" # reduced from 512Mi based on actual usage
          limits:
            cpu: "500m"
            memory: "768Mi"
```

## Step 3 - Scale Up Your Node Pool

If your pods genuinely need the resources they are requesting, you need more nodes. You can manually resize a node pool:

```bash
# Add more nodes to the pool to provide additional capacity
gcloud container clusters resize your-cluster \
  --node-pool default-pool \
  --num-nodes 5 \
  --zone us-central1-a
```

Or better yet, enable the cluster autoscaler so it handles this automatically:

```bash
# Enable autoscaling with min and max node counts
gcloud container clusters update your-cluster \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10 \
  --node-pool default-pool \
  --zone us-central1-a
```

## Step 4 - Use Larger Machine Types

Sometimes the issue is not the total cluster capacity but individual node size. If you have a pod requesting 8Gi of memory and your nodes are e2-standard-2 machines with only 8Gi total (of which 5-6Gi is allocatable after system reservations), no single node can fit your pod.

Create a new node pool with larger machines:

```bash
# Create a new node pool with bigger machines for resource-heavy workloads
gcloud container node-pools create high-memory-pool \
  --cluster your-cluster \
  --machine-type e2-standard-8 \
  --num-nodes 2 \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 5 \
  --zone us-central1-a
```

Then use node selectors or affinity rules to direct heavy pods to the right pool:

```yaml
# Direct pods to the high-memory node pool using a node selector
spec:
  nodeSelector:
    cloud.google.com/gke-nodepool: high-memory-pool
  containers:
  - name: heavy-app
    resources:
      requests:
        memory: "8Gi"
```

## Step 5 - Check for Resource Fragmentation

Sometimes the cluster has enough total resources but they are fragmented across nodes. For example, three nodes might each have 500Mi of free memory, but your pod needs 1Gi. No single node can fit it.

You can spot this by checking each node individually:

```bash
# List allocatable vs requested resources per node
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
CPU_ALLOC:.status.allocatable.cpu,\
MEM_ALLOC:.status.allocatable.memory
```

If you see fragmentation, consider using pod priority and preemption to let important workloads displace less critical ones:

```yaml
# Define a high-priority class for critical workloads
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
globalDefault: false
description: "Priority class for production workloads"
---
# Use the priority class in your deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-app
spec:
  template:
    spec:
      priorityClassName: high-priority
      containers:
      - name: app
        resources:
          requests:
            cpu: "1"
            memory: "2Gi"
```

## Step 6 - Review System Pods and DaemonSets

Do not forget that system components consume resources too. On each GKE node, kube-system pods, DaemonSets, and the kubelet itself all consume CPU and memory. On a small e2-standard-2 node, system overhead can eat up 20-30% of the total capacity.

Check what is running on each node:

```bash
# List all pods on a specific node to see system overhead
kubectl get pods --all-namespaces --field-selector spec.nodeName=gke-cluster-pool-abc
```

If third-party DaemonSets like monitoring agents or log collectors are consuming significant resources, consider whether they can be optimized or whether you need to account for their overhead when sizing nodes.

## Prevention with Vertical Pod Autoscaler

To avoid this problem long-term, set up the Vertical Pod Autoscaler (VPA) to automatically recommend or adjust resource requests:

```yaml
# VPA will monitor actual resource usage and recommend better request values
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: your-app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: your-app
  updatePolicy:
    updateMode: "Off"  # start with Off to just get recommendations
```

Run it in "Off" mode first to see what it recommends, then switch to "Auto" when you are comfortable with the suggestions.

## Quick Diagnostic Checklist

When a pod is stuck in Pending, run through this list:

1. `kubectl describe pod` - read the scheduling failure message
2. `kubectl top nodes` - check actual node utilization
3. `kubectl top pods` - compare requested vs actual usage
4. Check if cluster autoscaler is enabled and working
5. Verify your machine type is large enough for the pod's requests
6. Look for resource fragmentation across nodes
7. Review DaemonSet and system pod overhead

Most of the time, it comes down to either over-requesting resources or not having enough nodes. Start with right-sizing your requests, and use the cluster autoscaler as your safety net.
