# How to Create Talos Clusters with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Terraform, Kubernetes, Cluster Creation, Infrastructure as Code

Description: A step-by-step guide to creating complete Talos Linux Kubernetes clusters using Terraform, from infrastructure provisioning to cluster bootstrap.

---

Creating a Talos Linux cluster involves multiple steps: provisioning infrastructure, generating secrets, creating machine configurations, applying them to nodes, and bootstrapping the cluster. Doing this manually is fine for a single cluster, but when you need to create clusters repeatedly or manage multiple environments, Terraform provides the automation and consistency you need.

This guide walks through building a complete Talos cluster creation workflow with Terraform, combining infrastructure provisioning with Talos configuration management.

## Architecture Overview

A typical Terraform-managed Talos cluster involves two layers:

1. **Infrastructure layer**: Provisions the actual machines (VMs, cloud instances, or bare metal provisioning)
2. **Talos layer**: Generates and applies machine configurations, bootstraps the cluster

These layers can be in the same Terraform project or separated into different projects with state sharing.

## Setting Up the Terraform Project

```bash
# Create project structure
mkdir -p talos-cluster/
cd talos-cluster/

# Create the required files
touch versions.tf variables.tf main.tf outputs.tf
```

### Provider Configuration

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    talos = {
      source  = "siderolabs/talos"
      version = "~> 0.5.0"
    }
    # Add your infrastructure provider
    # For this example, we use libvirt for local VMs
    libvirt = {
      source  = "dmacvicar/libvirt"
      version = "~> 0.7.0"
    }
  }
}

provider "talos" {}

provider "libvirt" {
  uri = "qemu:///system"
}
```

### Variables

```hcl
# variables.tf
variable "cluster_name" {
  description = "Name of the Talos cluster"
  type        = string
  default     = "production"
}

variable "talos_version" {
  description = "Talos Linux version"
  type        = string
  default     = "v1.7.0"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "v1.30.0"
}

variable "controlplane_count" {
  description = "Number of control plane nodes"
  type        = number
  default     = 3
}

variable "worker_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 3
}

variable "controlplane_ips" {
  description = "IP addresses for control plane nodes"
  type        = list(string)
  default     = ["10.0.0.10", "10.0.0.11", "10.0.0.12"]
}

variable "worker_ips" {
  description = "IP addresses for worker nodes"
  type        = list(string)
  default     = ["10.0.0.20", "10.0.0.21", "10.0.0.22"]
}

variable "cluster_vip" {
  description = "Virtual IP for the cluster endpoint"
  type        = string
  default     = "10.0.0.1"
}

variable "schematic_id" {
  description = "Image Factory schematic ID"
  type        = string
  default     = ""
}
```

## Creating the Cluster

### Generate Secrets

```hcl
# main.tf - Talos cluster creation

# Step 1: Generate cluster secrets
resource "talos_machine_secrets" "this" {
  talos_version = var.talos_version
}
```

### Create Machine Configurations

```hcl
# Step 2: Generate machine configurations

# Determine the installer image
locals {
  installer_image = var.schematic_id != "" ? (
    "factory.talos.dev/installer/${var.schematic_id}:${var.talos_version}"
  ) : (
    "ghcr.io/siderolabs/installer:${var.talos_version}"
  )
  cluster_endpoint = "https://${var.cluster_vip}:6443"
}

# Control plane configuration
data "talos_machine_configuration" "controlplane" {
  cluster_name       = var.cluster_name
  machine_type       = "controlplane"
  cluster_endpoint   = local.cluster_endpoint
  machine_secrets    = talos_machine_secrets.this.machine_secrets
  kubernetes_version = var.kubernetes_version

  config_patches = [
    yamlencode({
      machine = {
        install = {
          image = local.installer_image
        }
      }
      cluster = {
        allowSchedulingOnControlPlanes = var.worker_count == 0
      }
    })
  ]
}

# Worker configuration
data "talos_machine_configuration" "worker" {
  cluster_name       = var.cluster_name
  machine_type       = "worker"
  cluster_endpoint   = local.cluster_endpoint
  machine_secrets    = talos_machine_secrets.this.machine_secrets
  kubernetes_version = var.kubernetes_version

  config_patches = [
    yamlencode({
      machine = {
        install = {
          image = local.installer_image
        }
      }
    })
  ]
}
```

### Apply Configurations to Nodes

```hcl
# Step 3: Apply configurations

# Apply control plane configurations
resource "talos_machine_configuration_apply" "controlplane" {
  count = var.controlplane_count

  client_configuration        = talos_machine_secrets.this.client_configuration
  machine_configuration_input = data.talos_machine_configuration.controlplane.machine_configuration
  node                        = var.controlplane_ips[count.index]

  config_patches = [
    yamlencode({
      machine = {
        network = {
          hostname = "${var.cluster_name}-cp-${count.index}"
        }
      }
    })
  ]
}

# Apply worker configurations
resource "talos_machine_configuration_apply" "worker" {
  count = var.worker_count

  depends_on = [talos_machine_bootstrap.this]

  client_configuration        = talos_machine_secrets.this.client_configuration
  machine_configuration_input = data.talos_machine_configuration.worker.machine_configuration
  node                        = var.worker_ips[count.index]

  config_patches = [
    yamlencode({
      machine = {
        network = {
          hostname = "${var.cluster_name}-worker-${count.index}"
        }
      }
    })
  ]
}
```

### Bootstrap the Cluster

```hcl
# Step 4: Bootstrap

