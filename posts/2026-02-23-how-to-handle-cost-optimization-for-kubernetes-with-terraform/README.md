# How to Handle Cost Optimization for Kubernetes with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Cost Optimization, EKS, Node Groups, Auto Scaling

Description: Learn how to optimize Kubernetes cluster costs with Terraform by right-sizing node groups, using spot instances, implementing Karpenter, and managing namespaces.

---

Kubernetes clusters are powerful but can become expensive quickly if not managed carefully. Between node compute costs, persistent storage, load balancers, and data transfer, a Kubernetes cluster can easily become the largest line item on your cloud bill. Terraform gives you the ability to define cost-optimized cluster configurations as code, ensuring every environment runs efficiently.

This guide covers practical Terraform configurations for reducing Kubernetes costs on AWS EKS, though the principles apply to other managed Kubernetes services as well.

## Right-Sizing Node Groups

The most common source of Kubernetes cost waste is over-provisioned node groups. Teams often use large instance types with low utilization.

```hcl
# EKS cluster definition
resource "aws_eks_cluster" "main" {
  name     = "app-cluster-${var.environment}"
  role_arn = aws_iam_role.cluster.arn
  version  = "1.28"

  vpc_config {
    subnet_ids              = var.private_subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = var.environment != "production"
  }

  tags = {
    Environment = var.environment
    CostCenter  = var.cost_center
  }
}

# Cost-optimized node group for general workloads
resource "aws_eks_node_group" "general" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "general-${var.environment}"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.private_subnet_ids

  # Use smaller instances with better bin-packing
  instance_types = var.environment == "production" ? [
    "m6i.xlarge", "m6a.xlarge", "m5.xlarge"
  ] : [
    "t3.medium", "t3a.medium"
  ]

  # Use AL2023 for better performance per dollar
  ami_type = "AL2023_x86_64_STANDARD"

  scaling_config {
    desired_size = var.environment == "production" ? 3 : 1
    min_size     = var.environment == "production" ? 2 : 1
    max_size     = var.environment == "production" ? 10 : 3
  }

  # Enable capacity type for cost savings
  capacity_type = var.environment == "production" ? "ON_DEMAND" : "SPOT"

  labels = {
    workload-type = "general"
    environment   = var.environment
  }

  tags = {
    Environment = var.environment
    NodeGroup   = "general"
  }
}
```

## Using Spot Instances for Non-Critical Workloads

Spot instances can save 60-90% compared to on-demand pricing. Create dedicated spot node groups for fault-tolerant workloads.

```hcl
# Spot instance node group for batch and non-critical workloads
resource "aws_eks_node_group" "spot" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "spot-workers"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.private_subnet_ids

  # Diversify across many instance types for better spot availability
  instance_types = [
    "m5.large", "m5a.large", "m5d.large",
    "m6i.large", "m6a.large",
    "c5.large", "c5a.large",
    "r5.large", "r5a.large",
  ]

  capacity_type = "SPOT"

  scaling_config {
    desired_size = 2
    min_size     = 0
    max_size     = 10
  }

  # Taint spot nodes so only tolerant workloads schedule on them
  taint {
    key    = "spot"
    value  = "true"
    effect = "NO_SCHEDULE"
  }

  labels = {
    "node-type"    = "spot"
    "workload-type" = "batch"
  }

  tags = {
    Environment  = var.environment
    InstanceType = "spot"
    CostSaving   = "spot-instances"
  }
}

# Mixed instance policy for production with spot diversification
resource "aws_launch_template" "mixed" {
  name_prefix = "eks-mixed-"

  tag_specifications {
    resource_type = "instance"
    tags = {
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
```

## Implementing Karpenter for Intelligent Scaling

Karpenter provides more efficient node scaling than the Cluster Autoscaler by choosing the right instance type for each pod's requirements.

