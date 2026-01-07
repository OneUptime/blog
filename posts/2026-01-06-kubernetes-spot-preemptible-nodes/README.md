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

Using eksctl simplifies spot node group creation. Specifying multiple instance types increases availability by allowing AWS to choose from more capacity pools.

```bash
# Using eksctl to create a managed spot node group
# Multiple instance types increase spot availability
eksctl create nodegroup \
  --cluster my-cluster \
  --name spot-workers \
  --node-type m5.large,m5a.large,m4.large \  # Multiple types for better availability
  --nodes-min 0 \     # Allow scaling to zero when not needed
  --nodes-max 20 \    # Maximum nodes in the group
  --nodes 3 \         # Initial number of nodes
  --spot \            # Use spot instances
  --instance-types-filters "cpu-manufacturer=intel"  # Optional filter for consistency
```

### Terraform Configuration

This Terraform configuration creates an EKS managed node group with spot capacity. Labels and taints help control which workloads run on spot nodes.

```hcl
resource "aws_eks_node_group" "spot" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "spot-workers"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.subnet_ids

  # Use SPOT capacity type for cost savings
  capacity_type = "SPOT"

  # Multiple instance types - more types = better spot availability
  # AWS can pull from any of these pools
  instance_types = [
    "m5.large",
    "m5a.large",   # AMD variant, often more available
    "m5d.large",   # NVMe variant
    "m4.large"     # Previous generation, more capacity
  ]

  scaling_config {
    desired_size = 3
    max_size     = 20
    min_size     = 0   # Allow scaling to zero
  }

  # Label nodes for pod scheduling with nodeSelector
  labels = {
    lifecycle = "spot"
  }

  # Taint nodes to prevent workloads without tolerations from scheduling
  taint {
    key    = "spot"
    value  = "true"
    effect = "NO_SCHEDULE"
  }
}
```

### AWS Node Termination Handler

The Node Termination Handler gracefully drains nodes before spot interruption. This gives pods time to finish in-flight requests and reschedule elsewhere.

```bash
# Add the EKS Helm chart repository
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Install the termination handler with recommended settings
helm install aws-node-termination-handler eks/aws-node-termination-handler \
  --namespace kube-system \
  --set enableSpotInterruptionDraining=true \   # Handle spot interruptions
  --set enableRebalanceMonitoring=true \        # Handle rebalance recommendations
  --set enableScheduledEventDraining=true       # Handle scheduled maintenance
```

## GCP GKE Spot Setup

### Create Spot Node Pool

GCP Spot VMs replaced Preemptible VMs and offer similar pricing with better SLAs. This configuration creates an autoscaling spot node pool.

```bash
# Create a spot node pool with autoscaling
gcloud container node-pools create spot-pool \
  --cluster=my-cluster \
  --zone=us-central1-a \
  --machine-type=n1-standard-4 \
  --spot \                # Use spot VMs for cost savings
  --num-nodes=3 \         # Initial node count
  --min-nodes=0 \         # Allow scaling to zero
  --max-nodes=20 \        # Maximum nodes
  --enable-autoscaling \  # Enable cluster autoscaler
  --node-labels=cloud.google.com/gke-spot=true \  # Label for pod scheduling
  --node-taints=cloud.google.com/gke-spot=true:NoSchedule  # Taint for isolation
```

### Terraform Configuration

This Terraform configuration creates a GKE spot node pool with autoscaling and proper taints for workload isolation.

```hcl
resource "google_container_node_pool" "spot" {
  name       = "spot-pool"
  location   = var.zone
  cluster    = google_container_cluster.main.name

  # Configure autoscaling to handle variable demand
  autoscaling {
    min_node_count = 0   # Scale to zero when idle
    max_node_count = 20
  }

  node_config {
    machine_type = "n1-standard-4"
    spot         = true  # Use spot VMs for cost savings

    # Label for pod scheduling with nodeSelector
    labels = {
      "cloud.google.com/gke-spot" = "true"
    }

    # Taint to prevent non-spot-tolerant workloads from scheduling
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

Azure Spot VMs support multiple eviction policies. Delete policy removes the VM entirely, which is cleaner for Kubernetes autoscaling.

```bash
# Create a spot node pool with autoscaling
az aks nodepool add \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name spotnodepool \
  --priority Spot \           # Use spot priority for cost savings
  --eviction-policy Delete \  # Delete VMs on eviction (vs Deallocate)
  --spot-max-price -1 \       # -1 means pay up to on-demand price
  --node-vm-size Standard_DS2_v2 \
  --node-count 3 \
  --min-count 0 \             # Allow scaling to zero
  --max-count 20 \
  --enable-cluster-autoscaler \
  --labels kubernetes.azure.com/scalesetpriority=spot \  # Label for scheduling
  --node-taints kubernetes.azure.com/scalesetpriority=spot:NoSchedule
