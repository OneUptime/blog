# How to Create EKS Cluster with Managed Node Groups in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, EKS, Kubernetes, Infrastructure as Code

Description: Step-by-step guide to creating an Amazon EKS cluster with managed node groups using Terraform, including VPC setup, IAM roles, scaling configuration, and launch templates.

---

Running Kubernetes on AWS means running EKS. And if you want your worker nodes managed by AWS - patched, updated, and drained gracefully during upgrades - managed node groups are the way to go. They handle the EC2 lifecycle so you can focus on your workloads instead of babysitting instances.

This guide walks through building a production-ready EKS cluster with managed node groups in Terraform. We will cover the VPC, IAM roles, the cluster itself, node groups with different instance types, and launch template customization.

## Prerequisites

You need the AWS provider configured and a VPC with subnets ready. If you are starting from scratch, we will build the VPC as part of this setup.

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Building the VPC

EKS needs subnets across at least two availability zones. The subnets also need specific tags so the AWS load balancer controller can discover them.

```hcl
# Create the VPC for our EKS cluster
resource "aws_vpc" "eks" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "eks-vpc"
  }
}

# Public subnets for load balancers
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.eks.id
  cidr_block        = cidrsubnet(aws_vpc.eks.cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name                                        = "eks-public-${count.index}"
    "kubernetes.io/role/elb"                     = "1"  # Tag for public LBs
    "kubernetes.io/cluster/my-cluster"           = "shared"
  }
}

# Private subnets for worker nodes
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.eks.id
  cidr_block        = cidrsubnet(aws_vpc.eks.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name                                        = "eks-private-${count.index}"
    "kubernetes.io/role/internal-elb"            = "1"  # Tag for internal LBs
    "kubernetes.io/cluster/my-cluster"           = "shared"
  }
}

# Get available AZs
data "aws_availability_zones" "available" {
  state = "available"
}

# Internet gateway for public subnets
resource "aws_internet_gateway" "eks" {
  vpc_id = aws_vpc.eks.id

  tags = {
    Name = "eks-igw"
  }
}

# NAT gateway so private subnets can reach the internet
resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "eks" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "eks-nat"
  }
}

# Route tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.eks.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.eks.id
  }

  tags = {
    Name = "eks-public-rt"
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.eks.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.eks.id
  }

  tags = {
    Name = "eks-private-rt"
  }
}

# Associate subnets with route tables
resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
```

## EKS Cluster IAM Role

The EKS control plane needs an IAM role to manage AWS resources on your behalf.

```hcl
# IAM role for the EKS cluster control plane
resource "aws_iam_role" "cluster" {
  name = "eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })
}

# Attach the required EKS policies
resource "aws_iam_role_policy_attachment" "cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.cluster.name
}

resource "aws_iam_role_policy_attachment" "cluster_vpc_controller" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  role       = aws_iam_role.cluster.name
}
```

## Creating the EKS Cluster

Now for the cluster itself. We will enable logging and configure the endpoint access.

```hcl
# The EKS cluster
resource "aws_eks_cluster" "main" {
  name     = "my-cluster"
  version  = "1.29"
  role_arn = aws_iam_role.cluster.arn

  vpc_config {
    subnet_ids              = concat(aws_subnet.public[*].id, aws_subnet.private[*].id)
    endpoint_private_access = true   # Allow access from within VPC
    endpoint_public_access  = true   # Allow access from internet (restrict in production)
    security_group_ids      = [aws_security_group.cluster.id]
  }

  # Enable control plane logging
  enabled_cluster_log_types = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]

  depends_on = [
    aws_iam_role_policy_attachment.cluster_policy,
    aws_iam_role_policy_attachment.cluster_vpc_controller,
  ]

  tags = {
    Environment = "production"
  }
}

# Security group for the cluster
resource "aws_security_group" "cluster" {
  name_prefix = "eks-cluster-"
  vpc_id      = aws_vpc.eks.id

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "eks-cluster-sg"
  }
}
```

## Node Group IAM Role

Worker nodes need their own IAM role with policies for pulling container images, joining the cluster, and optionally using the VPC CNI plugin.

```hcl
# IAM role for the managed node groups
resource "aws_iam_role" "node_group" {
  name = "eks-node-group-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# Worker nodes need these three policies at minimum
resource "aws_iam_role_policy_attachment" "node_worker" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.node_group.name
}

resource "aws_iam_role_policy_attachment" "node_cni" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.node_group.name
}

resource "aws_iam_role_policy_attachment" "node_ecr" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.node_group.name
}
```

## Managed Node Groups

Here is where it gets interesting. You can have multiple node groups optimized for different workload types.

```hcl
# General purpose node group for most workloads
resource "aws_eks_node_group" "general" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "general"
  node_role_arn   = aws_iam_role.node_group.arn
  subnet_ids      = aws_subnet.private[*].id

  instance_types = ["t3.medium"]
  capacity_type  = "ON_DEMAND"  # Use SPOT for cost savings on non-critical workloads

  scaling_config {
    desired_size = 2
    max_size     = 5
    min_size     = 1
  }

  update_config {
    max_unavailable = 1  # Only drain one node at a time during updates
  }

  labels = {
    role = "general"
  }

  depends_on = [
    aws_iam_role_policy_attachment.node_worker,
    aws_iam_role_policy_attachment.node_cni,
    aws_iam_role_policy_attachment.node_ecr,
  ]

  tags = {
    Environment = "production"
  }
}

# CPU-optimized node group for compute-heavy workloads
resource "aws_eks_node_group" "compute" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "compute"
  node_role_arn   = aws_iam_role.node_group.arn
  subnet_ids      = aws_subnet.private[*].id

  instance_types = ["c5.xlarge", "c5a.xlarge"]  # Multiple types for better availability
  capacity_type  = "SPOT"  # Save money with spot instances

  scaling_config {
    desired_size = 0   # Scale from zero - the cluster autoscaler will add nodes when needed
    max_size     = 10
    min_size     = 0
  }

  update_config {
    max_unavailable_percentage = 33  # Allow up to 33% of nodes to be unavailable during updates
  }

  labels = {
    role = "compute"
  }

  # Taint so only workloads that tolerate this taint get scheduled here
  taint {
    key    = "dedicated"
    value  = "compute"
    effect = "NO_SCHEDULE"
  }

  depends_on = [
    aws_iam_role_policy_attachment.node_worker,
    aws_iam_role_policy_attachment.node_cni,
    aws_iam_role_policy_attachment.node_ecr,
  ]
}
```

