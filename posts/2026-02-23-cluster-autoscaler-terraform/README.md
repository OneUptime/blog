# How to Deploy Cluster Autoscaler with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Cluster Autoscaler, EKS, GKE, Scaling, DevOps

Description: Learn how to deploy Kubernetes Cluster Autoscaler with Terraform on EKS, GKE, and AKS, including IAM configuration, scaling policies, and priority-based expanders.

---

The Cluster Autoscaler automatically adjusts the number of nodes in your Kubernetes cluster based on pod scheduling needs. When pods cannot be scheduled because of insufficient resources, it adds nodes. When nodes are underutilized and their pods can be rescheduled elsewhere, it removes them. Deploying it through Terraform means the autoscaler is part of your infrastructure code, with proper IAM permissions and configuration baked in.

This guide covers deploying Cluster Autoscaler on the major cloud platforms.

## How Cluster Autoscaler Works

The autoscaler runs as a deployment in your cluster and performs two main functions:

1. **Scale up**: When a pod is in Pending state because no node has enough resources, the autoscaler provisions a new node in one of the configured node groups.

2. **Scale down**: When a node has been underutilized for a configurable period and its pods can be moved to other nodes, the autoscaler terminates it.

It does not look at CPU or memory utilization directly (that is what Horizontal Pod Autoscaler does). Instead, it responds to scheduling failures and node utilization at the node level.

## Cluster Autoscaler on EKS

EKS requires IAM permissions for the autoscaler to modify Auto Scaling Groups.

```hcl
# IAM policy for Cluster Autoscaler
resource "aws_iam_policy" "cluster_autoscaler" {
  name = "${var.cluster_name}-cluster-autoscaler"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "autoscaling:DescribeAutoScalingGroups",
          "autoscaling:DescribeAutoScalingInstances",
          "autoscaling:DescribeLaunchConfigurations",
          "autoscaling:DescribeScalingActivities",
          "autoscaling:DescribeTags",
          "ec2:DescribeImages",
          "ec2:DescribeInstanceTypes",
          "ec2:DescribeLaunchTemplateVersions",
          "ec2:GetInstanceTypesFromInstanceRequirements",
          "eks:DescribeNodegroup"
        ]
        Resource = ["*"]
      },
      {
        Effect = "Allow"
        Action = [
          "autoscaling:SetDesiredCapacity",
          "autoscaling:TerminateInstanceInAutoScalingGroup"
        ]
        Resource = ["*"]
        Condition = {
          StringEquals = {
            "aws:ResourceTag/k8s.io/cluster-autoscaler/${var.cluster_name}" = "owned"
          }
        }
      }
    ]
  })
}

# IRSA role for Cluster Autoscaler
module "cluster_autoscaler_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "5.33.0"

  role_name = "${var.cluster_name}-cluster-autoscaler"

  role_policy_arns = {
    policy = aws_iam_policy.cluster_autoscaler.arn
  }

  oidc_providers = {
    main = {
      provider_arn               = var.oidc_provider_arn
      namespace_service_accounts = ["kube-system:cluster-autoscaler"]
    }
  }
}

# Deploy Cluster Autoscaler
resource "helm_release" "cluster_autoscaler" {
  name       = "cluster-autoscaler"
  repository = "https://kubernetes.github.io/autoscaler"
  chart      = "cluster-autoscaler"
  namespace  = "kube-system"
  version    = "9.35.0"

  values = [
    yamlencode({
      autoDiscovery = {
        # Discover node groups by cluster tag
        clusterName = var.cluster_name
      }

      awsRegion = var.aws_region

      rbac = {
        serviceAccount = {
          create = true
          name   = "cluster-autoscaler"
          annotations = {
            "eks.amazonaws.com/role-arn" = module.cluster_autoscaler_irsa.iam_role_arn
          }
        }
      }

      # Scaling behavior configuration
      extraArgs = {
        # How long to wait before scaling down an underutilized node
        "scale-down-delay-after-add"    = "10m"
        "scale-down-delay-after-delete" = "0s"
        # Node utilization threshold for scale down
        "scale-down-utilization-threshold" = "0.5"
        # Skip nodes with local storage
        "skip-nodes-with-local-storage" = "false"
        # Skip nodes with system pods
        "skip-nodes-with-system-pods" = "true"
        # Maximum time to wait for a node to be ready
        "max-node-provision-time" = "15m"
        # How often to re-evaluate the cluster
        "scan-interval" = "10s"
        # Expander strategy
        "expander" = "least-waste"
      }

      resources = {
        requests = {
          cpu    = "100m"
          memory = "128Mi"
        }
        limits = {
          memory = "256Mi"
        }
      }

      # Run on system nodes if you have dedicated node pools
      tolerations = [{
        key      = "CriticalAddonsOnly"
        operator = "Exists"
      }]

      # Prioritize running on system nodes
      nodeSelector = {
        "kubernetes.io/os" = "linux"
      }
    })
  ]
}
```

## Cluster Autoscaler on GKE

GKE has built-in cluster autoscaling, but you can also deploy the standalone autoscaler for more control.

