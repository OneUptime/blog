# How to Use Spot Node Pools on EKS, GKE, and AKS for Cost Savings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, AWS, GCP, Azure, Cost Optimization

Description: Learn how to configure and manage spot instance node pools on EKS, GKE, and AKS to reduce Kubernetes infrastructure costs by up to 90 percent.

---

Spot instances offer significant cost savings over on-demand instances, typically 60-90 percent less expensive. Cloud providers sell unused compute capacity at discounted rates with the caveat that they can reclaim instances with little notice. For fault-tolerant Kubernetes workloads, spot instances are an excellent way to reduce infrastructure costs.

This guide shows you how to set up spot node pools on Amazon EKS, Google GKE, and Azure AKS, and how to handle interruptions gracefully.

## Understanding Spot Instance Behavior

Spot instances work differently on each cloud:

**AWS Spot Instances** - Can be interrupted with 2 minutes notice when AWS needs capacity. You receive interruption notices via EC2 metadata and EventBridge events.

**GCP Preemptible VMs** - Run for maximum 24 hours and can be preempted with 30 seconds notice. Preemption notifications come through metadata server.

**Azure Spot VMs** - Can be evicted when Azure needs capacity or when your max price is exceeded. You get eviction notices through Azure metadata service.

All three support graceful shutdown workflows, but you must design applications to tolerate interruptions.

## Creating Spot Node Pools on EKS

EKS supports spot instances through managed node groups. Create a spot node group using eksctl:

```yaml
# spot-nodegroup.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: my-cluster
  region: us-east-1

managedNodeGroups:
  - name: spot-nodes
    instanceTypes:
      - t3.medium
      - t3a.medium
      - t2.medium
    capacityType: SPOT
    minSize: 2
    maxSize: 10
    desiredCapacity: 3
    labels:
      workload-type: batch
      capacity-type: spot
    taints:
      - key: spot
        value: "true"
        effect: NoSchedule
    tags:
      nodegroup-type: spot
```

Create the node group:

```bash
eksctl create nodegroup --config-file=spot-nodegroup.yaml
```

Using multiple instance types increases availability. EKS automatically picks the best spot price across the types you specify.

For Terraform:

```hcl
# spot-nodegroup.tf
resource "aws_eks_node_group" "spot" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "spot-nodes"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = aws_subnet.private[*].id

  capacity_type = "SPOT"

  scaling_config {
    desired_size = 3
    max_size     = 10
    min_size     = 2
  }

  instance_types = ["t3.medium", "t3a.medium", "t2.medium"]

  labels = {
    "capacity-type" = "spot"
    "workload-type" = "batch"
  }

  taint {
    key    = "spot"
    value  = "true"
    effect = "NO_SCHEDULE"
  }

  tags = {
    Name = "spot-node-group"
  }
}
```

## Handling Spot Interruptions on EKS

Install AWS Node Termination Handler to handle spot interruptions:

```bash
# Install using Helm
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-node-termination-handler \
  --namespace kube-system \
  eks/aws-node-termination-handler \
  --set enableSpotInterruptionDraining=true \
  --set enableScheduledEventDraining=true
```

The termination handler watches for spot interruption notices and cordons/drains nodes before termination. It gives pods time to shut down gracefully.

Schedule workloads on spot nodes using tolerations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-processor
spec:
  replicas: 5
  selector:
    matchLabels:
      app: batch-processor
  template:
    metadata:
      labels:
        app: batch-processor
    spec:
      # Tolerate spot node taint
      tolerations:
      - key: spot
        operator: Equal
        value: "true"
        effect: NoSchedule

      # Prefer spot nodes but allow on-demand
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: capacity-type
                operator: In
                values:
                - spot

      containers:
      - name: processor
        image: myapp:latest
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
```

## Creating Spot Node Pools on GKE

GKE supports preemptible VMs in node pools. Create a preemptible node pool:

```bash
# Create preemptible node pool
gcloud container node-pools create spot-pool \
  --cluster=my-cluster \
  --zone=us-central1-a \
  --spot \
  --num-nodes=3 \
  --min-nodes=1 \
  --max-nodes=10 \
  --enable-autoscaling \
  --machine-type=n1-standard-2 \
  --disk-size=50 \
  --node-labels=workload-type=batch,capacity-type=spot \
  --node-taints=spot=true:NoSchedule
