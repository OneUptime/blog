# Using Terraform Modules to Deploy EKS Clusters with Custom VPC Configurations
Author: [nawazdhandala](https://github.com/nawazdhandala)
Tags: Terraform, EKS, VPC, AWS, Kubernetes
Description: A complete guide to deploying Amazon EKS clusters with custom VPC configurations using Terraform modules, covering subnet design, security groups, IAM roles, and production-ready networking patterns.
---

Amazon Elastic Kubernetes Service (EKS) requires a well-designed VPC to function correctly. The default VPC in your AWS account is not suitable for production Kubernetes workloads. It lacks private subnets, NAT gateways, and the subnet tagging that EKS needs for load balancer integration. This guide walks through deploying EKS with a custom VPC using Terraform modules, covering every layer from network design to cluster configuration.

## VPC Architecture for EKS

A production EKS VPC typically has three tiers of subnets across multiple Availability Zones:

- **Public subnets**: Host NAT Gateways and public-facing load balancers.
- **Private subnets**: Host EKS worker nodes and internal load balancers.
- **Database subnets** (optional): Isolated subnets for RDS or other data stores with no internet access.

Each tier spans at least two Availability Zones for high availability. The CIDR block should be large enough to accommodate pod networking. With the Amazon VPC CNI plugin, each pod gets a real VPC IP address, so you need significantly more IP addresses than the number of nodes.

## Step 1: Define the VPC Module

We will use the popular `terraform-aws-modules/vpc/aws` community module as a foundation and wrap it with our EKS-specific configuration:

```hcl
# modules/eks-vpc/variables.tf
variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster (used for subnet tagging)"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
  default     = "10.0.0.0/16"
}

variable "azs" {
  type        = list(string)
  description = "Availability zones"
  default     = ["us-west-2a", "us-west-2b", "us-west-2c"]
}

variable "private_subnet_cidrs" {
  type        = list(string)
  default     = ["10.0.0.0/19", "10.0.32.0/19", "10.0.64.0/19"]
}

variable "public_subnet_cidrs" {
  type        = list(string)
  default     = ["10.0.96.0/24", "10.0.97.0/24", "10.0.98.0/24"]
}

variable "database_subnet_cidrs" {
  type        = list(string)
  default     = ["10.0.100.0/24", "10.0.101.0/24", "10.0.102.0/24"]
}
```

```hcl
# modules/eks-vpc/main.tf
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.0"

  name = "${var.cluster_name}-vpc"
  cidr = var.vpc_cidr

  azs              = var.azs
  private_subnets  = var.private_subnet_cidrs
  public_subnets   = var.public_subnet_cidrs
  database_subnets = var.database_subnet_cidrs

  enable_nat_gateway     = true
  single_nat_gateway     = false
  one_nat_gateway_per_az = true
  enable_dns_hostnames   = true
  enable_dns_support     = true

  # Create a database subnet group for RDS
  create_database_subnet_group       = true
  create_database_subnet_route_table = true

  # EKS requires specific tags on subnets
  public_subnet_tags = {
    "kubernetes.io/role/elb"                      = "1"
    "kubernetes.io/cluster/${var.cluster_name}"    = "shared"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"              = "1"
    "kubernetes.io/cluster/${var.cluster_name}"    = "shared"
  }

  tags = {
    Environment = var.cluster_name
    ManagedBy   = "terraform"
  }
}
```

```hcl
# modules/eks-vpc/outputs.tf
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "private_subnet_ids" {
  value = module.vpc.private_subnets
}

output "public_subnet_ids" {
  value = module.vpc.public_subnets
}

output "database_subnet_ids" {
  value = module.vpc.database_subnets
}

output "database_subnet_group_name" {
  value = module.vpc.database_subnet_group_name
}

output "nat_gateway_ips" {
  value = module.vpc.nat_public_ips
}
```

The subnet tags are critical. The `kubernetes.io/role/elb` tag tells the AWS Load Balancer Controller to use public subnets for internet-facing ALBs and NLBs. The `kubernetes.io/role/internal-elb` tag marks private subnets for internal load balancers.

Using `/19` CIDR blocks for private subnets gives each AZ 8,190 IP addresses, which is essential for pods using the VPC CNI plugin. Public subnets use `/24` blocks because they only host NAT Gateways and load balancers.

## Step 2: Define the EKS Module

```hcl
# modules/eks-cluster/variables.tf
variable "cluster_name" {
  type = string
}

variable "cluster_version" {
  type    = string
  default = "1.29"
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "node_instance_types" {
  type    = list(string)
  default = ["m6i.xlarge"]
}

variable "node_desired_size" {
  type    = number
  default = 3
}

variable "node_min_size" {
  type    = number
  default = 3
}

variable "node_max_size" {
  type    = number
  default = 10
}
```

```hcl
# modules/eks-cluster/main.tf
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "20.8.0"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  vpc_id     = var.vpc_id
  subnet_ids = var.subnet_ids

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  # Enable IRSA (IAM Roles for Service Accounts)
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
      configuration_values = jsonencode({
        env = {
          ENABLE_PREFIX_DELEGATION = "true"
          WARM_PREFIX_TARGET       = "1"
        }
      })
    }
    aws-ebs-csi-driver = {
      most_recent              = true
      service_account_role_arn = module.ebs_csi_irsa.iam_role_arn
    }
  }

  # Managed node groups
  eks_managed_node_groups = {
    general = {
      instance_types = var.node_instance_types
      capacity_type  = "ON_DEMAND"

      min_size     = var.node_min_size
      max_size     = var.node_max_size
      desired_size = var.node_desired_size

      labels = {
        role = "general"
      }

      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size           = 100
            volume_type           = "gp3"
            iops                  = 3000
            throughput            = 150
            encrypted             = true
            delete_on_termination = true
          }
        }
      }
    }
  }

  # Allow access from the cluster to nodes and vice versa
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
    Environment = var.cluster_name
    ManagedBy   = "terraform"
  }
}

# IRSA role for VPC CNI
module "vpc_cni_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "5.37.0"

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

# IRSA role for EBS CSI driver
module "ebs_csi_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "5.37.0"

  role_name             = "${var.cluster_name}-ebs-csi"
  attach_ebs_csi_policy = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:ebs-csi-controller-sa"]
    }
  }
}
```

```hcl
# modules/eks-cluster/outputs.tf
output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_certificate_authority_data" {
  value = module.eks.cluster_certificate_authority_data
}

output "oidc_provider_arn" {
  value = module.eks.oidc_provider_arn
}

output "cluster_security_group_id" {
  value = module.eks.cluster_security_group_id
}
```

## Step 3: Wire the Modules Together

```hcl
# main.tf
provider "aws" {
  region = "us-west-2"
}

module "vpc" {
  source = "./modules/eks-vpc"

  cluster_name         = "production"
  vpc_cidr             = "10.0.0.0/16"
  azs                  = ["us-west-2a", "us-west-2b", "us-west-2c"]
  private_subnet_cidrs = ["10.0.0.0/19", "10.0.32.0/19", "10.0.64.0/19"]
  public_subnet_cidrs  = ["10.0.96.0/24", "10.0.97.0/24", "10.0.98.0/24"]
}

module "eks" {
  source = "./modules/eks-cluster"

  cluster_name        = "production"
  cluster_version     = "1.29"
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnet_ids
  node_instance_types = ["m6i.xlarge"]
  node_desired_size   = 3
  node_min_size       = 3
  node_max_size       = 15
}
```

## VPC CNI Prefix Delegation

The configuration above enables prefix delegation for the VPC CNI plugin with `ENABLE_PREFIX_DELEGATION = "true"`. Without prefix delegation, each ENI attachment consumes one IP per pod. With prefix delegation, each ENI attachment gets a /28 prefix (16 IPs), dramatically increasing the number of pods per node.

For an `m6i.xlarge` instance (4 ENIs, 15 IPs per ENI in standard mode):
- Without prefix delegation: ~58 pods per node
- With prefix delegation: ~110 pods per node

This is why we use large private subnets (/19 per AZ).

## Security Group Configuration

EKS creates a cluster security group and a node security group automatically. For additional restrictions, you can add custom security group rules:

```hcl
resource "aws_security_group_rule" "allow_rds" {
  type                     = "egress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.rds.id
  security_group_id        = module.eks.cluster_security_group_id
  description              = "Allow pods to connect to RDS"
}
```

## Updating kubeconfig

After deploying, update your local kubeconfig:

```bash
aws eks update-kubeconfig --region us-west-2 --name production
```

Verify the cluster:

```bash
kubectl get nodes
kubectl get pods -n kube-system
```

## Conclusion

A well-designed VPC is the foundation of a reliable EKS deployment. The module-based approach shown here separates network and cluster concerns, making each component independently testable and reusable. The key decisions are subnet sizing for pod IP capacity, proper tagging for load balancer integration, NAT gateway placement for outbound connectivity, and VPC CNI configuration for pod density. By encoding all of this in Terraform modules, you ensure that every EKS environment you deploy follows the same battle-tested architecture.