```hcl
# GKE with built-in autoscaling (preferred approach)
resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.region

  # Enable cluster autoscaling at the cluster level
  cluster_autoscaling {
    enabled = true

    resource_limits {
      resource_type = "cpu"
      minimum       = 4
      maximum       = 100
    }

    resource_limits {
      resource_type = "memory"
      minimum       = 16
      maximum       = 400
    }

    auto_provisioning_defaults {
      service_account = google_service_account.nodes.email
      oauth_scopes = [
        "https://www.googleapis.com/auth/cloud-platform"
      ]
    }
  }
}

# Or configure per node pool
resource "google_container_node_pool" "general" {
  name       = "general"
  cluster    = google_container_cluster.primary.name
  location   = var.region

  # Node pool autoscaling
  autoscaling {
    min_node_count = 2
    max_node_count = 20
  }

  node_config {
    machine_type = "e2-standard-4"
    disk_size_gb = 100
  }
}
```

## Cluster Autoscaler on AKS

AKS also has built-in autoscaling per node pool.

```hcl
# AKS cluster with autoscaling
resource "azurerm_kubernetes_cluster" "cluster" {
  name                = var.cluster_name
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.cluster_name

  default_node_pool {
    name                = "default"
    vm_size             = "Standard_D4s_v3"
    enable_auto_scaling = true
    min_count           = 2
    max_count           = 20

    # Temporary name for OS disk
    os_disk_size_gb = 100
  }

  identity {
    type = "SystemAssigned"
  }

  auto_scaler_profile {
    # How long after adding a node before scale-down is considered
    scale_down_delay_after_add = "10m"
    # Utilization threshold for scale down
    scale_down_utilization_threshold = "0.5"
    # How long a node must be underutilized before removal
    scale_down_unneeded = "10m"
    # Maximum time to wait for a node to become ready
    max_node_provisioning_time = "15m"
    # How often the cluster is evaluated for scaling
    scan_interval = "10s"
    # Strategy for choosing which node group to expand
    expander = "least-waste"
  }
}
```

## Priority-Based Expander

When you have multiple node groups, the expander strategy determines which one gets new nodes. The priority expander lets you define preferences.

```hcl
# Create a priority expander config map
resource "kubernetes_config_map" "cluster_autoscaler_priority" {
  metadata {
    name      = "cluster-autoscaler-priority-expander"
    namespace = "kube-system"
  }

  data = {
    priorities = yamlencode({
      # Higher number = higher priority
      "100" = [
        # Prefer spot/preemptible instances
        ".*spot.*",
        ".*preemptible.*"
      ]
      "50" = [
        # Fall back to on-demand instances
        ".*on-demand.*",
        ".*standard.*"
      ]
      "10" = [
        # Last resort - larger instance types
        ".*large.*"
      ]
    })
  }
}

# Configure autoscaler to use priority expander
resource "helm_release" "cluster_autoscaler" {
  # ... base config ...

  values = [
    yamlencode({
      extraArgs = {
        "expander" = "priority"
      }
    })
  ]

  depends_on = [kubernetes_config_map.cluster_autoscaler_priority]
}
```

## Node Group Configuration for Autoscaling

Your EKS node groups need proper tags for auto-discovery.

```hcl
# EKS managed node group with autoscaler tags
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "19.21.0"

  cluster_name = var.cluster_name

  eks_managed_node_groups = {
    # General purpose nodes
    general = {
      instance_types = ["m5.xlarge"]
      min_size       = 2
      max_size       = 20
      desired_size   = 3

      labels = {
        "node-type" = "general"
      }

      # Tags for cluster autoscaler auto-discovery
      tags = {
        "k8s.io/cluster-autoscaler/enabled"             = "true"
        "k8s.io/cluster-autoscaler/${var.cluster_name}" = "owned"
      }
    }

    # Spot instances for cost savings
    spot = {
      instance_types = ["m5.xlarge", "m5.2xlarge", "m4.xlarge"]
      capacity_type  = "SPOT"
      min_size       = 0
      max_size       = 50
      desired_size   = 0

      labels = {
        "node-type" = "spot"
      }

      taints = [{
        key    = "spot"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]

      tags = {
        "k8s.io/cluster-autoscaler/enabled"             = "true"
        "k8s.io/cluster-autoscaler/${var.cluster_name}" = "owned"
      }
    }
  }
}
```

## Monitoring the Autoscaler

Keep tabs on scaling events with Prometheus metrics.

```hcl
# ServiceMonitor for Cluster Autoscaler metrics
resource "kubectl_manifest" "autoscaler_service_monitor" {
  yaml_body = <<YAML
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: aws-cluster-autoscaler
  endpoints:
    - port: http
      interval: 30s
YAML
}
```

Key metrics to watch:
- `cluster_autoscaler_scaled_up_nodes_total` - total scale-up events
- `cluster_autoscaler_scaled_down_nodes_total` - total scale-down events
- `cluster_autoscaler_unschedulable_pods_count` - pods waiting for nodes
- `cluster_autoscaler_nodes_count` - current node count by state

## Best Practices

- Set `scale-down-delay-after-add` to at least 10 minutes to prevent flapping
- Use the `least-waste` expander for cost optimization
- Set appropriate `min_size` on node groups to handle base load
- Tag nodes correctly for auto-discovery on EKS
- Use PodDisruptionBudgets on your workloads to control scale-down behavior
- Monitor autoscaler logs for scale-up failures
- Consider Karpenter as a faster, more flexible alternative on EKS
- Run the autoscaler on nodes that will not be scaled down (system nodes)

For more on scaling Kubernetes, check out our guide on [deploying Karpenter with Terraform](https://oneuptime.com/blog/post/2026-02-23-karpenter-terraform/view).
