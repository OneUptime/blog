# How to Reduce GKE Costs with Cluster Autoscaler and Node Auto-Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Kubernetes, Cluster Autoscaler, Cost Optimization, Google Cloud

Description: A hands-on guide to configuring GKE Cluster Autoscaler and Node Auto-Provisioning to scale nodes dynamically and reduce your Kubernetes costs.

---

Running Kubernetes on GKE gives you flexibility, but it also introduces a specific cost challenge: you pay for the nodes (VMs) in your cluster, not the pods running on them. If your nodes are half-empty or your cluster is sized for peak traffic at all times, you are paying for idle compute around the clock.

Cluster Autoscaler and Node Auto-Provisioning (NAP) solve this by dynamically adjusting the number and type of nodes in your cluster based on actual workload demand. This post covers how to set them up, tune them, and avoid the common pitfalls.

## Cluster Autoscaler vs. Node Auto-Provisioning

These two features are related but different:

**Cluster Autoscaler** scales the number of nodes in a node pool up and down. When pods cannot be scheduled because there are not enough resources, it adds nodes. When nodes are underutilized and their pods can be moved elsewhere, it removes nodes.

**Node Auto-Provisioning (NAP)** takes it a step further. Instead of scaling existing node pools, NAP creates entirely new node pools with the right machine type for the pending workloads. It can also delete node pools when they are no longer needed. This means your cluster can have a mix of machine types optimized for different workload profiles.

## Enabling Cluster Autoscaler

If you already have a GKE cluster, you can enable autoscaling on an existing node pool:

```bash
# Enable autoscaling on an existing node pool
gcloud container clusters update my-cluster \
  --zone=us-central1-a \
  --enable-autoscaling \
  --node-pool=default-pool \
  --min-nodes=1 \
  --max-nodes=10
```

For a new cluster, include autoscaling from the start:

```bash
# Create a new cluster with autoscaling enabled
gcloud container clusters create my-cluster \
  --zone=us-central1-a \
  --num-nodes=3 \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=20 \
  --machine-type=e2-standard-4
```

The `min-nodes` setting is your baseline. The cluster will never scale below this number. Set it to the minimum number of nodes needed to run your always-on services.

## Enabling Node Auto-Provisioning

NAP is enabled at the cluster level and requires you to set resource limits:

```bash
# Enable Node Auto-Provisioning with resource limits
gcloud container clusters update my-cluster \
  --zone=us-central1-a \
  --enable-autoprovisioning \
  --autoprovisioning-max-cpu=100 \
  --autoprovisioning-max-memory=400 \
  --autoprovisioning-min-cpu=4 \
  --autoprovisioning-min-memory=16
```

The resource limits tell NAP the maximum total CPU and memory it can provision across all auto-provisioned node pools. This acts as a safety net to prevent runaway scaling.

### Configuring NAP Machine Types

You can restrict which machine families NAP is allowed to use:

```bash
# Allow only specific machine families for auto-provisioned nodes
gcloud container clusters update my-cluster \
  --zone=us-central1-a \
  --enable-autoprovisioning \
  --autoprovisioning-max-cpu=100 \
  --autoprovisioning-max-memory=400 \
  --autoprovisioning-machine-types="e2-standard-2,e2-standard-4,e2-standard-8,n2-standard-4"
```

This keeps NAP from picking expensive machine types when cheaper ones would work fine.

## Tuning the Autoscaler for Cost Optimization

The default autoscaler settings work okay, but tuning them can save you more money.

### Scale-Down Settings

The autoscaler waits before removing underutilized nodes to avoid flapping. You can adjust these timers:

```yaml
# Autoscaler profile settings via cluster update
# Use the optimize-utilization profile for aggressive cost savings
```

```bash
# Set the autoscaler profile to optimize for utilization
gcloud container clusters update my-cluster \
  --zone=us-central1-a \
  --autoscaling-profile=optimize-utilization
```

The `optimize-utilization` profile scales down more aggressively than the default `balanced` profile. It reduces the scale-down delay and increases the utilization threshold for removing nodes. Use this for non-production environments or workloads that can tolerate brief scheduling delays during scale-up.

### Pod Disruption Budgets

Before the autoscaler removes a node, it needs to safely evict all pods. Pod Disruption Budgets (PDBs) control how many pods can be unavailable at once:

```yaml
# pod-disruption-budget.yaml
# Ensures at least 2 replicas are always available during node scale-down
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: my-app
```

Without PDBs, the autoscaler might be blocked from removing nodes because it cannot safely evict pods that lack disruption budgets.

## Setting Resource Requests Properly

The autoscaler makes decisions based on pod resource requests, not actual usage. If your pods request 2 CPUs but only use 0.5, the autoscaler thinks the node is busy when it is actually mostly idle.

Getting resource requests right is critical:

```yaml
# deployment.yaml
# Set resource requests based on actual observed usage
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
      - name: my-app
        image: my-app:latest
        resources:
          requests:
            cpu: "500m"      # Based on p95 actual usage
            memory: "512Mi"  # Based on p95 actual usage
          limits:
            cpu: "1000m"
            memory: "1Gi"
```

Use the Vertical Pod Autoscaler (VPA) in recommendation mode to find the right resource requests:

```bash
# Install VPA and get recommendations
# First, check if VPA is enabled on your cluster
gcloud container clusters describe my-cluster \
  --zone=us-central1-a \
  --format="value(verticalPodAutoscaling.enabled)"

# Enable VPA if not already enabled
gcloud container clusters update my-cluster \
  --zone=us-central1-a \
  --enable-vertical-pod-autoscaling
```

Then create a VPA resource in recommendation mode:

```yaml
# vpa-recommendation.yaml
# VPA in recommendation mode - does not change pods, just suggests
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  updatePolicy:
    updateMode: "Off"  # Only recommend, do not apply
```

## Using Spot VMs with Node Pools

For even bigger savings, create a node pool that uses Spot VMs:

```bash
# Create a Spot VM node pool with autoscaling
gcloud container node-pools create spot-pool \
  --cluster=my-cluster \
  --zone=us-central1-a \
  --spot \
  --enable-autoscaling \
  --min-nodes=0 \
  --max-nodes=20 \
  --machine-type=e2-standard-4
```

Then use node affinity or taints to schedule fault-tolerant workloads on the Spot pool:

```yaml
# Schedule batch jobs on Spot nodes for cost savings
apiVersion: batch/v1
kind: Job
metadata:
  name: batch-processing
spec:
  template:
    spec:
      nodeSelector:
        cloud.google.com/gke-spot: "true"
      tolerations:
      - key: cloud.google.com/gke-spot
        operator: Equal
        value: "true"
        effect: NoSchedule
      containers:
      - name: batch-job
        image: my-batch-image:latest
      restartPolicy: OnFailure
```

## Monitoring Cluster Efficiency

Track your cluster utilization to see how well autoscaling is working:

```bash
# Check node utilization across the cluster
kubectl top nodes

# Check pod resource usage vs requests
kubectl top pods --all-namespaces
```

In Cloud Monitoring, set up a dashboard that tracks:

- Node count over time
- CPU and memory utilization per node
- Pod scheduling latency
- Autoscaler events

A well-tuned cluster should show node count closely following workload patterns, with average node utilization above 60%.

## Common Pitfalls

1. **Pods without resource requests** - The autoscaler cannot make good decisions if pods do not declare their resource needs. Always set resource requests.

2. **DaemonSets consuming too many resources** - Every node runs DaemonSet pods. If your DaemonSets are heavy, they eat into the capacity of each node, reducing the resources available for your actual workloads.

3. **PDBs blocking scale-down** - Overly restrictive PDBs can prevent the autoscaler from removing underutilized nodes. Review your PDBs regularly.

4. **Not setting NAP resource limits** - Without limits, NAP can provision far more resources than you intended. Always set max CPU and memory.

5. **Using only one node pool** - Different workloads have different needs. Use multiple node pools with appropriate machine types instead of one-size-fits-all.

## Wrapping Up

Cluster Autoscaler and Node Auto-Provisioning are essential for keeping GKE costs under control. The combination of right-sized resource requests, aggressive scale-down profiles, Spot VM node pools, and NAP can easily cut your GKE compute costs by 40-60% compared to a statically sized cluster. Start by enabling autoscaling with conservative limits, tune as you learn your workload patterns, and always keep an eye on utilization metrics.
