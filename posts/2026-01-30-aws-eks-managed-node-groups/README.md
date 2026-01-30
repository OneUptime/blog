# How to Implement AWS EKS Managed Node Groups

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EKS, Kubernetes, Node Groups

Description: Configure AWS EKS managed node groups with auto-scaling, custom AMIs, and launch templates for production Kubernetes clusters.

---

## Introduction

AWS EKS managed node groups simplify the provisioning and lifecycle management of worker nodes in your Kubernetes cluster. Instead of manually creating EC2 instances, configuring kubelet, and joining them to the cluster, managed node groups handle all of this automatically. This guide walks through implementing managed node groups for production workloads, covering everything from basic setup to advanced configurations with custom AMIs and spot instances.

## Managed vs Self-Managed Node Groups

Before diving into implementation, understand when to use each approach.

| Feature | Managed Node Groups | Self-Managed Node Groups |
|---------|---------------------|--------------------------|
| Node provisioning | Automatic | Manual (ASG configuration) |
| AMI updates | AWS handles rolling updates | You manage updates |
| Node draining | Automatic during updates | Manual or custom scripts |
| Launch template support | Yes | Yes |
| Custom AMI support | Yes | Yes |
| Spot instance support | Yes | Yes |
| Fargate profile support | No (separate feature) | No |
| Control over node bootstrap | Limited | Full control |
| Windows container support | Yes | Yes |
| GPU instance support | Yes | Yes |

**When to use managed node groups:**
- You want simplified operations and automatic updates
- Standard EKS-optimized AMIs meet your requirements
- You prefer AWS to handle node lifecycle management

**When to use self-managed node groups:**
- You need complete control over the bootstrap process
- Your compliance requirements mandate specific configurations
- You use heavily customized AMIs with pre-baked applications

## Prerequisites

Ensure you have the following tools installed:

```bash
# Install eksctl (macOS)
brew tap weaveworks/tap
brew install weaveworks/tap/eksctl

# Verify installation
eksctl version

# Install or update AWS CLI
brew install awscli

# Configure AWS credentials
aws configure

# Install kubectl
brew install kubectl

# Install Terraform (if using Terraform approach)
brew install terraform
```

## Creating a Basic Managed Node Group with eksctl

The simplest way to create a managed node group is using eksctl. This example creates a cluster with a single managed node group.

Create a cluster configuration file named `cluster.yaml`:

```yaml
# cluster.yaml - Basic EKS cluster with managed node group
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: production-cluster
  region: us-west-2
  version: "1.29"

# VPC configuration - use existing VPC or let eksctl create one
vpc:
  cidr: 10.0.0.0/16
  nat:
    gateway: Single # or HighlyAvailable for production

# IAM OIDC provider for service accounts
iam:
  withOIDC: true

# Managed node groups definition
managedNodeGroups:
  - name: standard-workers
    instanceType: m5.large
    minSize: 2
    maxSize: 10
    desiredCapacity: 3
    volumeSize: 100
    volumeType: gp3
    volumeEncrypted: true

    # Node labels for workload scheduling
    labels:
      role: worker
      environment: production

    # Taints to control pod scheduling
    taints: []

    # Node group tags
    tags:
      Team: platform
      Environment: production

    # Use private subnets for worker nodes
    privateNetworking: true

    # SSH access configuration
    ssh:
      allow: true
      publicKeyName: my-ec2-keypair

    # IAM policies for nodes
    iam:
      attachPolicyARNs:
        - arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
        - arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
        - arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
        - arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
```

Apply the configuration to create the cluster and node group:

```bash
# Create cluster with node group
eksctl create cluster -f cluster.yaml

# Check node group status
eksctl get nodegroup --cluster production-cluster

# Verify nodes are ready
kubectl get nodes -o wide
```

## Creating Managed Node Groups with Terraform

For infrastructure-as-code workflows, Terraform provides fine-grained control. This example shows a complete setup.

First, set up the provider configuration:

```hcl
# providers.tf - AWS and Kubernetes provider configuration
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }

  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "eks/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "eks-production"
      ManagedBy   = "terraform"
      Environment = var.environment
    }
  }
}
```

