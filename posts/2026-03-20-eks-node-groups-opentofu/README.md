# How to Create EKS Node Groups with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EKS, Kubernetes, Node Groups, Terraform, Infrastructure as Code

Description: Learn how to create and configure Amazon EKS managed node groups with OpenTofu, including instance types, scaling configuration, launch templates, and IAM roles.

---

Amazon EKS managed node groups simplify Kubernetes worker node management by handling provisioning, updates, and lifecycle events. This guide covers creating EKS clusters and managed node groups with OpenTofu.

---

## EKS Cluster

```hcl
# cluster.tf

resource "aws_eks_cluster" "main" {
  name     = "production"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.35"

  vpc_config {
    subnet_ids              = concat(data.aws_subnets.private.ids, data.aws_subnets.public.ids)
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = ["0.0.0.0/0"]
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator"]

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy
  ]
}
```

---

## IAM Roles

```hcl
# iam.tf
resource "aws_iam_role" "eks_cluster" {
  name = "eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  role       = aws_iam_role.eks_cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_iam_role" "node_group" {
  name = "eks-node-group-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "node_policies" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPullOnly"
  ])

  role       = aws_iam_role.node_group.name
  policy_arn = each.value
}
```

---

## Basic Managed Node Group

```hcl
# node_groups.tf
resource "aws_eks_node_group" "general" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "general"
  node_role_arn   = aws_iam_role.node_group.arn
  subnet_ids      = data.aws_subnets.private.ids

  instance_types = ["t3.medium"]
  ami_type       = "AL2023_x86_64_STANDARD"
  capacity_type  = "ON_DEMAND"
  disk_size      = 50

  scaling_config {
    desired_size = 2
    min_size     = 1
    max_size     = 10
  }

  update_config {
    max_unavailable = 1
  }

  labels = {
    role        = "general"
    environment = "production"
  }

  tags = {
    ManagedBy = "opentofu"
  }

  depends_on = [aws_iam_role_policy_attachment.node_policies]
}
```

---

## Spot Instance Node Group

```hcl
resource "aws_eks_node_group" "spot" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "spot-workers"
  node_role_arn   = aws_iam_role.node_group.arn
  subnet_ids      = data.aws_subnets.private.ids

  instance_types = ["t3.medium", "t3.large", "t3a.medium"]
  capacity_type  = "SPOT"

  scaling_config {
    desired_size = 3
    min_size     = 0
    max_size     = 20
  }

  labels = {
    capacity = "spot"
  }

  taint {
    key    = "spot"
    value  = "true"
    effect = "NO_SCHEDULE"
  }
}
```

---

## Node Group with Launch Template

```hcl
resource "aws_launch_template" "eks_node" {
  name_prefix = "eks-node-"

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 100
      volume_type           = "gp3"
      iops                  = 3000
      throughput            = 125
      encrypted             = true
      delete_on_termination = true
    }
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # IMDSv2
    http_put_response_hop_limit = 2
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "eks-node"
      Environment = "production"
    }
  }
}

resource "aws_eks_node_group" "custom" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "custom"
  node_role_arn   = aws_iam_role.node_group.arn
  subnet_ids      = data.aws_subnets.private.ids
  instance_types  = ["m5.xlarge"]

  launch_template {
    id      = aws_launch_template.eks_node.id
    version = aws_launch_template.eks_node.latest_version
  }

  scaling_config {
    desired_size = 3
    min_size     = 1
    max_size     = 15
  }
}
```

---

## Multiple Node Groups

```hcl
# variables.tf
variable "node_groups" {
  default = {
    "system" = {
      instance_types = ["t3.medium"]
      desired        = 2
      min            = 1
      max            = 5
      capacity_type  = "ON_DEMAND"
    }
    "workers" = {
      instance_types = ["t3.large", "t3a.large"]
      desired        = 4
      min            = 2
      max            = 20
      capacity_type  = "SPOT"
    }
  }
}

resource "aws_eks_node_group" "groups" {
  for_each = var.node_groups

  cluster_name    = aws_eks_cluster.main.name
  node_group_name = each.key
  node_role_arn   = aws_iam_role.node_group.arn
  subnet_ids      = data.aws_subnets.private.ids
  instance_types  = each.value.instance_types
  capacity_type   = each.value.capacity_type

  scaling_config {
    desired_size = each.value.desired
    min_size     = each.value.min
    max_size     = each.value.max
  }
}
```

---

## Configure kubectl Access

```bash
aws eks update-kubeconfig --name production --region us-east-1

# Verify nodes
kubectl get nodes -o wide

# Check node labels
kubectl get nodes --show-labels
```

---

## Best Practices

1. **Use private subnets** for node groups and restrict public API endpoint access where possible
2. **Enable IMDSv2** via launch template for improved security
3. **Mix On-Demand and Spot** - on-demand for system workloads, spot for batch/workers
4. **Configure cluster autoscaler** to manage desired_size automatically
5. **Pin EKS version** and test upgrades in staging before production

---

## Conclusion

EKS managed node groups with OpenTofu provide a reproducible, version-controlled approach to Kubernetes infrastructure. Use spot instances for cost optimization, launch templates for custom configurations, and node group labels/taints to schedule workloads appropriately.

---

*Monitor your Kubernetes cluster and workloads with [OneUptime](https://oneuptime.com).*
