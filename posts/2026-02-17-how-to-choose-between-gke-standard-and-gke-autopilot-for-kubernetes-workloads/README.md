# How to Choose Between GKE Standard and GKE Autopilot for Kubernetes Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Kubernetes, GKE Autopilot, Container Orchestration, DevOps

Description: A detailed comparison of GKE Standard and GKE Autopilot modes to help you choose the right Kubernetes management level for your workloads.

---

When you create a GKE cluster, the first decision is choosing between Standard and Autopilot mode. This is not just a configuration toggle - it fundamentally changes how you interact with Kubernetes on GCP. Standard gives you full control over nodes. Autopilot takes node management away from you entirely and charges for workload resources, with pod-based billing for general-purpose workloads and node-based billing for workloads that select specific hardware. Let me break down when each mode makes sense.

## What is GKE Standard?

GKE Standard is the traditional managed Kubernetes experience. Google manages the control plane (API server, etcd, scheduler). You manage the worker nodes - choosing machine types, configuring node pools, handling scaling, and managing node upgrades.

You can SSH into nodes, run DaemonSets, configure custom kubelet settings, and use specialized hardware like GPUs or TPUs.

## What is GKE Autopilot?

GKE Autopilot is a fully managed Kubernetes mode where Google manages both the control plane and worker nodes. You define Kubernetes workload manifests, and GKE provisions the right amount of compute for them. You never manage nodes directly.

Autopilot enforces a set of best practices and restrictions. You cannot SSH into nodes, privileged containers are blocked by default except for verified partner or allowlisted workloads, and host networking is not available. These restrictions exist because Google manages the underlying infrastructure and needs to ensure security and stability.

## Feature Comparison

| Feature | GKE Standard | GKE Autopilot |
|---------|-------------|---------------|
| Node management | You manage nodes | Google manages nodes |
| Pricing | Cluster management fee + node VM pricing | Cluster management fee + pod-based pricing for general-purpose workloads; node-based pricing for specific hardware |
| GPU support | Yes | Yes (with some restrictions) |
| DaemonSets | Yes | Yes, subject to Autopilot security restrictions |
| Privileged containers | Yes | Blocked by default, except verified partner or allowlisted workloads |
| Host access (SSH) | Yes | No |
| Custom machine types | Yes | No (Autopilot selects) |
| Node autoscaling | You configure | Automatic |
| Persistent volumes | Full control | Supported |
| Max pods per node | Configurable | Managed by Google |
| Windows containers | Yes | No |
| Spot/preemptible VMs | Yes | Yes (Spot pods) |
| Minimum cost | Cluster management fee after free tier + node VM costs | Cluster management fee after free tier + workload costs |
| SLA | 99.95% regional control plane | 99.95% control plane; 99.9% for Autopilot Pods in multiple zones |

## When to Choose GKE Standard

### You Need Full Node Control

If your workloads require specific node configurations - custom kernel parameters, particular machine types, local SSDs, or GPU scheduling - Standard is the only option.

```bash
# Create a Standard cluster with custom node pool configuration

gcloud container clusters create my-standard-cluster \
    --region=us-central1 \
    --num-nodes=3 \
    --machine-type=n2-standard-8 \
    --disk-type=pd-ssd \
    --disk-size=200 \
    --enable-autoscaling \
    --min-nodes=1 \
    --max-nodes=10

# Add a GPU node pool for ML workloads
gcloud container node-pools create gpu-pool \
    --cluster=my-standard-cluster \
    --region=us-central1 \
    --machine-type=n1-standard-8 \
    --accelerator=type=nvidia-tesla-t4,count=1 \
    --num-nodes=0 \
    --enable-autoscaling \
    --min-nodes=0 \
    --max-nodes=5

# Add a spot VM node pool for cost savings on batch workloads
gcloud container node-pools create spot-pool \
    --cluster=my-standard-cluster \
    --region=us-central1 \
    --machine-type=n2-standard-4 \
    --spot \
    --num-nodes=0 \
    --enable-autoscaling \
    --min-nodes=0 \
    --max-nodes=20
```

### You Run DaemonSets or Privileged Workloads

Many monitoring and security tools run as DaemonSets or require privileged access:

```yaml
# Privileged host-level DaemonSet for log forwarding - use Standard
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-forwarder
spec:
  selector:
    matchLabels:
      app: log-forwarder
  template:
    metadata:
      labels:
        app: log-forwarder
    spec:
      containers:
        - name: forwarder
          image: my-log-forwarder:latest
          # Privileged access to read host logs
          securityContext:
            privileged: true
          volumeMounts:
            - name: varlog
              mountPath: /var/log
              readOnly: true
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
```

### You Want to Optimize Costs with Node-Level Controls

Standard mode lets you pack pods tightly on nodes, use preemptible VMs aggressively, and right-size node pools:

