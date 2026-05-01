# How to Configure EKS Private Clusters with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EKS, Private Cluster, VPC Endpoints, Security, Infrastructure as Code, Kubernetes

Description: Learn how to create a fully private EKS cluster with private API endpoint access using OpenTofu, requiring VPC endpoints for AWS service connectivity without internet access.

## Introduction

A private EKS cluster can expose only a private endpoint for the Kubernetes API server, meaning communication between your nodes and the API server stays within your VPC and any `kubectl` access must come from within the VPC or a connected network. This is useful for high-security environments and eliminates internet exposure of the control plane endpoint.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with EKS, VPC, and EC2 permissions
- AWS CLI v2.12.3+ or v1.27.160+
- A VPC with `enableDnsSupport` and `enableDnsHostnames` enabled, plus private subnets in at least two Availability Zones
- kubectl with the ability to connect via VPC (bastion, VPN, or Direct Connect)

## Step 1: Create a Private EKS Cluster

```hcl
resource "aws_eks_cluster" "private" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster.arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids = var.private_subnet_ids

    # Disable public endpoint - API only accessible within VPC
    endpoint_public_access  = false
    endpoint_private_access = true
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator"]

  tags = {
    Name    = var.cluster_name
    Private = "true"
  }
}
```

## Step 2: Create the VPC Endpoints Your Private Cluster Needs

For clusters with no outbound internet access, create the endpoints your nodes, admin hosts, and workloads use.

```hcl
# Security group for VPC endpoints

resource "aws_security_group" "vpc_endpoints" {
  name        = "${var.cluster_name}-vpc-endpoints-sg"
  description = "Security group for VPC endpoints"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
}

# S3 Gateway endpoint (free, no security group needed)
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = var.private_route_table_ids
}

# Amazon EKS endpoint for aws eks update-kubeconfig and other EKS API calls
resource "aws_vpc_endpoint" "eks" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.eks"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

# ECR API endpoint for pulling images
resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

# EC2 endpoint for node and VPC CNI API calls
resource "aws_vpc_endpoint" "ec2" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.ec2"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

# CloudWatch Logs endpoint if nodes or Pods ship logs to CloudWatch
resource "aws_vpc_endpoint" "cloudwatch_logs" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.logs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

# STS endpoint if workloads use IAM roles for service accounts (IRSA)
resource "aws_vpc_endpoint" "sts" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.sts"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

# EKS Auth endpoint if workloads use EKS Pod Identity
resource "aws_vpc_endpoint" "eks_auth" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.eks-auth"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}
```

If you use IRSA, configure your SDKs to use the regional STS endpoint so they can use the STS VPC endpoint.

## Step 3: kubectl Access via a Bastion Host and EC2 Instance Connect Endpoint

Ensure the cluster security group allows inbound TCP/443 from the bastion host or connected network before you disable public endpoint access.

```hcl
# Bastion for kubectl access when Direct Connect or VPN is not available
resource "aws_security_group" "instance_connect_endpoint" {
  name        = "${var.cluster_name}-eice-sg"
  description = "Security group for EC2 Instance Connect Endpoint"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
}

resource "aws_security_group" "bastion" {
  name        = "${var.cluster_name}-bastion-sg"
  description = "Security group for the private EKS bastion"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "bastion" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  subnet_id     = var.private_subnet_ids[0]

  # No public IP - access via Instance Connect Endpoint
  associate_public_ip_address = false
  vpc_security_group_ids      = [aws_security_group.bastion.id]

  iam_instance_profile = aws_iam_instance_profile.bastion.name

  # Use an AMI that already includes kubectl, AWS CLI, and EC2 Instance Connect,
  # or install them via an internal package mirror.
  tags = { Name = "eks-private-bastion" }
}

resource "aws_ec2_instance_connect_endpoint" "bastion" {
  subnet_id          = var.private_subnet_ids[0]
  security_group_ids = [aws_security_group.instance_connect_endpoint.id]
  preserve_client_ip = false

  tags = { Name = "eks-private-bastion-eice" }
}
```

Connect to the bastion with `aws ec2-instance-connect ssh --instance-id <instance-id> --os-user ec2-user --connection-type eice`, then run `aws eks update-kubeconfig --region <region> --name <cluster-name>` from the bastion.

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

A private EKS cluster with VPC endpoints reduces internet exposure by keeping Kubernetes API traffic inside your VPC or a connected network. For clusters without outbound internet access, the common endpoints are Amazon EKS, EC2, ECR API, ECR DKR, and S3; add STS for IRSA, EKS Auth for Pod Identity, and CloudWatch Logs if your nodes or Pods ship logs there. Access kubectl via a bastion, AWS Systems Manager Session Manager, Direct Connect, or VPN to administer the private cluster.
