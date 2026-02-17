# How to Choose Between GKE Standard and GKE Autopilot for Kubernetes Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Kubernetes, GKE Autopilot, Container Orchestration, DevOps

Description: A detailed comparison of GKE Standard and GKE Autopilot modes to help you choose the right Kubernetes management level for your workloads.

---

When you create a GKE cluster, the first decision is choosing between Standard and Autopilot mode. This is not just a configuration toggle - it fundamentally changes how you interact with Kubernetes on GCP. Standard gives you full control over nodes. Autopilot takes node management away from you entirely and charges per pod resource usage. Let me break down when each mode makes sense.

## What is GKE Standard?

GKE Standard is the traditional managed Kubernetes experience. Google manages the control plane (API server, etcd, scheduler). You manage the worker nodes - choosing machine types, configuring node pools, handling scaling, and managing node upgrades.

You can SSH into nodes, run DaemonSets, configure custom kubelet settings, and use specialized hardware like GPUs or TPUs.

## What is GKE Autopilot?

GKE Autopilot is a fully managed Kubernetes mode where Google manages both the control plane and worker nodes. You only define pods (workloads), and GKE provisions the right amount of compute for them. You never see or manage nodes.

Autopilot enforces a set of best practices and restrictions. You cannot SSH into nodes, run privileged containers, or use host networking. These restrictions exist because Google manages the underlying infrastructure and needs to ensure security and stability.

## Feature Comparison

| Feature | GKE Standard | GKE Autopilot |
|---------|-------------|---------------|
| Node management | You manage nodes | Google manages nodes |
| Pricing | Per node (VM pricing) | Per pod (CPU + memory + ephemeral storage) |
| GPU support | Yes | Yes (with some restrictions) |
| DaemonSets | Yes | Google-approved only |
| Privileged containers | Yes | No |
| Host access (SSH) | Yes | No |
| Custom machine types | Yes | No (Autopilot selects) |
| Node autoscaling | You configure | Automatic |
| Persistent volumes | Full control | Supported |
| Max pods per node | Configurable | Managed by Google |
| Windows containers | Yes | No |
| Spot/preemptible VMs | Yes | Yes (Spot pods) |
| Minimum cost | ~$75/month (1 node) | ~$70/month (management fee + pod costs) |
| SLA | 99.95% (regional) | 99.9% (regional) |

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
# Custom DaemonSet for log forwarding - only works on Standard
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
    --machine-type=n2-highmem-4 \
    --num-nodes=2 \
    --node-labels=workload-type=database

# Compute-optimized pool for API servers
gcloud container node-pools create compute-pool \
    --cluster=my-standard-cluster \
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
          # Resource requests are required on Autopilot
          # Autopilot uses these to provision the right nodes
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

Autopilot charges based on pod resource requests. This makes cost allocation straightforward:

```yaml
# Each pod has explicit resource requests
# Autopilot bills exactly for these resources
# 500m CPU + 512Mi memory per pod
# Cost: (0.5 vCPU x $0.0445/hr) + (0.5 GiB x $0.0049/hr) = ~$0.0247/hr per pod
# 3 replicas = ~$0.074/hr = ~$53/month
spec:
  containers:
    - name: my-api
      resources:
        requests:
          cpu: "500m"      # Billed for this
          memory: "512Mi"   # Billed for this
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

**Scenario 1: Same workload on Autopilot**
- Pods requesting 9.6 vCPU and 38.4 GB total
- Cost: ~$345/month (Autopilot vCPU rate is higher)
- But no wasted capacity

**Scenario 2: Poorly utilized Standard cluster**
- 3 nodes, n2-standard-4 (4 vCPU, 16 GB each)
- 30% utilization
- Cost: ~$290/month for nodes
- Effective cost per usable vCPU-hour: ~$0.090

**Scenario 2: Same workload on Autopilot**
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
- Pods without resource requests (Autopilot requires them)
- Privileged containers (not allowed)
- Custom DaemonSets (only Google-approved ones work)
- Host path volumes (not allowed)
- Node affinity rules (may need updating)

## My Recommendation

For new projects where you do not have specific infrastructure requirements, **start with Autopilot**. It reduces operational overhead dramatically, and most standard containerized applications work fine on it.

Switch to **Standard** if you hit Autopilot's limitations: you need GPUs with custom scheduling, privileged containers, specific machine types, or you have high enough utilization that node-level pricing is significantly cheaper.

The good news is that your application code and Kubernetes manifests are mostly the same between modes. The migration path is straightforward if you need to switch later.