```

### Terraform Configuration

This Terraform configuration creates an AKS spot node pool with proper eviction policy and autoscaling settings.

```hcl
resource "azurerm_kubernetes_cluster_node_pool" "spot" {
  name                  = "spot"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size              = "Standard_DS2_v2"
  priority             = "Spot"      # Use spot priority
  eviction_policy      = "Delete"    # Delete VMs on eviction
  spot_max_price       = -1          # -1 = pay up to on-demand price

  # Configure autoscaling
  enable_auto_scaling = true
  min_count           = 0   # Scale to zero when idle
  max_count           = 20
  node_count          = 3   # Initial count

  # Label for pod scheduling
  node_labels = {
    "kubernetes.azure.com/scalesetpriority" = "spot"
  }

  # Taint to prevent non-tolerant workloads
  node_taints = [
    "kubernetes.azure.com/scalesetpriority=spot:NoSchedule"
  ]
}
```

## Scheduling Workloads on Spot Nodes

### Node Selector and Toleration

Use nodeSelector to target spot nodes and tolerations to allow scheduling on tainted nodes. Both are required for workloads to run on spot infrastructure.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spot-workload
spec:
  replicas: 5  # Multiple replicas for resilience during interruptions
  template:
    spec:
      # nodeSelector ensures pods only run on spot nodes
      nodeSelector:
        lifecycle: spot  # AWS label
        # or: cloud.google.com/gke-spot: "true"  # GCP
        # or: kubernetes.azure.com/scalesetpriority: spot  # Azure
      # tolerations allow scheduling on tainted spot nodes
      tolerations:
        - key: spot
          value: "true"
          effect: NoSchedule
      containers:
        - name: worker
          image: myapp/worker:latest
```

### Mixed On-Demand and Spot

Prefer spot nodes for cost savings but fall back to on-demand when spot capacity is unavailable. This ensures workloads always have somewhere to run.

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
          # Prefer spot nodes (weight 100) but allow on-demand (weight 1)
          preferredDuringSchedulingIgnoredDuringExecution:
            # High weight = strong preference for spot
            - weight: 100
              preference:
                matchExpressions:
                  - key: lifecycle
                    operator: In
                    values:
                      - spot
            # Low weight = fallback to on-demand if spot unavailable
            - weight: 1
              preference:
                matchExpressions:
                  - key: lifecycle
                    operator: In
                    values:
                      - on-demand
      # Must tolerate spot taints to schedule on spot nodes
      tolerations:
        - key: spot
          value: "true"
          effect: NoSchedule
```

## Handling Spot Interruptions

### Graceful Shutdown

Configure pods to handle SIGTERM gracefully. This allows time to complete in-flight requests and save state before termination.

```yaml
spec:
  # Allow up to 2 minutes for graceful shutdown
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
                # Wait for in-flight requests to complete
                sleep 90
```

### Pod Disruption Budgets

PDBs prevent too many pods from being terminated at once, maintaining service availability during spot interruptions.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: spot-workload-pdb
spec:
  # Ensure at least 80% of pods are always available
  # This limits how many can be evicted simultaneously
  minAvailable: 80%
  selector:
    matchLabels:
      app: spot-workload
```

### Anti-Affinity for High Availability

Spread pods across different nodes to prevent a single spot interruption from affecting multiple replicas.

```yaml
spec:
  affinity:
    podAntiAffinity:
      # Prefer spreading pods across different nodes
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchLabels:
                app: my-app
            # Spread across different hosts
            topologyKey: kubernetes.io/hostname
```

## Spot-Friendly Application Patterns

### Pattern 1: Queue-Based Processing

Queue-based processing is ideal for spot instances. If a worker is interrupted, the message returns to the queue and another worker processes it.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: queue-worker
spec:
  replicas: 10  # Scale based on queue depth
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
          # Worker pattern: pull message, process, delete
          # If interrupted mid-processing, message visibility timeout expires
          # and message becomes available for another worker
```

### Pattern 2: Checkpointing

For long-running jobs, implement checkpointing to save progress periodically. On restart, the job resumes from the last checkpoint rather than starting over.

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
              # Resume from checkpoint if it exists
              if [ -f /checkpoint/progress ]; then
                START=$(cat /checkpoint/progress)
              else
                START=0
              fi
              # Process data and save checkpoints periodically
              # This allows resuming after spot interruption
              ./process --start=$START --checkpoint-dir=/checkpoint
          volumeMounts:
            - name: checkpoint
              mountPath: /checkpoint
      volumes:
        # Persistent storage survives pod restart
        - name: checkpoint
          persistentVolumeClaim:
            claimName: checkpoint-pvc
```

### Pattern 3: Stateless Web Services

