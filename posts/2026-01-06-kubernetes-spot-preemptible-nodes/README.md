# How to Use Spot/Preemptible Nodes in Kubernetes Cost-Effectively

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Spot Instances, Cost Optimization, Cloud, AWS, GCP, Azure, DevOps

Description: A comprehensive guide to using spot instances, preemptible VMs, and spot VMs in Kubernetes, including configuration, workload patterns, and interruption handling.

---

Spot instances cost 60-90% less than on-demand. The catch? They can be terminated with little notice. Here's how to use them effectively in Kubernetes without sacrificing reliability.

## Understanding Spot Instance Economics

| Provider | Product Name | Discount | Notice Period |
|----------|-------------|----------|---------------|
| AWS | Spot Instances | 60-90% | 2 minutes |
| GCP | Preemptible VMs | 60-91% | 30 seconds |
| GCP | Spot VMs | 60-91% | 30 seconds |
| Azure | Spot VMs | 60-90% | 30 seconds |

## When to Use Spot Instances

### Good Candidates

- Stateless web services with multiple replicas
- Batch processing jobs
- CI/CD workers
- Dev/staging environments
- Data processing pipelines
- Worker pools for queue processing

### Poor Candidates

- Databases and stateful workloads
- Single-replica services
- Long-running jobs that can't checkpoint
- Services with long startup times

## AWS EKS Spot Setup

### Create Spot Node Group

```bash
# Using eksctl
eksctl create nodegroup \
  --cluster my-cluster \
  --name spot-workers \
  --node-type m5.large,m5a.large,m4.large \
  --nodes-min 0 \
  --nodes-max 20 \
  --nodes 3 \
  --spot \
  --instance-types-filters "cpu-manufacturer=intel"
```

### Terraform Configuration

```hcl
resource "aws_eks_node_group" "spot" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "spot-workers"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.subnet_ids

  capacity_type = "SPOT"

  instance_types = [
    "m5.large",
    "m5a.large",
    "m5d.large",
    "m4.large"
  ]

  scaling_config {
    desired_size = 3
    max_size     = 20
    min_size     = 0
  }

  labels = {
    lifecycle = "spot"
  }

  taint {
    key    = "spot"
    value  = "true"
    effect = "NO_SCHEDULE"
  }
}
```

### AWS Node Termination Handler

Install to handle spot interruptions gracefully:

```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-node-termination-handler eks/aws-node-termination-handler \
  --namespace kube-system \
  --set enableSpotInterruptionDraining=true \
  --set enableRebalanceMonitoring=true \
  --set enableScheduledEventDraining=true
```

## GCP GKE Spot Setup

### Create Spot Node Pool

```bash
gcloud container node-pools create spot-pool \
  --cluster=my-cluster \
  --zone=us-central1-a \
  --machine-type=n1-standard-4 \
  --spot \
  --num-nodes=3 \
  --min-nodes=0 \
  --max-nodes=20 \
  --enable-autoscaling \
  --node-labels=cloud.google.com/gke-spot=true \
  --node-taints=cloud.google.com/gke-spot=true:NoSchedule
```

### Terraform Configuration

```hcl
resource "google_container_node_pool" "spot" {
  name       = "spot-pool"
  location   = var.zone
  cluster    = google_container_cluster.main.name

  autoscaling {
    min_node_count = 0
    max_node_count = 20
  }

  node_config {
    machine_type = "n1-standard-4"
    spot         = true

    labels = {
      "cloud.google.com/gke-spot" = "true"
    }

    taint {
      key    = "cloud.google.com/gke-spot"
      value  = "true"
      effect = "NO_SCHEDULE"
    }
  }
}
```

## Azure AKS Spot Setup

### Create Spot Node Pool

```bash
az aks nodepool add \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name spotnodepool \
  --priority Spot \
  --eviction-policy Delete \
  --spot-max-price -1 \
  --node-vm-size Standard_DS2_v2 \
  --node-count 3 \
  --min-count 0 \
  --max-count 20 \
  --enable-cluster-autoscaler \
  --labels kubernetes.azure.com/scalesetpriority=spot \
  --node-taints kubernetes.azure.com/scalesetpriority=spot:NoSchedule
```

### Terraform Configuration

```hcl
resource "azurerm_kubernetes_cluster_node_pool" "spot" {
  name                  = "spot"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size              = "Standard_DS2_v2"
  priority             = "Spot"
  eviction_policy      = "Delete"
  spot_max_price       = -1

  enable_auto_scaling = true
  min_count           = 0
  max_count           = 20
  node_count          = 3

  node_labels = {
    "kubernetes.azure.com/scalesetpriority" = "spot"
  }

  node_taints = [
    "kubernetes.azure.com/scalesetpriority=spot:NoSchedule"
  ]
}
```

## Scheduling Workloads on Spot Nodes

### Node Selector and Toleration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spot-workload
spec:
  replicas: 5
  template:
    spec:
      nodeSelector:
        lifecycle: spot  # AWS label
        # or: cloud.google.com/gke-spot: "true"  # GCP
        # or: kubernetes.azure.com/scalesetpriority: spot  # Azure
      tolerations:
        - key: spot
          value: "true"
          effect: NoSchedule
      containers:
        - name: worker
          image: myapp/worker:latest
```

### Mixed On-Demand and Spot

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mixed-workload
spec:
  replicas: 10
  template:
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: lifecycle
                    operator: In
                    values:
                      - spot
            - weight: 1
              preference:
                matchExpressions:
                  - key: lifecycle
                    operator: In
                    values:
                      - on-demand
      tolerations:
        - key: spot
          value: "true"
          effect: NoSchedule
```

## Handling Spot Interruptions

### Graceful Shutdown