Define the input variables:

```hcl
# variables.tf - Input variables for the EKS configuration
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "production-cluster"
}

variable "cluster_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.29"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "node_instance_types" {
  description = "Instance types for worker nodes"
  type        = list(string)
  default     = ["m5.large", "m5a.large", "m6i.large"]
}

variable "node_desired_size" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 3
}

variable "node_min_size" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 2
}

variable "node_max_size" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 10
}
```

Create the VPC and networking resources:

```hcl
# vpc.tf - VPC configuration for EKS
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 3)
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.cluster_name}-vpc"
  cidr = var.vpc_cidr

  azs             = local.azs
  private_subnets = [for k, v in local.azs : cidrsubnet(var.vpc_cidr, 4, k)]
  public_subnets  = [for k, v in local.azs : cidrsubnet(var.vpc_cidr, 4, k + 4)]

  enable_nat_gateway   = true
  single_nat_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Tags required for EKS subnet discovery
  public_subnet_tags = {
    "kubernetes.io/role/elb"                      = 1
    "kubernetes.io/cluster/${var.cluster_name}"   = "owned"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"             = 1
    "kubernetes.io/cluster/${var.cluster_name}"   = "owned"
  }
}
```

Define the EKS cluster and managed node groups:

```hcl
# eks.tf - EKS cluster and managed node group configuration
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Cluster endpoint configuration
  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  # Enable IRSA for service accounts
  enable_irsa = true

  # Cluster addons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent              = true
      service_account_role_arn = module.vpc_cni_irsa.iam_role_arn
    }
  }

  # Managed node groups
  eks_managed_node_groups = {
    # Standard worker nodes
    standard = {
      name            = "standard-workers"
      use_name_prefix = true

      instance_types = var.node_instance_types
      capacity_type  = "ON_DEMAND"

      min_size     = var.node_min_size
      max_size     = var.node_max_size
      desired_size = var.node_desired_size

      # Disk configuration
      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size           = 100
            volume_type           = "gp3"
            iops                  = 3000
            throughput            = 125
            encrypted             = true
            delete_on_termination = true
          }
        }
      }

      # Node labels and taints
      labels = {
        role        = "worker"
        environment = var.environment
      }

      taints = []

      # Update configuration
      update_config = {
        max_unavailable_percentage = 33
      }

      # Metadata options for IMDS
      metadata_options = {
        http_endpoint               = "enabled"
        http_tokens                 = "required"
        http_put_response_hop_limit = 2
        instance_metadata_tags      = "disabled"
      }

      tags = {
        NodeGroup = "standard"
      }
    }
  }

  # Node security group rules
  node_security_group_additional_rules = {
    ingress_self_all = {
      description = "Node to node all ports/protocols"
      protocol    = "-1"
      from_port   = 0
      to_port     = 0
      type        = "ingress"
      self        = true
    }
  }

  tags = {
    Environment = var.environment
    Cluster     = var.cluster_name
  }
}

# IRSA for VPC CNI
module "vpc_cni_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.0"

  role_name             = "${var.cluster_name}-vpc-cni"
  attach_vpc_cni_policy = true
  vpc_cni_enable_ipv4   = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:aws-node"]
    }
  }
}
```

Apply the Terraform configuration:

```bash
# Initialize Terraform
terraform init

# Review the plan
terraform plan -out=tfplan

# Apply the configuration
terraform apply tfplan

# Configure kubectl
aws eks update-kubeconfig --region us-west-2 --name production-cluster
```

## Using Launch Templates for Custom Configuration

Launch templates provide additional control over node configuration, including custom AMIs, user data scripts, and instance settings.

This eksctl configuration demonstrates launch template usage:

```yaml
# cluster-with-launch-template.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: production-cluster
  region: us-west-2
  version: "1.29"

managedNodeGroups:
  - name: custom-workers
    instanceType: m5.xlarge
    minSize: 2
    maxSize: 20
    desiredCapacity: 5

    # Reference an existing launch template
    launchTemplate:
      id: lt-0123456789abcdef0
      version: "1"

    # Labels applied to nodes
    labels:
      workload: general

  - name: gpu-workers
    instanceType: g4dn.xlarge
    minSize: 0
    maxSize: 5
    desiredCapacity: 0

    # Launch template with GPU-specific configuration
    launchTemplate:
      id: lt-gpu0123456789abcd
      version: "1"

    labels:
      workload: gpu

    taints:
      - key: nvidia.com/gpu
        value: "true"
        effect: NoSchedule
```