Stateless services work well on spot if you have enough replicas and proper health checks. The load balancer automatically routes around terminated pods.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 6  # More replicas = more resilience
  template:
    spec:
      nodeSelector:
        lifecycle: spot
      tolerations:
        - key: spot
          value: "true"
          effect: NoSchedule
      affinity:
        # Spread pods across nodes to avoid single-node failures
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: api
              topologyKey: kubernetes.io/hostname
      containers:
        - name: api
          image: api:latest
          # Readiness probe ensures traffic only goes to healthy pods
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
          # Connection draining - give time for load balancer to update
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 15"]
      # Allow time for graceful shutdown
      terminationGracePeriodSeconds: 30
```

## Cluster Autoscaler Configuration

### AWS

The priority expander tells the autoscaler to prefer spot node groups over on-demand, scaling spot first and only using on-demand when spot is unavailable.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  # Lower priority number = higher preference
  # Spot groups are tried first (priority 10)
  # On-demand is fallback (priority 50)
  priorities: |-
    10:
      - .*spot.*
    50:
      - .*on-demand.*
```

### Expander Configuration

Configure the cluster autoscaler to use the priority expander and handle spot nodes appropriately.

```bash
# Use priority expander to prefer spot over on-demand
cluster-autoscaler \
  --expander=priority \                    # Use priority-based node group selection
  --balance-similar-node-groups=true \     # Balance across similar groups
  --skip-nodes-with-local-storage=false    # Allow scaling down nodes with local storage
```

## Karpenter for AWS (Recommended)

Karpenter is more flexible than Cluster Autoscaler for spot:

Karpenter provides faster scaling and better spot instance handling. It provisions nodes based on pending pods rather than using fixed node groups.

```yaml
apiVersion: karpenter.sh/v1alpha5
kind: Provisioner
metadata:
  name: spot-provisioner
spec:
  requirements:
    # Only use spot capacity
    - key: karpenter.sh/capacity-type
      operator: In
      values: ["spot"]
    # Specify architecture
    - key: kubernetes.io/arch
      operator: In
      values: ["amd64"]
    # Multiple instance types for better availability
    - key: node.kubernetes.io/instance-type
      operator: In
      values:
        - m5.large
        - m5.xlarge
        - m5a.large
        - m5a.xlarge
        - m4.large
        - m4.xlarge
  # Limit total provisioned capacity
  limits:
    resources:
      cpu: 1000   # Maximum 1000 vCPUs across all nodes
  providerRef:
    name: default
  # Remove empty nodes after 60 seconds
  ttlSecondsAfterEmpty: 60

---
apiVersion: karpenter.k8s.aws/v1alpha1
kind: AWSNodeTemplate
metadata:
  name: default
spec:
  # Discover subnets and security groups by tags
  subnetSelector:
    karpenter.sh/discovery: my-cluster
  securityGroupSelector:
    karpenter.sh/discovery: my-cluster
  tags:
    Environment: production
```

## Cost Savings Analysis

### Calculate Savings

Use this formula to estimate your savings from spot instances. Actual savings vary based on instance type, region, and interruption rates.

```bash
# On-demand monthly cost calculation
ON_DEMAND_NODES=10
ON_DEMAND_PRICE=0.096  # m5.large hourly price in us-east-1
ON_DEMAND_MONTHLY=$((ON_DEMAND_NODES * ON_DEMAND_PRICE * 730))
# Result: ~$700/month

# Spot monthly cost (approximately 70% discount)
SPOT_PRICE=0.029  # Typical spot price for m5.large
SPOT_MONTHLY=$((ON_DEMAND_NODES * SPOT_PRICE * 730))
# Result: ~$210/month

# Monthly savings: ~$490/month per 10 nodes (~70% reduction)
```

### Monitor Interruption Rate

Track spot interruptions to understand your actual experience and adjust your architecture if interruptions are too frequent.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: spot-alerts
spec:
  groups:
    - name: spot
      rules:
        # Alert if spot interruption rate is too high
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

This deployment prefers spot nodes but falls back to on-demand, ensuring the service remains available even when spot capacity is limited.

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
      # Spread evenly across nodes to minimize blast radius
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
            # Strongly prefer spot nodes (weight 100)
            - weight: 100
              preference:
                matchExpressions:
                  - key: lifecycle
                    operator: In
                    values: [spot]
            # Fall back to on-demand if spot unavailable (weight 1)
            - weight: 1
              preference:
                matchExpressions:
                  - key: lifecycle
                    operator: In
                    values: [on-demand]
      # Tolerate spot taints to enable scheduling on spot nodes
      tolerations:
        - key: spot
          value: "true"
          effect: NoSchedule
```

---

Spot instances can cut your Kubernetes costs by 60-90%. The key is designing for interruption: use multiple replicas, handle graceful shutdown, and keep stateful workloads on-demand. Start with non-critical workloads, prove the pattern works, then expand.