## Custom Launch Template

For more control over the node configuration - custom AMIs, additional storage, user data scripts - use a launch template.

```hcl
# Custom launch template for nodes that need extra configuration
resource "aws_launch_template" "custom_nodes" {
  name_prefix = "eks-custom-"

  # Use the EKS-optimized AMI
  image_id = data.aws_ssm_parameter.eks_ami.value

  # Add extra storage for container images
  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size           = 100     # 100 GB root volume
      volume_type           = "gp3"
      iops                  = 3000
      throughput            = 125
      encrypted             = true
      delete_on_termination = true
    }
  }

  # Instance metadata settings (IMDSv2 required)
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # Enforce IMDSv2
    http_put_response_hop_limit = 2           # Needed for containerized workloads
  }

  # Bootstrap script to configure the node
  user_data = base64encode(<<-EOF
    #!/bin/bash
    /etc/eks/bootstrap.sh my-cluster \
      --kubelet-extra-args '--max-pods=110 --node-labels=custom=true'
  EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "eks-custom-node"
    }
  }
}

# Look up the latest EKS-optimized AMI
data "aws_ssm_parameter" "eks_ami" {
  name = "/aws/service/eks/optimized-ami/1.29/amazon-linux-2/recommended/image_id"
}

# Node group using the launch template
resource "aws_eks_node_group" "custom" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "custom"
  node_role_arn   = aws_iam_role.node_group.arn
  subnet_ids      = aws_subnet.private[*].id

  # Reference the launch template instead of specifying instance types directly
  launch_template {
    id      = aws_launch_template.custom_nodes.id
    version = aws_launch_template.custom_nodes.latest_version
  }

  scaling_config {
    desired_size = 2
    max_size     = 8
    min_size     = 1
  }

  # Force a new node group version when the launch template changes
  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_iam_role_policy_attachment.node_worker,
    aws_iam_role_policy_attachment.node_cni,
    aws_iam_role_policy_attachment.node_ecr,
  ]
}
```

## Configuring kubectl Access

After the cluster is up, you need to configure kubectl. You can add an output to get the command.

```hcl
output "configure_kubectl" {
  value = "aws eks update-kubeconfig --region us-east-1 --name ${aws_eks_cluster.main.name}"
}

output "cluster_endpoint" {
  value = aws_eks_cluster.main.endpoint
}

output "cluster_certificate_authority" {
  value = aws_eks_cluster.main.certificate_authority[0].data
}
```

## Installing the Cluster Autoscaler

Managed node groups work great with the Kubernetes Cluster Autoscaler. Add an IAM policy so it can modify the ASG behind your node groups.

```hcl
# Policy that allows the Cluster Autoscaler to scale node groups
resource "aws_iam_policy" "cluster_autoscaler" {
  name = "eks-cluster-autoscaler"

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
          "autoscaling:SetDesiredCapacity",
          "autoscaling:TerminateInstanceInAutoScalingGroup",
          "ec2:DescribeLaunchTemplateVersions",
          "ec2:DescribeInstanceTypes",
          "eks:DescribeNodegroup"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cluster_autoscaler" {
  policy_arn = aws_iam_policy.cluster_autoscaler.arn
  role       = aws_iam_role.node_group.name
}
```

## Common Patterns and Tips

A few things I have learned from running EKS in production:

**Use multiple instance types in spot node groups.** If you only specify one instance type, you are competing with everyone else for that type when capacity gets tight. Listing three or four similar types gives the spot fleet more options.

**Always set `max_unavailable` in `update_config`.** Without it, EKS might try to drain all your nodes at once during an AMI update, which will bring your services down.

**Tag your node groups for the Cluster Autoscaler.** The autoscaler needs `k8s.io/cluster-autoscaler/enabled` and `k8s.io/cluster-autoscaler/<cluster-name>` tags to discover your node groups. Managed node groups add these automatically when you use the autoscaler annotations.

**Put worker nodes in private subnets.** They do not need public IPs. Use a NAT gateway so they can pull images and reach AWS APIs.

**Consider separate node groups for system components.** Running CoreDNS, kube-proxy, and the metrics server on dedicated nodes keeps them isolated from your application workloads.

## Wrapping Up

Managed node groups take most of the operational pain out of running EKS worker nodes. AWS handles the AMI updates, instance provisioning, and graceful draining during upgrades. Combined with Terraform, you get a reproducible, version-controlled cluster setup that you can spin up in any region.

The pattern above gives you a solid foundation: a VPC with proper subnets and routing, an EKS cluster with control plane logging, multiple node groups for different workload types, and the IAM plumbing to make it all work. From here, you can layer on IRSA for pod-level IAM, add-ons like the AWS Load Balancer Controller, and monitoring with Container Insights.

For more on configuring IAM at the pod level, check out our guide on [configuring EKS IRSA in Terraform](https://oneuptime.com/blog/post/2026-02-23-configure-eks-irsa-terraform/view).