Create a launch template with Terraform that includes custom user data:

```hcl
# launch-template.tf - Custom launch template for EKS nodes
resource "aws_launch_template" "eks_custom" {
  name_prefix   = "${var.cluster_name}-custom-"
  description   = "Custom launch template for EKS managed nodes"

  # Use the EKS-optimized AMI
  image_id = data.aws_ssm_parameter.eks_ami.value

  # Instance configuration
  instance_type = "m5.large"

  # EBS configuration
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

  # Network configuration
  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [module.eks.node_security_group_id]
    delete_on_termination       = true
  }

  # Metadata options - require IMDSv2
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
    instance_metadata_tags      = "disabled"
  }

  # Monitoring
  monitoring {
    enabled = true
  }

  # Custom user data for additional node configuration
  user_data = base64encode(<<-EOF
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="==BOUNDARY=="

--==BOUNDARY==
Content-Type: text/x-shellscript; charset="us-ascii"

#!/bin/bash
set -ex

# Install additional packages
yum install -y amazon-ssm-agent
systemctl enable amazon-ssm-agent
systemctl start amazon-ssm-agent

# Configure kubelet with custom settings
cat <<KUBELET_CONFIG >> /etc/kubernetes/kubelet/kubelet-config.json
{
  "maxPods": 110,
  "evictionHard": {
    "memory.available": "100Mi",
    "nodefs.available": "10%",
    "nodefs.inodesFree": "5%"
  },
  "evictionSoft": {
    "memory.available": "200Mi",
    "nodefs.available": "15%"
  },
  "evictionSoftGracePeriod": {
    "memory.available": "2m",
    "nodefs.available": "2m"
  }
}
KUBELET_CONFIG

--==BOUNDARY==--
EOF
  )

  tag_specifications {
    resource_type = "instance"

    tags = {
      Name        = "${var.cluster_name}-worker"
      Environment = var.environment
    }
  }

  tag_specifications {
    resource_type = "volume"

    tags = {
      Name        = "${var.cluster_name}-worker-volume"
      Environment = var.environment
    }
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.cluster_name}-launch-template"
  }
}

# Get the latest EKS-optimized AMI ID
data "aws_ssm_parameter" "eks_ami" {
  name = "/aws/service/eks/optimized-ami/${var.cluster_version}/amazon-linux-2/recommended/image_id"
}

# Managed node group using the custom launch template
resource "aws_eks_node_group" "custom" {
  cluster_name    = module.eks.cluster_name
  node_group_name = "custom-workers"
  node_role_arn   = aws_iam_role.node_group.arn
  subnet_ids      = module.vpc.private_subnets

  # Reference the launch template
  launch_template {
    id      = aws_launch_template.eks_custom.id
    version = aws_launch_template.eks_custom.latest_version
  }

  scaling_config {
    desired_size = 3
    max_size     = 10
    min_size     = 2
  }

  update_config {
    max_unavailable_percentage = 33
  }

  labels = {
    role = "custom-worker"
  }

  tags = {
    Environment = var.environment
  }

  depends_on = [
    aws_iam_role_policy_attachment.node_AmazonEKSWorkerNodePolicy,
    aws_iam_role_policy_attachment.node_AmazonEC2ContainerRegistryReadOnly,
    aws_iam_role_policy_attachment.node_AmazonEKS_CNI_Policy,
  ]
}
```

## Implementing Custom AMIs

Custom AMIs allow you to pre-bake software, security configurations, and compliance requirements into your node images.

Build a custom AMI using Packer:

```hcl
# eks-node.pkr.hcl - Packer template for custom EKS AMI
packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "us-west-2"
}

variable "eks_version" {
  type    = string
  default = "1.29"
}

# Find the latest EKS-optimized AMI as base
data "amazon-ami" "eks_base" {
  filters = {
    name                = "amazon-eks-node-${var.eks_version}-*"
    virtualization-type = "hvm"
    root-device-type    = "ebs"
  }
  owners      = ["602401143452"] # Amazon EKS AMI account
  most_recent = true
  region      = var.aws_region
}

source "amazon-ebs" "eks_custom" {
  ami_name        = "custom-eks-node-${var.eks_version}-{{timestamp}}"
  ami_description = "Custom EKS node AMI based on Amazon EKS optimized AMI"
  instance_type   = "t3.medium"
  region          = var.aws_region
  source_ami      = data.amazon-ami.eks_base.id
  ssh_username    = "ec2-user"

  ami_block_device_mappings {
    device_name           = "/dev/xvda"
    volume_size           = 50
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
  }

  tags = {
    Name        = "custom-eks-node-${var.eks_version}"
    Base_AMI    = data.amazon-ami.eks_base.id
    EKS_Version = var.eks_version
  }
}

build {
  sources = ["source.amazon-ebs.eks_custom"]

  # Update system packages
  provisioner "shell" {
    inline = [
      "sudo yum update -y",
      "sudo yum install -y amazon-ssm-agent",
      "sudo systemctl enable amazon-ssm-agent"
    ]
  }

  # Install security and monitoring tools
  provisioner "shell" {
    inline = [
      "sudo yum install -y amazon-cloudwatch-agent",
      "sudo yum install -y awslogs"
    ]
  }

  # Install custom packages required by your applications
  provisioner "shell" {
    inline = [
      "sudo yum install -y jq git"
    ]
  }

  # Copy custom scripts
  provisioner "file" {
    source      = "scripts/node-init.sh"
    destination = "/tmp/node-init.sh"
  }

  provisioner "shell" {
    inline = [
      "sudo mv /tmp/node-init.sh /opt/node-init.sh",
      "sudo chmod +x /opt/node-init.sh"
    ]
  }

  # Security hardening
  provisioner "shell" {
    inline = [
      "sudo yum remove -y telnet",
      "sudo systemctl disable rpcbind || true"
    ]
  }

  # Clean up
  provisioner "shell" {
    inline = [
      "sudo yum clean all",
      "sudo rm -rf /var/cache/yum",
      "sudo rm -rf /tmp/*"
    ]
  }
}
```

Build the custom AMI:

```bash
# Initialize Packer
packer init eks-node.pkr.hcl

# Validate the template
packer validate eks-node.pkr.hcl

# Build the AMI
packer build eks-node.pkr.hcl
```

Use the custom AMI in your node group:

```hcl
# custom-ami-node-group.tf
resource "aws_eks_node_group" "custom_ami" {
  cluster_name    = module.eks.cluster_name
  node_group_name = "custom-ami-workers"
  node_role_arn   = aws_iam_role.node_group.arn
  subnet_ids      = module.vpc.private_subnets

  # Use custom AMI via launch template
  launch_template {
    id      = aws_launch_template.custom_ami.id
    version = aws_launch_template.custom_ami.latest_version
  }

  scaling_config {
    desired_size = 3
    max_size     = 10
    min_size     = 2
  }

  # AMI type must be CUSTOM when using custom AMI
  ami_type = "CUSTOM"

  labels = {
    ami = "custom"
  }
}

resource "aws_launch_template" "custom_ami" {
  name_prefix = "${var.cluster_name}-custom-ami-"

  # Your custom AMI ID
  image_id = "ami-0123456789abcdef0"

  # User data for EKS bootstrap
  user_data = base64encode(<<-USERDATA
#!/bin/bash
set -ex

# Run custom initialization script
/opt/node-init.sh

# Bootstrap the node into the EKS cluster
/etc/eks/bootstrap.sh ${var.cluster_name} \
  --kubelet-extra-args '--node-labels=custom-ami=true'
USERDATA
  )

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = 100
      volume_type = "gp3"
      encrypted   = true
    }
  }
}
```

## Node Group Scaling Configuration

Proper scaling configuration ensures your cluster can handle varying workloads while optimizing costs.