```

The `--spot` flag creates a spot VM node pool. GKE also supports the older `--preemptible` flag, but spot VMs are the recommended option.

Using Terraform:

```hcl
# gke-spot-pool.tf
resource "google_container_node_pool" "spot_pool" {
  name       = "spot-pool"
  cluster    = google_container_cluster.primary.name
  location   = "us-central1-a"

  autoscaling {
    min_node_count = 1
    max_node_count = 10
  }

  initial_node_count = 3

  node_config {
    spot         = true
    machine_type = "n1-standard-2"
    disk_size_gb = 50

    labels = {
      workload-type = "batch"
      capacity-type = "spot"
    }

    taint {
      key    = "spot"
      value  = "true"
      effect = "NO_SCHEDULE"
    }

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}
```

## Handling Preemptions on GKE

GKE automatically handles preemption notices and drains nodes. However, you should use Pod Disruption Budgets to ensure availability:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: batch-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: batch-processor
```

This ensures at least 2 pods remain available during node drains.

Deploy workloads to spot nodes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-job
spec:
  replicas: 8
  selector:
    matchLabels:
      app: batch-job
  template:
    metadata:
      labels:
        app: batch-job
    spec:
      tolerations:
      - key: spot
        operator: Equal
        value: "true"
        effect: NoSchedule

      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: capacity-type
                operator: In
                values:
                - spot

      containers:
      - name: worker
        image: worker:v1
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
```

## Creating Spot Node Pools on AKS

AKS supports Azure Spot VMs in node pools. Create a spot node pool:

```bash
# Create spot node pool
az aks nodepool add \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name spotpool \
  --priority Spot \
  --eviction-policy Delete \
  --spot-max-price -1 \
  --enable-cluster-autoscaler \
  --min-count 1 \
  --max-count 10 \
  --node-count 3 \
  --node-vm-size Standard_D2s_v3 \
  --labels workload-type=batch capacity-type=spot \
  --node-taints spot=true:NoSchedule
```

The `--spot-max-price -1` setting means you pay up to the current on-demand price, preventing evictions due to price.

Using Terraform:

```hcl
# aks-spot-pool.tf
resource "azurerm_kubernetes_cluster_node_pool" "spot" {
  name                  = "spotpool"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size              = "Standard_D2s_v3"

  priority        = "Spot"
  eviction_policy = "Delete"
  spot_max_price  = -1

  enable_auto_scaling = true
  min_count          = 1
  max_count          = 10
  node_count         = 3

  node_labels = {
    "workload-type" = "batch"
    "capacity-type" = "spot"
  }

  node_taints = [
    "spot=true:NoSchedule"
  ]

  tags = {
    Environment = "production"
    NodeType    = "spot"
  }
}
```

## Handling Evictions on AKS

Install the Azure Spot Eviction Handler to process eviction notices:

```bash
# Install using kubectl
kubectl apply -f https://raw.githubusercontent.com/Azure/kubernetes-spot-eviction-handler/main/deployment.yaml
```

Schedule workloads on spot nodes with tolerations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-processor
spec:
  replicas: 6
  selector:
    matchLabels:
      app: data-processor
  template:
    metadata:
      labels:
        app: data-processor
    spec:
      tolerations:
      - key: spot
        operator: Equal
        value: "true"
        effect: NoSchedule

      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: capacity-type
                operator: In
                values:
                - spot

      containers:
      - name: processor
        image: processor:v2
        resources:
          requests:
            cpu: "1"
            memory: "2Gi"
```

## Best Practices for Spot Workloads

Use spot instances for workloads that can tolerate interruptions:

**Good candidates:**
- Batch processing jobs
- CI/CD build agents
- Machine learning training
- Data processing pipelines
- Stateless web services with multiple replicas

**Bad candidates:**
- Databases
- Stateful applications without replication
- Single-replica critical services
- Long-running tasks that cannot checkpoint

Always use Pod Disruption Budgets:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-pdb
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: web
```

Mix spot and on-demand nodes for critical services:

```yaml
# Critical service with mixed capacity
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchLabels:
          app: critical-service
      topologyKey: kubernetes.io/hostname
  nodeAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 50
      preference:
        matchExpressions:
        - key: capacity-type
          operator: In
          values:
          - on-demand
    - weight: 50
      preference:
        matchExpressions:
        - key: capacity-type
          operator: In
          values:
          - spot
```

## Monitoring Spot Instance Costs

Track cost savings using cloud cost management tools:

```bash
# AWS Cost Explorer
aws ce get-cost-and-usage \
  --time-period Start=2026-02-01,End=2026-02-09 \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=INSTANCE_TYPE

# GCP billing export to BigQuery
bq query --use_legacy_sql=false \
"SELECT
  service.description,
  sku.description,
  SUM(cost) as total_cost
FROM \`project.dataset.gcp_billing_export\`
WHERE usage_start_time >= '2026-02-01'
  AND sku.description LIKE '%Spot%'
GROUP BY service.description, sku.description"

# Azure Cost Management
az consumption usage list \
  --start-date 2026-02-01 \
  --end-date 2026-02-09 \
  --query "[?contains(instanceName, 'spot')]"
```

## Conclusion

Spot instance node pools dramatically reduce Kubernetes infrastructure costs while maintaining application availability when configured correctly. Each cloud provider offers similar capabilities with different implementation details.

The keys to success are choosing appropriate workloads, using multiple instance types for better availability, implementing graceful shutdown handlers, and mixing spot and on-demand capacity for critical services. With proper configuration, you can achieve 60-90 percent cost savings on compute without sacrificing reliability.
