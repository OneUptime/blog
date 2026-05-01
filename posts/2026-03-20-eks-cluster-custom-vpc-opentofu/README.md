# How to Create EKS Cluster with Custom VPC Using OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EKS, Kubernetes, VPC, Infrastructure as Code, Container Orchestration

Description: Learn how to create a production-grade EKS cluster with a custom VPC, private subnets, and proper subnet tagging using OpenTofu for Kubernetes workloads on AWS.

## Introduction

Creating an EKS cluster with a custom VPC gives you full control over networking, subnet sizing, and CIDR allocation. Proper subnet tagging is important for Kubernetes to discover subnets for load balancers. This guide covers a complete production-ready setup.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with EKS, EC2, and IAM permissions
- AWS CLI v2.12.3+ installed and configured
- `kubectl` installed

## Step 1: Create VPC with Required Subnet Tags

```hcl
data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

module "vpc" {
  source  = "registry.opentofu.org/terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.cluster_name}-vpc"
  cidr = "10.0.0.0/16"

  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = false
  one_nat_gateway_per_az = true  # One NAT per AZ for HA

  # Subnet tags for load balancer auto-discovery.
  # The cluster tag is retained for compatibility with older controllers.
  private_subnet_tags = {
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
    "kubernetes.io/role/internal-elb"           = "1"
  }

  public_subnet_tags = {
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
    "kubernetes.io/role/elb"                    = "1"
  }
}
```

## Step 2: Create the EKS IAM Role

```hcl
# IAM role for the EKS control plane

resource "aws_iam_role" "eks_cluster" {
  name = "${var.cluster_name}-cluster-role"

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
```

## Step 3: Create the EKS Cluster

```hcl
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster.arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = module.vpc.private_subnets
    endpoint_private_access = true
    endpoint_public_access  = true  # Set to false for fully private cluster

    # CIDR blocks allowed to access the public API endpoint
    public_access_cidrs = var.allowed_cidr_blocks
  }

  kubernetes_network_config {
    service_ipv4_cidr = "172.20.0.0/16"  # Kubernetes service CIDR
    ip_family         = "ipv4"
  }

  # Enable control plane logging
  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  depends_on = [aws_iam_role_policy_attachment.eks_cluster_policy]

  tags = {
    Name        = var.cluster_name
    Environment = var.environment
  }
}
```

## Step 4: Configure kubectl Access

```hcl
# Data source to get cluster authentication token
data "aws_eks_cluster_auth" "main" {
  name = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  value = aws_eks_cluster.main.endpoint
}

output "cluster_certificate" {
  value     = aws_eks_cluster.main.certificate_authority[0].data
  sensitive = true
}

output "configure_kubectl" {
  description = "Command to configure kubectl"
  value       = "aws eks update-kubeconfig --region ${var.region} --name ${var.cluster_name}"
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name my-cluster
kubectl get svc
```

## Conclusion

You have created a production-grade EKS cluster with a custom VPC in private subnets and subnet tags for Kubernetes load balancer discovery. The cluster has both private and public API endpoint access, control plane logging enabled, and a custom service CIDR. Add managed node groups or Fargate profiles in subsequent steps to run your workloads.
