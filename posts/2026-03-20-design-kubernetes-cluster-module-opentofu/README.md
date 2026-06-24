# How to Design a Kubernetes Cluster Module for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, EKS, Kubernetes, AWS, Module

Description: Learn how to design a production-ready EKS Kubernetes cluster module for OpenTofu with managed node groups, IRSA support, and add-on management.

## Introduction

An EKS cluster module needs to handle the cluster itself, IAM roles for the control plane and nodes, managed node groups, and often OIDC outputs for later IRSA setup. A well-structured module makes it easy to deploy consistent Kubernetes clusters across environments.

## Module Structure

```text
modules/eks-cluster/
├── main.tf
├── node-groups.tf
├── variables.tf
└── outputs.tf
```

## variables.tf

```hcl
variable "cluster_name"    { type = string }
variable "cluster_version" {
  type    = string
  default = "1.35"
}
variable "environment"     { type = string }

variable "vpc_id"           { type = string }
variable "subnet_ids"       { type = list(string) }
variable "cluster_endpoint_public_access" {
  type    = bool
  default = true
}
variable "cluster_endpoint_private_access" {
  type    = bool
  default = true
}
variable "cluster_endpoint_public_access_cidrs" {
  type    = list(string)
  default = ["0.0.0.0/0"]
}

variable "node_groups" {
  type = map(object({
    instance_types = list(string)
    min_size       = number
    max_size       = number
    desired_size   = number
    disk_size      = number
    capacity_type  = string  # ON_DEMAND or SPOT
    labels         = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
  }))
  default = {
    "general" = {
      instance_types = ["t3.medium"]
      min_size       = 1
      max_size       = 5
      desired_size   = 2
      disk_size      = 50
      capacity_type  = "ON_DEMAND"
      labels         = {}
      taints         = []
    }
  }
}

variable "tags" {
  type    = map(string)
  default = {}
}
```

## main.tf (IAM and Cluster)

```hcl
# IAM role for EKS cluster control plane

resource "aws_iam_role" "cluster" {
  name = "${var.cluster_name}-cluster-role"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cluster_policies" {
  for_each   = toset(["arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"])
  role       = aws_iam_role.cluster.name
  policy_arn = each.key
}

resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = aws_iam_role.cluster.arn
  version  = var.cluster_version

  vpc_config {
    subnet_ids              = var.subnet_ids
    endpoint_public_access  = var.cluster_endpoint_public_access
    endpoint_private_access = var.cluster_endpoint_private_access
    public_access_cidrs     = var.cluster_endpoint_public_access_cidrs
  }

  tags       = merge({ Name = var.cluster_name, Environment = var.environment }, var.tags)
  depends_on = [aws_iam_role_policy_attachment.cluster_policies]
}
```

## node-groups.tf

```hcl
resource "aws_iam_role" "node" {
  name = "${var.cluster_name}-node-role"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "node_policies" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPullOnly",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
  ])
  role       = aws_iam_role.node.name
  policy_arn = each.key
}

resource "aws_eks_node_group" "groups" {
  for_each = var.node_groups

  cluster_name    = aws_eks_cluster.main.name
  node_group_name = each.key
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.subnet_ids
  instance_types  = each.value.instance_types
  disk_size       = each.value.disk_size
  capacity_type   = each.value.capacity_type
  labels          = each.value.labels

  scaling_config {
    min_size     = each.value.min_size
    max_size     = each.value.max_size
    desired_size = each.value.desired_size
  }

  dynamic "taint" {
    for_each = each.value.taints
    content {
      key    = taint.value.key
      value  = taint.value.value
      effect = taint.value.effect
    }
  }

  depends_on = [aws_iam_role_policy_attachment.node_policies]
}
```

## outputs.tf

```hcl
output "cluster_name"     { value = aws_eks_cluster.main.name }
output "cluster_endpoint" { value = aws_eks_cluster.main.endpoint }
output "cluster_ca_data"  { value = aws_eks_cluster.main.certificate_authority[0].data }
output "cluster_oidc_issuer" { value = aws_eks_cluster.main.identity[0].oidc[0].issuer }
output "node_role_arn"    { value = aws_iam_role.node.arn }
```

## Conclusion

This EKS module handles IAM roles for both the control plane and worker nodes, supports multiple node groups with different configurations, and exports the OIDC issuer URL needed for later IRSA setup. The node group `for_each` pattern makes it easy to have separate node groups for different workload types (general, spot).
