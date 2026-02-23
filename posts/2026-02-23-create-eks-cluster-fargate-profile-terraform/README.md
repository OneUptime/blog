# How to Create EKS Cluster with Fargate Profile in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, EKS, Fargate, Kubernetes, Serverless

Description: Learn how to create an Amazon EKS cluster with Fargate profiles using Terraform, eliminating the need to manage EC2 instances for your Kubernetes workloads.

---

If you like Kubernetes but hate managing nodes, EKS with Fargate is worth a serious look. Fargate runs each pod on its own isolated micro-VM. No EC2 instances to patch, no capacity planning, no autoscaler to configure. You define which pods should run on Fargate through profiles, and AWS handles the rest.

The tradeoff is that Fargate has some limitations - no DaemonSets, no privileged containers, no GPUs - but for many workloads, especially microservices and batch jobs, it is a great fit.

This guide covers setting up an EKS cluster that uses Fargate for application workloads and optionally a small managed node group for system components that cannot run on Fargate.

## Provider Setup

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

## VPC Configuration

Fargate pods run in your VPC and need private subnets with a NAT gateway. Fargate pods cannot run in public subnets - this is a hard requirement from AWS.

```hcl
resource "aws_vpc" "eks" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "eks-fargate-vpc"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Public subnets for the NAT gateway and load balancers
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.eks.id
  cidr_block        = cidrsubnet(aws_vpc.eks.cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name                                    = "eks-public-${count.index}"
    "kubernetes.io/role/elb"                = "1"
    "kubernetes.io/cluster/fargate-cluster" = "shared"
  }
}

# Private subnets - Fargate pods MUST run here
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.eks.id
  cidr_block        = cidrsubnet(aws_vpc.eks.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name                                    = "eks-private-${count.index}"
    "kubernetes.io/role/internal-elb"       = "1"
    "kubernetes.io/cluster/fargate-cluster" = "shared"
  }
}

# Internet gateway
resource "aws_internet_gateway" "eks" {
  vpc_id = aws_vpc.eks.id
}

# NAT gateway for private subnet internet access
resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "eks" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
}

# Route tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.eks.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.eks.id
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.eks.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.eks.id
  }
}

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

## EKS Cluster

```hcl
# Cluster IAM role
resource "aws_iam_role" "cluster" {
  name = "eks-fargate-cluster-role"

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

resource "aws_iam_role_policy_attachment" "cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.cluster.name
}