```hcl
# Karpenter controller IAM role
resource "aws_iam_role" "karpenter" {
  name = "karpenter-controller-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.eks.arn
      }
      Condition = {
        StringEquals = {
          "${replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")}:sub" = "system:serviceaccount:karpenter:karpenter"
        }
      }
    }]
  })
}

# Karpenter node IAM role
resource "aws_iam_role" "karpenter_node" {
  name = "karpenter-node-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

# Install Karpenter via Helm
resource "helm_release" "karpenter" {
  namespace        = "karpenter"
  create_namespace = true
  name             = "karpenter"
  repository       = "oci://public.ecr.aws/karpenter"
  chart            = "karpenter"
  version          = "v0.33.0"

  set {
    name  = "settings.clusterName"
    value = aws_eks_cluster.main.name
  }

  set {
    name  = "settings.clusterEndpoint"
    value = aws_eks_cluster.main.endpoint
  }

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = aws_iam_role.karpenter.arn
  }
}

# Karpenter NodePool for cost-optimized provisioning
resource "kubectl_manifest" "karpenter_nodepool" {
  yaml_body = yamlencode({
    apiVersion = "karpenter.sh/v1beta1"
    kind       = "NodePool"
    metadata = {
      name = "cost-optimized"
    }
    spec = {
      template = {
        spec = {
          requirements = [
            {
              key      = "karpenter.sh/capacity-type"
              operator = "In"
              values   = ["spot", "on-demand"]
            },
            {
              key      = "node.kubernetes.io/instance-type"
              operator = "In"
              values   = [
                "m5.large", "m5a.large", "m6i.large",
                "c5.large", "c5a.large", "c6i.large",
                "r5.large", "r5a.large", "r6i.large",
              ]
            }
          ]
          nodeClassRef = {
            name = "default"
          }
        }
      }
      limits = {
        cpu    = "100"
        memory = "400Gi"
      }
      disruption = {
        # Consolidate nodes to reduce waste
        consolidationPolicy = "WhenUnderutilized"
        # Replace nodes after 7 days
        expireAfter = "168h"
      }
    }
  })
}
```

## Resource Quotas and Limit Ranges

Prevent teams from over-requesting resources by setting quotas and limits at the namespace level.

```hcl
# Namespace with resource quotas
resource "kubernetes_namespace" "team" {
  for_each = var.team_namespaces

  metadata {
    name = each.key
    labels = {
      team        = each.value.team
      environment = var.environment
    }
  }
}

# Resource quotas per team namespace
resource "kubernetes_resource_quota" "team" {
  for_each = var.team_namespaces

  metadata {
    name      = "${each.key}-quota"
    namespace = kubernetes_namespace.team[each.key].metadata[0].name
  }

  spec {
    hard = {
      "requests.cpu"    = each.value.cpu_request_limit
      "requests.memory" = each.value.memory_request_limit
      "limits.cpu"      = each.value.cpu_limit
      "limits.memory"   = each.value.memory_limit
      "pods"            = each.value.max_pods
      "services.loadbalancers" = each.value.max_load_balancers
    }
  }
}

# Limit ranges to set default resource requests
resource "kubernetes_limit_range" "team" {
  for_each = var.team_namespaces

  metadata {
    name      = "${each.key}-limits"
    namespace = kubernetes_namespace.team[each.key].metadata[0].name
  }

  spec {
    limit {
      type = "Container"
      default = {
        cpu    = "500m"
        memory = "512Mi"
      }
      default_request = {
        cpu    = "100m"
        memory = "128Mi"
      }
      max = {
        cpu    = "2"
        memory = "4Gi"
      }
    }
  }
}
```

## Monitoring Kubernetes Costs

Deploy monitoring to track costs at the pod and namespace level.

```hcl
# Deploy Kubecost for Kubernetes cost visibility
resource "helm_release" "kubecost" {
  name             = "kubecost"
  namespace        = "kubecost"
  create_namespace = true
  repository       = "https://kubecost.github.io/cost-analyzer/"
  chart            = "cost-analyzer"

  set {
    name  = "kubecostToken"
    value = var.kubecost_token
  }

  set {
    name  = "prometheus.server.retention"
    value = "15d"
  }

  # Use existing Prometheus if available
  set {
    name  = "prometheus.server.enabled"
    value = var.use_existing_prometheus ? "false" : "true"
  }
}
```

## Best Practices

Use namespace-level resource quotas to prevent individual teams from consuming more than their share of cluster resources. Implement pod disruption budgets alongside spot instances to ensure application availability during node interruptions. Run the Cluster Autoscaler or Karpenter with aggressive scale-down settings for non-production clusters.

For additional cost management approaches, see our guides on [monitoring cloud spend with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-monitor-cloud-spend-with-terraform/view) and [creating cost alerts for serverless with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cost-alerts-for-serverless-with-terraform/view).

## Conclusion

Kubernetes cost optimization requires attention at multiple layers: cluster configuration, node group sizing, instance purchasing strategy, and workload resource management. Terraform lets you codify all of these decisions, making them reviewable, repeatable, and consistent across environments. Start with the highest-impact changes like spot instances and right-sized node groups, then implement more sophisticated strategies like Karpenter and namespace quotas. The combination of infrastructure-as-code discipline with Kubernetes-native cost tools creates a powerful framework for keeping cluster costs under control.