Configure Cluster Autoscaler with eksctl:

```yaml
# cluster-autoscaler.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: production-cluster
  region: us-west-2
  version: "1.29"

iam:
  withOIDC: true
  serviceAccounts:
    - metadata:
        name: cluster-autoscaler
        namespace: kube-system
      wellKnownPolicies:
        autoScaler: true

managedNodeGroups:
  - name: standard-workers
    instanceType: m5.large
    minSize: 2
    maxSize: 50
    desiredCapacity: 5

    # Autoscaling labels
    labels:
      role: worker

    # Tags for Cluster Autoscaler discovery
    tags:
      k8s.io/cluster-autoscaler/enabled: "true"
      k8s.io/cluster-autoscaler/production-cluster: "owned"

    # IAM policies
    iam:
      attachPolicyARNs:
        - arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
        - arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
        - arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
```

Deploy Cluster Autoscaler using Helm:

```bash
# Add the autoscaler Helm repo
helm repo add autoscaler https://kubernetes.github.io/autoscaler
helm repo update

# Install Cluster Autoscaler
helm install cluster-autoscaler autoscaler/cluster-autoscaler \
  --namespace kube-system \
  --set autoDiscovery.clusterName=production-cluster \
  --set awsRegion=us-west-2 \
  --set rbac.serviceAccount.create=false \
  --set rbac.serviceAccount.name=cluster-autoscaler \
  --set extraArgs.balance-similar-node-groups=true \
  --set extraArgs.skip-nodes-with-system-pods=false \
  --set extraArgs.scale-down-enabled=true \
  --set extraArgs.scale-down-delay-after-add=10m \
  --set extraArgs.scale-down-unneeded-time=10m
```

Terraform configuration for scaling with Karpenter (alternative to Cluster Autoscaler):

```hcl
# karpenter.tf - Karpenter configuration for node provisioning
module "karpenter" {
  source  = "terraform-aws-modules/eks/aws//modules/karpenter"
  version = "~> 20.0"

  cluster_name = module.eks.cluster_name

  irsa_oidc_provider_arn = module.eks.oidc_provider_arn

  # IAM role for nodes provisioned by Karpenter
  create_node_iam_role = true
  node_iam_role_additional_policies = {
    AmazonSSMManagedInstanceCore = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
  }

  tags = {
    Environment = var.environment
  }
}

# Install Karpenter using Helm
resource "helm_release" "karpenter" {
  namespace        = "karpenter"
  create_namespace = true
  name             = "karpenter"
  repository       = "oci://public.ecr.aws/karpenter"
  chart            = "karpenter"
  version          = "v0.33.0"

  set {
    name  = "settings.clusterName"
    value = module.eks.cluster_name
  }

  set {
    name  = "settings.clusterEndpoint"
    value = module.eks.cluster_endpoint
  }

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = module.karpenter.irsa_arn
  }

  set {
    name  = "settings.interruptionQueue"
    value = module.karpenter.queue_name
  }
}
```

Create a Karpenter NodePool for automatic provisioning:

```yaml
# karpenter-nodepool.yaml - NodePool configuration
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: default
spec:
  template:
    spec:
      requirements:
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64"]
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["on-demand", "spot"]
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["c", "m", "r"]
        - key: karpenter.k8s.aws/instance-generation
          operator: Gt
          values: ["4"]
      nodeClassRef:
        name: default
  limits:
    cpu: 1000
    memory: 1000Gi
  disruption:
    consolidationPolicy: WhenUnderutilized
    consolidateAfter: 30s
---
apiVersion: karpenter.k8s.aws/v1beta1
kind: EC2NodeClass
metadata:
  name: default
spec:
  amiFamily: AL2
  role: "KarpenterNodeRole-production-cluster"
  subnetSelectorTerms:
    - tags:
        karpenter.sh/discovery: "production-cluster"
  securityGroupSelectorTerms:
    - tags:
        karpenter.sh/discovery: "production-cluster"
  blockDeviceMappings:
    - deviceName: /dev/xvda
      ebs:
        volumeSize: 100Gi
        volumeType: gp3
        iops: 3000
        encrypted: true
        deleteOnTermination: true
```