# The EKS cluster
resource "aws_eks_cluster" "main" {
  name     = "fargate-cluster"
  version  = "1.29"
  role_arn = aws_iam_role.cluster.arn

  vpc_config {
    subnet_ids              = concat(aws_subnet.public[*].id, aws_subnet.private[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true
  }

  depends_on = [
    aws_iam_role_policy_attachment.cluster_policy,
  ]
}
```

## Fargate Pod Execution Role

Every Fargate profile needs a pod execution role. This role allows the Fargate infrastructure to pull container images, send logs to CloudWatch, and perform other AWS API calls on behalf of your pods.

```hcl
# IAM role that Fargate uses to run pods
resource "aws_iam_role" "fargate" {
  name = "eks-fargate-pod-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks-fargate-pods.amazonaws.com"
        }
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:aws:eks:us-east-1:${data.aws_caller_identity.current.account_id}:fargateprofile/fargate-cluster/*"
          }
        }
      }
    ]
  })
}

data "aws_caller_identity" "current" {}

resource "aws_iam_role_policy_attachment" "fargate_pod_execution" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSFargatePodExecutionRolePolicy"
  role       = aws_iam_role.fargate.name
}
```

## Fargate Profiles

A Fargate profile tells EKS which pods should run on Fargate. You match pods by namespace and optionally by labels. Any pod that matches a profile's selectors runs on Fargate instead of EC2.

```hcl
# Fargate profile for the kube-system namespace
# This runs CoreDNS on Fargate so you don't need any EC2 nodes at all
resource "aws_eks_fargate_profile" "kube_system" {
  cluster_name           = aws_eks_cluster.main.name
  fargate_profile_name   = "kube-system"
  pod_execution_role_arn = aws_iam_role.fargate.arn
  subnet_ids             = aws_subnet.private[*].id  # Must be private subnets

  selector {
    namespace = "kube-system"
  }

  depends_on = [aws_eks_cluster.main]
}

# Fargate profile for your application namespace
resource "aws_eks_fargate_profile" "app" {
  cluster_name           = aws_eks_cluster.main.name
  fargate_profile_name   = "application"
  pod_execution_role_arn = aws_iam_role.fargate.arn
  subnet_ids             = aws_subnet.private[*].id

  # Match all pods in the "app" namespace
  selector {
    namespace = "app"
  }

  depends_on = [aws_eks_cluster.main]
}

# Profile with label-based selection - only specific workloads
resource "aws_eks_fargate_profile" "batch" {
  cluster_name           = aws_eks_cluster.main.name
  fargate_profile_name   = "batch-jobs"
  pod_execution_role_arn = aws_iam_role.fargate.arn
  subnet_ids             = aws_subnet.private[*].id

  selector {
    namespace = "batch"
    labels = {
      "compute-type" = "fargate"  # Only pods with this label run on Fargate
    }
  }

  depends_on = [aws_eks_cluster.main]
}
```

## Patching CoreDNS for Fargate

By default, CoreDNS has an annotation that prevents it from running on Fargate. After creating the cluster, you need to remove that annotation. You can do this with a null_resource that runs kubectl.

```hcl
# Remove the ec2 compute type annotation from CoreDNS so it runs on Fargate
resource "null_resource" "patch_coredns" {
  provisioner "local-exec" {
    command = <<-EOF
      aws eks update-kubeconfig --region us-east-1 --name ${aws_eks_cluster.main.name}
      kubectl patch deployment coredns \
        -n kube-system \
        --type json \
        -p='[{"op": "remove", "path": "/spec/template/metadata/annotations/eks.amazonaws.com~1compute-type"}]'
      kubectl rollout restart deployment coredns -n kube-system
    EOF
  }

  depends_on = [
    aws_eks_fargate_profile.kube_system,
  ]
}
```

## Mixed Mode: Fargate Plus Managed Node Group

Some workloads cannot run on Fargate - DaemonSets, stateful applications that need local storage, or anything that needs privileged access. A common pattern is to use a small managed node group for system components and Fargate for everything else.

```hcl
# Small node group for workloads that can't run on Fargate
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

resource "aws_eks_node_group" "system" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "system"
  node_role_arn   = aws_iam_role.node_group.arn
  subnet_ids      = aws_subnet.private[*].id

  instance_types = ["t3.small"]
  capacity_type  = "ON_DEMAND"

  scaling_config {
    desired_size = 2
    max_size     = 3
    min_size     = 1
  }

  # Taint these nodes so only system workloads with the right toleration land here
  taint {
    key    = "CriticalAddonsOnly"
    value  = "true"
    effect = "NO_SCHEDULE"
  }

  depends_on = [
    aws_iam_role_policy_attachment.node_worker,
    aws_iam_role_policy_attachment.node_cni,
    aws_iam_role_policy_attachment.node_ecr,
  ]
}
```

## Enabling Fargate Logging

Fargate pods can send logs directly to CloudWatch using the built-in Fluent Bit log router. You need to create a ConfigMap in the `aws-observability` namespace.

```hcl
# Create a namespace for Fargate logging configuration
resource "kubernetes_namespace" "aws_observability" {
  metadata {
    name = "aws-observability"
    labels = {
      "aws-observability" = "enabled"
    }
  }

  depends_on = [aws_eks_cluster.main]
}

# ConfigMap that tells Fargate's Fluent Bit where to send logs
resource "kubernetes_config_map" "aws_logging" {
  metadata {
    name      = "aws-logging"
    namespace = "aws-observability"
  }

  data = {
    "output.conf" = <<-EOF
      [OUTPUT]
          Name cloudwatch_logs
          Match *
          region us-east-1
          log_group_name /eks/fargate-cluster/pods
          log_stream_prefix fargate-
          auto_create_group true
    EOF
  }

  depends_on = [kubernetes_namespace.aws_observability]
}
```

You also need to add CloudWatch Logs permissions to the Fargate pod execution role:

```hcl
resource "aws_iam_role_policy" "fargate_logging" {
  name = "fargate-logging"
  role = aws_iam_role.fargate.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:CreateLogGroup",
          "logs:DescribeLogStreams",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Resource Sizing on Fargate

One thing that trips people up: Fargate pods have specific CPU and memory combinations you can request. You cannot ask for 3 vCPUs and 1 GB of memory. The valid combinations are documented by AWS, but the common ones are:

- 0.25 vCPU: 0.5, 1, or 2 GB memory
- 0.5 vCPU: 1 through 4 GB memory (in 1 GB increments)
- 1 vCPU: 2 through 8 GB memory
- 2 vCPU: 4 through 16 GB memory
- 4 vCPU: 8 through 30 GB memory

If your pod requests resources that do not match a valid combination, Fargate rounds up to the nearest valid configuration. You pay for the rounded-up amount, so it is worth setting your resource requests carefully.

## Outputs

```hcl
output "cluster_endpoint" {
  value = aws_eks_cluster.main.endpoint
}

output "cluster_name" {
  value = aws_eks_cluster.main.name
}

output "configure_kubectl" {
  value = "aws eks update-kubeconfig --region us-east-1 --name ${aws_eks_cluster.main.name}"
}
```

## Fargate vs Managed Node Groups

The choice between Fargate and managed node groups depends on your workload:

**Use Fargate when** you want zero node management, your workloads are stateless, you do not need DaemonSets, and you are OK with slightly slower pod startup times (30 to 60 seconds for the micro-VM to provision).

**Use managed node groups when** you need DaemonSets, GPUs, privileged containers, HostNetwork pods, or workloads that require fast pod scheduling. Also consider node groups when cost optimization matters - Fargate is more expensive per compute unit than EC2, especially when you factor in reserved instances or savings plans.

**Use both** when you want Fargate for most application workloads but need EC2 for monitoring agents, log collectors, or other system-level components that require DaemonSets.

For a deep dive into EKS with managed node groups, see our guide on [creating EKS clusters with managed node groups](https://oneuptime.com/blog/post/2026-02-23-create-eks-cluster-managed-node-groups-terraform/view).
