# How to Configure EKS Managed Node Groups with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EKS, Managed Node Groups, Kubernetes, Infrastructure as Code, Auto Scaling

Description: Learn how to create EKS Managed Node Groups with custom instance types, scaling policies, and launch template overrides using OpenTofu.

## Introduction

EKS Managed Node Groups automate the provisioning and lifecycle management of EC2 nodes in your EKS cluster. AWS handles node draining and replacement, and manages node updates when you update the node group, while you retain control over instance types, scaling, and configuration via launch templates.

## Prerequisites

- OpenTofu v1.6+
- An existing EKS cluster
- AWS credentials with EKS, EC2, and IAM permissions

## Step 1: Create the Node Group IAM Role

```hcl
resource "aws_iam_role" "node_group" {
  name = "${var.cluster_name}-node-group-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

# Base policies for EKS worker nodes in a simple IPv4 setup

resource "aws_iam_role_policy_attachment" "worker_node" {
  role       = aws_iam_role.node_group.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "ecr_pull_only" {
  role       = aws_iam_role.node_group.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPullOnly"
}

resource "aws_iam_role_policy_attachment" "cni_policy" {
  role       = aws_iam_role.node_group.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

# Optional: allow Session Manager access to the nodes.
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.node_group.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
```

## Step 2: Create a Launch Template for Nodes

```hcl
resource "aws_launch_template" "nodes" {
  name_prefix = "${var.cluster_name}-node-"

  # Enforce IMDSv2 for security
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2  # Allow pods to access IMDS
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 50
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name    = "${var.cluster_name}-node"
      Cluster = var.cluster_name
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Step 3: Create Managed Node Groups

```hcl
# General-purpose node group for system workloads
resource "aws_eks_node_group" "general" {
  cluster_name    = var.cluster_name
  node_group_name = "general"
  node_role_arn   = aws_iam_role.node_group.arn
  subnet_ids      = var.private_subnet_ids

  instance_types = ["m5.xlarge", "m5a.xlarge", "m5n.xlarge"]

  scaling_config {
    desired_size = 3
    min_size     = 2
    max_size     = 10
  }

  update_config {
    max_unavailable_percentage = 25  # Allow 25% of nodes to be unavailable during update
  }

  launch_template {
    id      = aws_launch_template.nodes.id
    version = aws_launch_template.nodes.latest_version
  }

  labels = {
    role        = "general"
    environment = var.environment
  }

  tags = {
    Name = "${var.cluster_name}-general-ng"
  }

  depends_on = [
    aws_iam_role_policy_attachment.worker_node,
    aws_iam_role_policy_attachment.cni_policy,
    aws_iam_role_policy_attachment.ecr_pull_only,
  ]
}

# Spot node group for cost-optimized batch workloads
resource "aws_eks_node_group" "spot" {
  cluster_name    = var.cluster_name
  node_group_name = "spot"
  node_role_arn   = aws_iam_role.node_group.arn
  subnet_ids      = var.private_subnet_ids

  instance_types = ["m5.2xlarge", "m5a.2xlarge", "m4.2xlarge", "m5n.2xlarge"]
  capacity_type  = "SPOT"

  scaling_config {
    desired_size = 2
    min_size     = 0
    max_size     = 20
  }

  update_config {
    max_unavailable = 1
  }

  taint {
    key    = "spot"
    value  = "true"
    effect = "NO_SCHEDULE"
  }

  labels = {
    role         = "spot"
    "spot-node"  = "true"
  }

  tags = {
    Name = "${var.cluster_name}-spot-ng"
  }

  depends_on = [
    aws_iam_role_policy_attachment.worker_node,
    aws_iam_role_policy_attachment.cni_policy,
    aws_iam_role_policy_attachment.ecr_pull_only,
  ]
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

EKS Managed Node Groups simplify worker node management while giving you flexibility in instance types, scaling policies, and custom configurations via launch templates. Use multiple node groups to separate concerns: On-Demand nodes for system-critical workloads and Spot nodes for batch jobs and dev environments. Kubernetes taints and labels ensure workloads are scheduled on appropriate node types.