## Update Strategies for Managed Node Groups

Managed node groups support controlled updates with configurable parallelism and health checks.

| Update Strategy | Use Case | Configuration |
|-----------------|----------|---------------|
| Rolling update | Standard deployments | Default behavior |
| Max unavailable count | Fixed number of nodes | `maxUnavailable: 2` |
| Max unavailable percentage | Percentage-based | `maxUnavailablePercentage: 33` |
| Blue-green deployment | Zero-downtime updates | Create new node group, migrate, delete old |

Configure update behavior in Terraform:

```hcl
# update-config.tf - Node group update configuration
resource "aws_eks_node_group" "workers" {
  cluster_name    = module.eks.cluster_name
  node_group_name = "workers"
  node_role_arn   = aws_iam_role.node_group.arn
  subnet_ids      = module.vpc.private_subnets

  instance_types = ["m5.large"]

  scaling_config {
    desired_size = 5
    max_size     = 10
    min_size     = 2
  }

  # Update configuration - choose one approach
  update_config {
    # Option 1: Fixed number of nodes can be unavailable
    # max_unavailable = 2

    # Option 2: Percentage of nodes can be unavailable
    max_unavailable_percentage = 33
  }

  # Force version update even if pod disruption budgets prevent node drain
  # Use with caution
  force_update_version = false

  lifecycle {
    # Prevent accidental deletion
    prevent_destroy = true

    # Ignore changes to desired size (managed by autoscaler)
    ignore_changes = [scaling_config[0].desired_size]
  }
}
```

Implement blue-green node group updates with eksctl:

```bash
# Create new node group with updated configuration
eksctl create nodegroup \
  --cluster production-cluster \
  --name workers-v2 \
  --node-type m5.xlarge \
  --nodes 5 \
  --nodes-min 2 \
  --nodes-max 10 \
  --managed

# Verify new nodes are ready
kubectl get nodes -l eks.amazonaws.com/nodegroup=workers-v2

# Cordon old nodes to prevent new pod scheduling
kubectl cordon -l eks.amazonaws.com/nodegroup=workers-v1

# Drain pods from old nodes
kubectl drain -l eks.amazonaws.com/nodegroup=workers-v1 \
  --ignore-daemonsets \
  --delete-emptydir-data

# Delete old node group after successful migration
eksctl delete nodegroup \
  --cluster production-cluster \
  --name workers-v1
```

## Spot Instances in Node Groups

Spot instances can reduce compute costs by up to 90% for fault-tolerant workloads.

Configure a mixed capacity node group:

```yaml
# spot-nodegroup.yaml - Mixed on-demand and spot configuration
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: production-cluster
  region: us-west-2
  version: "1.29"

managedNodeGroups:
  # On-demand node group for critical workloads
  - name: on-demand-workers
    instanceType: m5.large
    minSize: 2
    maxSize: 10
    desiredCapacity: 3
    capacityType: ON_DEMAND
    labels:
      capacity-type: on-demand
      workload: critical

  # Spot node group for fault-tolerant workloads
  - name: spot-workers
    instanceTypes:
      - m5.large
      - m5a.large
      - m5n.large
      - m5d.large
      - m6i.large
      - m6a.large
    minSize: 0
    maxSize: 20
    desiredCapacity: 5
    capacityType: SPOT

    labels:
      capacity-type: spot
      workload: fault-tolerant

    taints:
      - key: spot-instance
        value: "true"
        effect: PreferNoSchedule

    # Spot allocation strategy
    spot:
      # Use capacity-optimized for better availability
      allocationStrategy: capacity-optimized
```

Terraform configuration for spot instances:

```hcl
# spot-nodegroup.tf - Spot instance node group
resource "aws_eks_node_group" "spot" {
  cluster_name    = module.eks.cluster_name
  node_group_name = "spot-workers"
  node_role_arn   = aws_iam_role.node_group.arn
  subnet_ids      = module.vpc.private_subnets

  # Multiple instance types for spot diversity
  instance_types = [
    "m5.large",
    "m5a.large",
    "m5n.large",
    "m6i.large",
    "m6a.large"
  ]

  # Use spot capacity
  capacity_type = "SPOT"

  scaling_config {
    desired_size = 5
    max_size     = 20
    min_size     = 0
  }

  labels = {
    "capacity-type" = "spot"
    "workload"      = "fault-tolerant"
  }

  taint {
    key    = "spot-instance"
    value  = "true"
    effect = "PREFER_NO_SCHEDULE"
  }

  update_config {
    max_unavailable_percentage = 50
  }
}
```

Deploy a workload that tolerates spot instances:

```yaml
# spot-tolerant-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-processor
  namespace: default
spec:
  replicas: 10
  selector:
    matchLabels:
      app: batch-processor
  template:
    metadata:
      labels:
        app: batch-processor
    spec:
      # Tolerate spot instance taint
      tolerations:
        - key: spot-instance
          operator: Equal
          value: "true"
          effect: PreferNoSchedule

      # Prefer spot nodes
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: capacity-type
                    operator: In
                    values:
                      - spot

      # Handle spot interruptions gracefully
      terminationGracePeriodSeconds: 120

      containers:
        - name: processor
          image: my-app:latest
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi

          # Graceful shutdown handler
          lifecycle:
            preStop:
              exec:
                command:
                  - /bin/sh
                  - -c
                  - "sleep 10 && /app/graceful-shutdown.sh"
```

Handle spot interruptions with the AWS Node Termination Handler:

```bash
# Install Node Termination Handler
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-node-termination-handler \
  eks/aws-node-termination-handler \
  --namespace kube-system \
  --set enableSpotInterruptionDraining=true \
  --set enableScheduledEventDraining=true \
  --set enableRebalanceMonitoring=true \
  --set enableRebalanceDraining=true
```

## Monitoring Node Groups

Set up monitoring for your node groups using CloudWatch Container Insights:

```bash
# Enable Container Insights with CloudWatch agent
aws eks create-addon \
  --cluster-name production-cluster \
  --addon-name amazon-cloudwatch-observability \
  --addon-version v1.2.0-eksbuild.1
```

Create CloudWatch alarms for node group health:

```hcl
# monitoring.tf - CloudWatch alarms for node groups
resource "aws_cloudwatch_metric_alarm" "node_cpu_high" {
  alarm_name          = "${var.cluster_name}-node-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "node_cpu_utilization"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Node CPU utilization is high"

  dimensions = {
    ClusterName = var.cluster_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "node_memory_high" {
  alarm_name          = "${var.cluster_name}-node-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "node_memory_utilization"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Node memory utilization is high"

  dimensions = {
    ClusterName = var.cluster_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

resource "aws_sns_topic" "alerts" {
  name = "${var.cluster_name}-alerts"
}
```

## Best Practices Summary

**Node Group Design:**
- Use multiple node groups for different workload types
- Separate critical and non-critical workloads
- Use instance type diversity for spot node groups

**Security:**
- Enable IMDSv2 (require tokens) on all nodes
- Encrypt EBS volumes
- Use private subnets for worker nodes
- Apply principle of least privilege for IAM roles

**Scaling:**
- Set appropriate min/max sizes based on workload patterns
- Use Cluster Autoscaler or Karpenter for dynamic scaling
- Configure Pod Disruption Budgets for critical applications

**Updates:**
- Use rolling updates with appropriate max unavailable settings
- Test updates in staging environments first
- Consider blue-green deployments for major version upgrades

**Cost Optimization:**
- Use spot instances for fault-tolerant workloads
- Right-size instance types based on actual utilization
- Enable node group scaling to zero for non-production environments

## Conclusion

AWS EKS managed node groups simplify Kubernetes cluster operations by handling node provisioning, updates, and lifecycle management. By combining managed node groups with launch templates, custom AMIs, and proper scaling configuration, you can build production-ready clusters that balance operational simplicity with customization needs.

Start with the basic managed node group configuration and progressively add customizations as your requirements evolve. Whether you need GPU instances for ML workloads, spot instances for cost optimization, or custom AMIs for compliance, managed node groups provide the flexibility to support diverse production scenarios.
