# How to Set Up EKS Cluster Autoscaler with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EKS, Cluster Autoscaler, Auto Scaling, Kubernetes, Infrastructure as Code

Description: Learn how to deploy and configure the Kubernetes Cluster Autoscaler on EKS using OpenTofu to automatically scale node groups based on pending pod resource requests.

## Introduction

The Kubernetes Cluster Autoscaler automatically adjusts the number of nodes in a cluster when pods cannot be scheduled due to insufficient resources or when nodes are underutilized. On EKS, it integrates with Auto Scaling Groups to scale managed node groups up and down.

## Prerequisites

- OpenTofu v1.6+
- An existing EKS cluster with managed node groups and an IAM OIDC provider associated with the cluster
- Helm provider configured
- A Cluster Autoscaler chart version that matches your EKS cluster's Kubernetes minor version

## Step 1: Create IRSA Role for Cluster Autoscaler

```hcl
# IAM role allowing the Cluster Autoscaler to manage Auto Scaling Groups

resource "aws_iam_role" "cluster_autoscaler" {
  name = "${var.cluster_name}-cluster-autoscaler"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRoleWithWebIdentity"
      Principal = {
        Federated = aws_iam_openid_connect_provider.cluster.arn
      }
      Condition = {
        StringEquals = {
          "${local.oidc_provider}:sub" = "system:serviceaccount:kube-system:cluster-autoscaler"
          "${local.oidc_provider}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })
}

# Policy granting autoscaler permission to read and modify ASGs
resource "aws_iam_role_policy" "cluster_autoscaler" {
  name = "cluster-autoscaler-policy"
  role = aws_iam_role.cluster_autoscaler.id

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
            "aws:ResourceTag/k8s.io/cluster-autoscaler/enabled"             = "true"
            "aws:ResourceTag/k8s.io/cluster-autoscaler/${var.cluster_name}" = "owned"
          }
        }
      }
    ]
  })
}
```

## Step 2: Tag Node Group ASGs for Discovery

For EKS managed node groups, apply the discovery tags to the underlying Auto Scaling Groups, because tags on the `aws_eks_node_group` resource don't propagate to those ASGs.

```hcl
# Create the managed node group
resource "aws_eks_node_group" "app" {
  cluster_name    = var.cluster_name
  node_group_name = "app"
  node_role_arn   = var.node_role_arn
  subnet_ids      = var.private_subnet_ids

  instance_types = ["m5.xlarge"]

  scaling_config {
    desired_size = 3
    min_size     = 2
    max_size     = 20
  }

  lifecycle {
    # Allow Cluster Autoscaler to change desired size without OpenTofu reverting it.
    ignore_changes = [scaling_config[0].desired_size]
  }
}

# Add required tags to the underlying ASG for autoscaler discovery
resource "aws_autoscaling_group_tag" "cluster_autoscaler_enabled" {
  for_each = toset([
    for asg in flatten([
      for node_group_resource in aws_eks_node_group.app.resources : node_group_resource.autoscaling_groups
    ]) : asg.name
  ])

  autoscaling_group_name = each.value

  tag {
    key                 = "k8s.io/cluster-autoscaler/enabled"
    value               = "true"
    propagate_at_launch = false
  }
}

resource "aws_autoscaling_group_tag" "cluster_autoscaler_cluster" {
  for_each = toset([
    for asg in flatten([
      for node_group_resource in aws_eks_node_group.app.resources : node_group_resource.autoscaling_groups
    ]) : asg.name
  ])

  autoscaling_group_name = each.value

  tag {
    key                 = "k8s.io/cluster-autoscaler/${var.cluster_name}"
    value               = "owned"
    propagate_at_launch = false
  }
}
```

## Step 3: Deploy Cluster Autoscaler via Helm

```hcl
# Deploy Cluster Autoscaler using the official Helm chart
resource "helm_release" "cluster_autoscaler" {
  name       = "cluster-autoscaler"
  repository = "https://kubernetes.github.io/autoscaler"
  chart      = "cluster-autoscaler"
  namespace  = "kube-system"
  # Chart 9.37.0 deploys Cluster Autoscaler v1.30.0.
  version    = "9.37.0"

  set {
    name  = "autoDiscovery.clusterName"
    value = var.cluster_name
  }

  set {
    name  = "awsRegion"
    value = var.region
  }

  set {
    name  = "rbac.serviceAccount.name"
    value = "cluster-autoscaler"
  }

  set {
    name  = "rbac.serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = aws_iam_role.cluster_autoscaler.arn
  }

  # Prevent autoscaler from scaling down nodes too quickly
  set {
    name  = "extraArgs.scale-down-delay-after-add"
    value = "10m"
  }

  set {
    name  = "extraArgs.scale-down-unneeded-time"
    value = "10m"
  }

  depends_on = [
    aws_autoscaling_group_tag.cluster_autoscaler_enabled,
    aws_autoscaling_group_tag.cluster_autoscaler_cluster
  ]
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify autoscaler is running
kubectl -n kube-system get pods -l app.kubernetes.io/instance=cluster-autoscaler
kubectl -n kube-system logs -l app.kubernetes.io/instance=cluster-autoscaler --tail=50
```

## Conclusion

The Cluster Autoscaler automatically adjusts node group capacity to meet pod scheduling demands. The `scale-down` parameters prevent aggressive node removal that could cause unnecessary pod churn. For faster scale-out and better interruption handling, consider Karpenter as a more modern alternative that provisions nodes based on pod requirements without requiring pre-configured node groups.
