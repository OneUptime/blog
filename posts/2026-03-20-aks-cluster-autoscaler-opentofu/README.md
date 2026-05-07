# How to Configure AKS Cluster Autoscaler with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, AKS, Cluster Autoscaler, Auto Scaling, Cost Optimization, Infrastructure as Code

Description: Learn how to configure AKS Cluster Autoscaler with OpenTofu to automatically scale node pools based on pod scheduling demand, reducing costs while maintaining application availability.

## Introduction

The AKS Cluster Autoscaler automatically adjusts the number of nodes in a node pool based on pending pods (scale out) and underutilized nodes (scale in). When pods can't be scheduled due to insufficient resources, the autoscaler adds nodes. When nodes are underutilized for a configurable period, the autoscaler removes them to reduce costs. Autoscaler profiles allow fine-tuning scale-down aggressiveness and evaluation intervals.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials with AKS permissions
- A virtual network and subnets for the AKS node pools

## Step 1: Enable Cluster Autoscaler on AKS

```hcl
resource "azurerm_kubernetes_cluster" "autoscaled" {
  name                = "${var.project_name}-aks"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.project_name
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                 = "system"
    vm_size              = "Standard_D4s_v3"
    node_count           = 3
    min_count            = 3
    max_count            = 10
    auto_scaling_enabled = true  # Enable Cluster Autoscaler on this pool

    vnet_subnet_id = var.subnet_id
    zones          = ["1", "2", "3"]

    upgrade_settings {
      max_surge = "33%"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  # Cluster Autoscaler profile
  auto_scaler_profile {
    # Scale-down settings
    scale_down_delay_after_add       = "10m"   # Wait 10 min after scale-out before scale-in
    scale_down_unneeded              = "10m"   # Node must be unneeded for 10 min before removal
    scale_down_utilization_threshold = 0.5     # Scale in if node utilization < 50%
    scale_down_unready               = "20m"   # Wait 20 min for unready nodes before removal

    # Node termination settings
    max_graceful_termination_sec = 600  # 10 min to drain pods before terminating node

    # Evaluation settings
    scan_interval = "10s"  # How often to check for scaling opportunities

    # Skip nodes with system pods (safer)
    skip_nodes_with_system_pods = true

    # Allow scale-down even when pods use EmptyDir or HostPath
    skip_nodes_with_local_storage = false

    # Balance similar node pools
    balance_similar_node_groups  = true
    expander                     = "least-waste"  # random, most-pods, least-waste, priority

    # Provisioning settings
    max_node_provision_time = "15m"  # Max time to wait for node to become ready

    new_pod_scale_up_delay = "0s"  # Delay before scaling up for new pods

    # Empty bulk delete limit
    empty_bulk_delete_max = 10
  }

  network_profile {
    network_plugin    = "azure"
    load_balancer_sku = "standard"
  }

  tags = {
    Name = "${var.project_name}-aks-autoscale"
  }
}
```

## Step 2: User Node Pool with Autoscaling

```hcl
resource "azurerm_kubernetes_cluster_node_pool" "app" {
  name                  = "app"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.autoscaled.id
  vm_size               = "Standard_D4s_v3"

  # Autoscaling bounds
  auto_scaling_enabled = true
  min_count           = 2
  max_count           = 50

  # Initial count within bounds
  node_count = 5

  vnet_subnet_id = var.app_subnet_id
  zones          = ["1", "2", "3"]
  max_pods       = 30

  node_labels = {
    "workload-type" = "application"
  }

  upgrade_settings {
    max_surge = "33%"
  }
}

# Scale-to-zero pool for batch workloads

resource "azurerm_kubernetes_cluster_node_pool" "batch" {
  name                  = "batch"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.autoscaled.id
  vm_size               = "Standard_D8s_v3"

  auto_scaling_enabled = true
  min_count           = 0  # Scale to zero when no batch jobs
  max_count           = 20

  node_count = 0  # Start at zero

  node_labels = {
    "workload-type" = "batch"
  }

  node_taints = ["batch=true:NoSchedule"]  # Only batch pods schedule here
}
```

## Step 3: Kubernetes Resources to Trigger Autoscaling

```yaml
# kubernetes/workload.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 10
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
        - name: api
          image: myapp:latest
          resources:
            requests:
              cpu: "500m"      # Resource requests drive autoscaling decisions
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
      nodeSelector:
        workload-type: application
---
# Scale batch pool from zero with a batch job
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processing
spec:
  completions: 5
  parallelism: 5
  template:
    spec:
      tolerations:
        - key: "batch"
          operator: "Equal"
          value: "true"
          effect: "NoSchedule"
      nodeSelector:
        workload-type: batch
      containers:
        - name: processor
          image: processor:latest
          resources:
            requests:
              cpu: "2000m"
              memory: "4Gi"
      restartPolicy: Never
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply
kubectl apply -f kubernetes/workload.yaml

# Check autoscaler status and warnings
kubectl get configmap -n kube-system cluster-autoscaler-status -o yaml
kubectl get events --field-selector source=cluster-autoscaler,type=Warning

# Check pending pods (these trigger scale-out)
kubectl get pods -A --field-selector=status.phase=Pending

# Force scale-out by increasing replicas
kubectl scale deployment api-server --replicas=100

# Monitor node scaling
kubectl get nodes -w
```

## Conclusion

Resource `requests` in pod specs are what the Cluster Autoscaler uses to determine if a node can fit pending pods. Pods without requests look like they need zero resources and won't trigger autoscaling. If you split zonal capacity across one node pool per zone, `balance_similar_node_groups = true` helps keep those similar pools balanced during scale-out. The `expander = "least-waste"` setting is the most cost-efficient: it picks the node type that wastes the least CPU/memory when adding a new node. Set `scale_down_delay_after_add` to longer than your typical pod startup time to avoid immediately scaling in nodes that were just added for a traffic spike.
