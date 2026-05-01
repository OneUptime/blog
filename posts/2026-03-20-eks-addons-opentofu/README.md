# How to Configure EKS Add-Ons with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EKS, Add-on, Kubernetes, VPC CNI, CoreDNS, Infrastructure as Code

Description: Learn how to install and manage EKS managed add-ons including VPC CNI, CoreDNS, kube-proxy, and EBS CSI Driver using OpenTofu for automated lifecycle management.

## Introduction

EKS managed add-ons are AWS-maintained Kubernetes operational software components that integrate with the EKS cluster. AWS handles version management, patching, and compatibility testing. This guide covers installing the most commonly required add-ons.

## Prerequisites

- OpenTofu v1.6+
- An existing EKS cluster with node groups
- An IAM OIDC provider configured for the cluster if you use IAM roles for add-ons

## Step 1: Install VPC CNI Add-On

```hcl
# VPC CNI enables pods to get VPC IP addresses

# Required for pod-to-pod and pod-to-service networking
resource "aws_eks_addon" "vpc_cni" {
  cluster_name                = var.cluster_name
  addon_name                  = "vpc-cni"
  addon_version               = data.aws_eks_addon_version.vpc_cni.version
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"

  # Associate with a service account role when using IRSA
  service_account_role_arn = aws_iam_role.vpc_cni.arn

  configuration_values = jsonencode({
    env = {
      # Enable prefix delegation for higher pod density
      ENABLE_PREFIX_DELEGATION = "true"
      WARM_PREFIX_TARGET       = "1"
    }
  })

  tags = { Name = "vpc-cni-addon" }
}

data "aws_eks_cluster" "cluster" {
  name = var.cluster_name
}

data "aws_iam_openid_connect_provider" "cluster" {
  url = data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer
}

resource "aws_iam_role" "vpc_cni" {
  name = "${var.cluster_name}-vpc-cni-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = data.aws_iam_openid_connect_provider.cluster.arn
      }
      Condition = {
        StringEquals = {
          "${replace(data.aws_iam_openid_connect_provider.cluster.url, "https://", "")}:aud" = "sts.amazonaws.com"
          "${replace(data.aws_iam_openid_connect_provider.cluster.url, "https://", "")}:sub" = "system:serviceaccount:kube-system:aws-node"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "vpc_cni" {
  role       = aws_iam_role.vpc_cni.name
  # For IPv4 clusters. Use an IPv6 CNI policy for IPv6 clusters.
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

# Look up the latest compatible version for the cluster
data "aws_eks_addon_version" "vpc_cni" {
  addon_name         = "vpc-cni"
  kubernetes_version = var.kubernetes_version
  most_recent        = true
}
```

## Step 2: Install CoreDNS Add-On

```hcl
# CoreDNS provides service discovery via DNS within the cluster
resource "aws_eks_addon" "coredns" {
  cluster_name                = var.cluster_name
  addon_name                  = "coredns"
  addon_version               = data.aws_eks_addon_version.coredns.version
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"

  tags = { Name = "coredns-addon" }
}

data "aws_eks_addon_version" "coredns" {
  addon_name         = "coredns"
  kubernetes_version = var.kubernetes_version
  most_recent        = true
}
```

## Step 3: Install kube-proxy Add-On

```hcl
# kube-proxy maintains network rules for pod communication
resource "aws_eks_addon" "kube_proxy" {
  cluster_name                = var.cluster_name
  addon_name                  = "kube-proxy"
  addon_version               = data.aws_eks_addon_version.kube_proxy.version
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"

  tags = { Name = "kube-proxy-addon" }
}

data "aws_eks_addon_version" "kube_proxy" {
  addon_name         = "kube-proxy"
  kubernetes_version = var.kubernetes_version
  most_recent        = true
}
```

## Step 4: Install EBS CSI Driver Add-On

```hcl
# EBS CSI driver enables dynamic provisioning of EBS volumes as PVCs
resource "aws_eks_addon" "ebs_csi" {
  cluster_name                = var.cluster_name
  addon_name                  = "aws-ebs-csi-driver"
  addon_version               = data.aws_eks_addon_version.ebs_csi.version
  service_account_role_arn    = aws_iam_role.ebs_csi.arn
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"

  tags = { Name = "ebs-csi-addon" }
}

# Look up the latest compatible version for the cluster
data "aws_eks_addon_version" "ebs_csi" {
  addon_name         = "aws-ebs-csi-driver"
  kubernetes_version = var.kubernetes_version
  most_recent        = true
}

# IAM role for the EBS CSI driver when using IRSA
resource "aws_iam_role" "ebs_csi" {
  name = "${var.cluster_name}-ebs-csi-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = data.aws_iam_openid_connect_provider.cluster.arn
      }
      Condition = {
        StringEquals = {
          "${replace(data.aws_iam_openid_connect_provider.cluster.url, "https://", "")}:aud" = "sts.amazonaws.com"
          "${replace(data.aws_iam_openid_connect_provider.cluster.url, "https://", "")}:sub" = "system:serviceaccount:kube-system:ebs-csi-controller-sa"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ebs_csi" {
  role       = aws_iam_role.ebs_csi.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicyV2"
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify add-on status
aws eks describe-addon --cluster-name my-cluster --addon-name vpc-cni
```

## Conclusion

EKS managed add-ons simplify operational overhead by automating version compatibility and patching. Use `resolve_conflicts_on_create = "OVERWRITE"` when replacing self-managed add-ons with EKS managed add-ons. For ongoing updates, `resolve_conflicts_on_update = "OVERWRITE"` enforces the configuration declared in OpenTofu, while `"PRESERVE"` keeps existing custom settings and `"NONE"` may cause the update to fail if there are conflicts. Monitor add-on health via the EKS console or `aws eks describe-addon` to ensure critical networking components are operational.