```yaml
spec:
  terminationGracePeriodSeconds: 120
  containers:
    - name: app
      lifecycle:
        preStop:
          exec:
            command:
              - /bin/sh
              - -c
              - |
                # Signal app to stop accepting new work
                kill -SIGTERM 1
                # Wait for in-flight requests
                sleep 90
```

### Pod Disruption Budgets

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: spot-workload-pdb
spec:
  minAvailable: 80%
  selector:
    matchLabels:
      app: spot-workload
```

### Anti-Affinity for High Availability

```yaml
spec:
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchLabels:
                app: my-app
            topologyKey: kubernetes.io/hostname
```

## Spot-Friendly Application Patterns

### Pattern 1: Queue-Based Processing

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: queue-worker
spec:
  replicas: 10
  template:
    spec:
      nodeSelector:
        lifecycle: spot
      tolerations:
        - key: spot
          value: "true"
          effect: NoSchedule
      containers:
        - name: worker
          image: worker:latest
          env:
            - name: QUEUE_URL
              value: "sqs://my-queue"
          # Worker pulls messages, processes, deletes
          # If interrupted, message goes back to queue
```

### Pattern 2: Checkpointing

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: batch-job
spec:
  template:
    spec:
      nodeSelector:
        lifecycle: spot
      tolerations:
        - key: spot
          value: "true"
          effect: NoSchedule
      containers:
        - name: processor
          image: batch:latest
          command:
            - /bin/sh
            - -c
            - |
              # Resume from checkpoint if exists
              if [ -f /checkpoint/progress ]; then
                START=$(cat /checkpoint/progress)
              else
                START=0
              fi
              # Process and checkpoint periodically
              ./process --start=$START --checkpoint-dir=/checkpoint
          volumeMounts:
            - name: checkpoint
              mountPath: /checkpoint
      volumes:
        - name: checkpoint
          persistentVolumeClaim:
            claimName: checkpoint-pvc
```

### Pattern 3: Stateless Web Services

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 6
  template:
    spec:
      nodeSelector:
        lifecycle: spot
      tolerations:
        - key: spot
          value: "true"
          effect: NoSchedule
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: api
              topologyKey: kubernetes.io/hostname
      containers:
        - name: api
          image: api:latest
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
          # Connection draining
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 15"]
      terminationGracePeriodSeconds: 30
```

## Cluster Autoscaler Configuration

### AWS

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  priorities: |-
    10:
      - .*spot.*
    50:
      - .*on-demand.*
```

### Expander Configuration

```bash
# Use priority expander
cluster-autoscaler \
  --expander=priority \
  --balance-similar-node-groups=true \
  --skip-nodes-with-local-storage=false
```

## Karpenter for AWS (Recommended)

Karpenter is more flexible than Cluster Autoscaler for spot:

```yaml
apiVersion: karpenter.sh/v1alpha5
kind: Provisioner
metadata:
  name: spot-provisioner
spec:
  requirements:
    - key: karpenter.sh/capacity-type
      operator: In
      values: ["spot"]
    - key: kubernetes.io/arch
      operator: In
      values: ["amd64"]
    - key: node.kubernetes.io/instance-type
      operator: In
      values:
        - m5.large
        - m5.xlarge
        - m5a.large
        - m5a.xlarge
        - m4.large
        - m4.xlarge
  limits:
    resources:
      cpu: 1000
  providerRef:
    name: default
  ttlSecondsAfterEmpty: 60

---
apiVersion: karpenter.k8s.aws/v1alpha1
kind: AWSNodeTemplate
metadata:
  name: default
spec:
  subnetSelector:
    karpenter.sh/discovery: my-cluster
  securityGroupSelector:
    karpenter.sh/discovery: my-cluster
  tags:
    Environment: production
```

## Cost Savings Analysis

### Calculate Savings

```bash
# On-demand cost
ON_DEMAND_NODES=10
ON_DEMAND_PRICE=0.096  # m5.large hourly
ON_DEMAND_MONTHLY=$((ON_DEMAND_NODES * ON_DEMAND_PRICE * 730))
# ~$700/month

# Spot cost (70% discount)
SPOT_PRICE=0.029
SPOT_MONTHLY=$((ON_DEMAND_NODES * SPOT_PRICE * 730))
# ~$210/month

# Savings: ~$490/month per 10 nodes
```

### Monitor Interruption Rate

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: spot-alerts
spec:
  groups:
    - name: spot
      rules:
        - alert: HighSpotInterruptionRate
          expr: |
            rate(kube_pod_deletion_timestamp{node=~".*spot.*"}[1h]) > 0.1
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: "High spot instance interruption rate"
```

## Best Practices

1. **Diversify instance types** - More types = better availability
2. **Use multiple AZs** - Spread across zones
3. **Set appropriate replicas** - More replicas = more resilience
4. **Implement graceful shutdown** - Handle SIGTERM properly
5. **Use PDBs** - Prevent cascading failures
6. **Don't use for databases** - Keep stateful workloads on-demand
7. **Monitor interruptions** - Track and optimize
8. **Test interruption handling** - Chaos engineering

## Fallback Strategy

```yaml
# Deployment with fallback to on-demand
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-service
spec:
  replicas: 6
  template:
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: critical-service
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: lifecycle
                    operator: In
                    values: [spot]
            - weight: 1
              preference:
                matchExpressions:
                  - key: lifecycle
                    operator: In
                    values: [on-demand]
      tolerations:
        - key: spot
          value: "true"
          effect: NoSchedule
```

---

Spot instances can cut your Kubernetes costs by 60-90%. The key is designing for interruption: use multiple replicas, handle graceful shutdown, and keep stateful workloads on-demand. Start with non-critical workloads, prove the pattern works, then expand.