```bash
# Create node pools optimized for different workload types
# High-memory pool for databases
gcloud container node-pools create high-mem-pool \
    --cluster=my-standard-cluster \
    --region=us-central1 \
    --machine-type=n2-highmem-4 \
    --num-nodes=2 \
    --node-labels=workload-type=database

# Compute-optimized pool for API servers
gcloud container node-pools create compute-pool \
    --cluster=my-standard-cluster \
    --region=us-central1 \
    --machine-type=c2-standard-4 \
    --num-nodes=3 \
    --node-labels=workload-type=api
```

## When to Choose GKE Autopilot

### You Want Kubernetes Without Node Management

Autopilot is the right choice when you want to focus entirely on your workloads and not think about infrastructure:

```bash
# Create an Autopilot cluster - that is it, no node configuration
gcloud container clusters create-auto my-autopilot-cluster \
    --region=us-central1
```

That single command gives you a production-ready cluster. No node pools to configure, no autoscaling to tune, no node upgrades to manage.

### Your Workloads Are Standard Containers

If your pods do not need privileged access, host networking, or custom DaemonSets, Autopilot handles them cleanly:

```yaml
# Standard deployment works perfectly on Autopilot
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-api
  template:
    metadata:
      labels:
        app: my-api
    spec:
      containers:
        - name: my-api
          image: us-central1-docker.pkg.dev/my-project/my-repo/my-api:latest
          ports:
            - containerPort: 8080
          # Explicit requests are recommended on Autopilot
          # Autopilot uses requests to provision the right nodes
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "1"
              memory: "1Gi"
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: my-api
spec:
  type: LoadBalancer
  ports:
    - port: 80
      targetPort: 8080
  selector:
    app: my-api
```

### You Want Predictable Per-Pod Pricing

For general-purpose workloads, Autopilot charges based on pod resource requests. This makes cost allocation straightforward:

```yaml
# Each pod has explicit resource requests
# Autopilot bills based on these requests for general-purpose workloads
# 500m CPU + 512Mi memory per pod
# Check the current GKE pricing page for regional rates
spec:
  containers:
    - name: my-api
      resources:
        requests:
          cpu: "500m"      # Used for general-purpose Autopilot billing
          memory: "512Mi"   # Used for general-purpose Autopilot billing
```

Compare this to Standard mode where you pay for full nodes even if they are partially utilized.

### Your Team Is Small and Wants Less Ops

Autopilot eliminates an entire category of operational tasks:

- No node pool sizing decisions
- No node upgrade management (Google handles it)
- No cluster autoscaler tuning
- No security patching of node OS
- No monitoring of node health
- No capacity planning

## Cost Comparison

The cost comparison is nuanced. Autopilot can be cheaper or more expensive depending on your utilization:

**Scenario 1: Well-utilized Standard cluster**
- 3 nodes, n2-standard-4 (4 vCPU, 16 GB each)
- 80% utilization
- Cost: ~$290/month for nodes
- Effective cost per usable vCPU-hour: ~$0.034

**Scenario 1: Same general-purpose workload on Autopilot**
- Pods requesting 9.6 vCPU and 38.4 GB total
- Cost: ~$345/month (Autopilot vCPU rate is higher)
- But no wasted capacity

**Scenario 2: Poorly utilized Standard cluster**
- 3 nodes, n2-standard-4 (4 vCPU, 16 GB each)
- 30% utilization
- Cost: ~$290/month for nodes
- Effective cost per usable vCPU-hour: ~$0.090

**Scenario 2: Same general-purpose workload on Autopilot**
- Pods requesting 3.6 vCPU and 14.4 GB total
- Cost: ~$130/month
- Autopilot wins because you only pay for what pods request

The rule of thumb: if your Standard cluster runs above 60-70% utilization, Standard is likely cheaper. Below that, Autopilot is more cost-effective because you are not paying for idle capacity.

## Migration Between Modes

You cannot convert a Standard cluster to Autopilot or vice versa. Migration requires creating a new cluster and moving workloads:

```bash
# Export workload manifests from Standard cluster
kubectl get deployments,services,configmaps,secrets -o yaml > workloads.yaml

# Apply to Autopilot cluster (after adjusting for Autopilot restrictions)
kubectl --context=autopilot-cluster apply -f workloads.yaml
```

Before migrating to Autopilot, check for:
- Pods without explicit resource requests (Autopilot applies defaults, but explicit requests are better for sizing and cost)
- Privileged containers (blocked by default except verified partner or allowlisted workloads)
- DaemonSets that need privileged node access (standard DaemonSets must still satisfy Autopilot security restrictions)
- Host path volumes (write access is not allowed; read-only `/var/log` access is supported for debugging)
- Node affinity rules (may need updating)

## My Recommendation

For new projects where you do not have specific infrastructure requirements, **start with Autopilot**. It reduces operational overhead dramatically, and most standard containerized applications work fine on it.

Switch to **Standard** if you hit Autopilot's limitations: you need direct node control, privileged containers that are not supported by Autopilot allowlists, specific node configuration, or you have high enough utilization that node-level pricing is significantly cheaper.

The good news is that your application code and Kubernetes manifests are mostly the same between modes. The migration path is straightforward if you need to switch later.