resource "talos_machine_bootstrap" "this" {
  depends_on = [
    talos_machine_configuration_apply.controlplane
  ]

  client_configuration = talos_machine_secrets.this.client_configuration
  node                 = var.controlplane_ips[0]
}

# Step 5: Get kubeconfig
data "talos_cluster_kubeconfig" "this" {
  depends_on = [talos_machine_bootstrap.this]

  client_configuration = talos_machine_secrets.this.client_configuration
  node                 = var.controlplane_ips[0]
}

# Client configuration for talosctl
data "talos_client_configuration" "this" {
  cluster_name         = var.cluster_name
  client_configuration = talos_machine_secrets.this.client_configuration
  nodes                = var.controlplane_ips
  endpoints            = var.controlplane_ips
}
```

### Outputs

```hcl
# outputs.tf
output "kubeconfig" {
  description = "Kubernetes configuration for cluster access"
  value       = data.talos_cluster_kubeconfig.this.kubeconfig_raw
  sensitive   = true
}

output "talosconfig" {
  description = "Talos client configuration"
  value       = data.talos_client_configuration.this.talos_config
  sensitive   = true
}

output "cluster_endpoint" {
  description = "Kubernetes API endpoint"
  value       = local.cluster_endpoint
}

output "controlplane_nodes" {
  description = "Control plane node IPs"
  value       = var.controlplane_ips
}

output "worker_nodes" {
  description = "Worker node IPs"
  value       = var.worker_ips
}
```

## Deploying the Cluster

```bash
# Initialize Terraform
terraform init

# Preview the changes
terraform plan

# Create the cluster
terraform apply

# Export kubeconfig
terraform output -raw kubeconfig > ~/.kube/config
chmod 600 ~/.kube/config

# Export talosconfig
terraform output -raw talosconfig > ~/.talos/config
chmod 600 ~/.talos/config

# Verify
kubectl get nodes
talosctl health --nodes 10.0.0.10
```

## Combining with AWS Infrastructure

Here is how to combine Talos configuration with AWS infrastructure provisioning:

```hcl
# aws-cluster.tf - AWS + Talos

# Create VPC, subnets, security groups, etc.
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.cluster_name}-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
}

# Launch control plane instances
resource "aws_instance" "controlplane" {
  count = var.controlplane_count

  ami           = var.talos_ami_id
  instance_type = "m6i.large"
  subnet_id     = module.vpc.private_subnets[count.index % length(module.vpc.private_subnets)]

  tags = {
    Name = "${var.cluster_name}-cp-${count.index}"
    Role = "controlplane"
  }
}

# Launch worker instances
resource "aws_instance" "worker" {
  count = var.worker_count

  ami           = var.talos_ami_id
  instance_type = "m6i.xlarge"
  subnet_id     = module.vpc.private_subnets[count.index % length(module.vpc.private_subnets)]

  tags = {
    Name = "${var.cluster_name}-worker-${count.index}"
    Role = "worker"
  }
}

# Apply Talos configs to the AWS instances
resource "talos_machine_configuration_apply" "controlplane" {
  count = var.controlplane_count

  client_configuration        = talos_machine_secrets.this.client_configuration
  machine_configuration_input = data.talos_machine_configuration.controlplane.machine_configuration
  node                        = aws_instance.controlplane[count.index].private_ip
}
```

## Managing Multiple Environments

Use Terraform workspaces or separate directories for different environments:

```bash
# Using workspaces
terraform workspace new staging
terraform workspace new production

# Switch to staging
terraform workspace select staging
terraform apply -var-file=environments/staging.tfvars

# Switch to production
terraform workspace select production
terraform apply -var-file=environments/production.tfvars
```

Environment-specific variable files:

```hcl
# environments/staging.tfvars
cluster_name        = "staging"
controlplane_count  = 1
worker_count        = 2
controlplane_ips    = ["10.1.0.10"]
worker_ips          = ["10.1.0.20", "10.1.0.21"]
cluster_vip         = "10.1.0.1"
```

```hcl
# environments/production.tfvars
cluster_name        = "production"
controlplane_count  = 3
worker_count        = 5
controlplane_ips    = ["10.0.0.10", "10.0.0.11", "10.0.0.12"]
worker_ips          = ["10.0.0.20", "10.0.0.21", "10.0.0.22", "10.0.0.23", "10.0.0.24"]
cluster_vip         = "10.0.0.1"
```

## Destroying the Cluster

When you need to tear down the cluster:

```bash
# Destroy all Terraform-managed resources
terraform destroy

# This will:
# 1. Reset all Talos nodes
# 2. Destroy infrastructure resources (VMs, cloud instances)
# 3. Clean up all state
```

## Wrapping Up

Creating Talos clusters with Terraform gives you a repeatable, version-controlled process that scales from development environments to production. The combination of infrastructure provisioning and Talos configuration in a single Terraform project means you can create complete clusters with a single `terraform apply` command. Whether you are deploying on bare metal, cloud instances, or virtual machines, the Terraform workflow stays consistent and predictable.
