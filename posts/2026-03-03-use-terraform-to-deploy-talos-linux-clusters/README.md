# How to Use Terraform to Deploy Talos Linux Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Terraform, Infrastructure as Code, Kubernetes, Cloud Deployment, Automation

Description: Deploy Talos Linux Kubernetes clusters on cloud providers using Terraform with the official Talos provider for fully automated infrastructure.

---

Terraform is the most widely adopted infrastructure-as-code tool, and it has first-class support for Talos Linux through an official provider. This means you can define your entire Talos Linux cluster - from VM creation to Kubernetes bootstrap - in Terraform HCL files. The cluster becomes reproducible, version-controlled, and destroyable with a single command. In this guide, we will deploy a complete Talos Linux cluster using Terraform on AWS, though the patterns apply to any cloud provider.

## Why Terraform for Talos Linux

Using Terraform with Talos Linux gives you:

- **Full lifecycle management**: Create, update, and destroy clusters with Terraform commands
- **Cloud provider integration**: Provision VMs, load balancers, and networking in the same configuration
- **State management**: Terraform tracks what resources exist and plans changes incrementally
- **Module reuse**: Package your cluster definition as a reusable module
- **Multi-cloud support**: Same workflow across AWS, GCP, Azure, and others

## The Talos Terraform Provider

The official `siderolabs/talos` Terraform provider handles Talos-specific operations:

- Generating machine secrets
- Creating machine configurations
- Applying configurations to nodes
- Bootstrapping the cluster
- Retrieving kubeconfig

## Step 1: Set Up the Terraform Configuration

Create your Terraform project structure:

```text
terraform-talos/
  /main.tf           # Main configuration
  /variables.tf      # Input variables
  /outputs.tf        # Output values
  /versions.tf       # Provider versions
  /network.tf        # VPC and networking
  /instances.tf      # VM instances
  /talos.tf          # Talos configuration
  /terraform.tfvars  # Variable values
```

Define provider requirements:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    talos = {
      source  = "siderolabs/talos"
      version = "~> 0.5"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "talos" {}
```

Define input variables:

```hcl
# variables.tf
variable "cluster_name" {
  description = "Name of the Talos Linux cluster"
  type        = string
  default     = "talos-production"
}

variable "aws_region" {
  description = "AWS region for the cluster"
  type        = string
  default     = "us-east-1"
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

variable "controlplane_instance_type" {
  description = "EC2 instance type for control plane nodes"
  type        = string
  default     = "m5.xlarge"
}

variable "worker_instance_type" {
  description = "EC2 instance type for worker nodes"
  type        = string
  default     = "m5.2xlarge"
}

variable "talos_version" {
  description = "Talos Linux version"
  type        = string
  default     = "v1.6.0"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "v1.29.0"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}
```

## Step 2: Create Network Infrastructure

```hcl
# network.tf
resource "aws_vpc" "talos" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.cluster_name}-vpc"
  }
}

resource "aws_subnet" "talos" {
  count             = 3
  vpc_id            = aws_vpc.talos.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "${var.cluster_name}-subnet-${count.index}"
  }
}

resource "aws_internet_gateway" "talos" {
  vpc_id = aws_vpc.talos.id

  tags = {
    Name = "${var.cluster_name}-igw"
  }
}

resource "aws_route_table" "talos" {
  vpc_id = aws_vpc.talos.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.talos.id
  }
}

resource "aws_route_table_association" "talos" {
  count          = 3
  subnet_id      = aws_subnet.talos[count.index].id
  route_table_id = aws_route_table.talos.id
}

# Load balancer for the Kubernetes API
resource "aws_lb" "talos_api" {
  name               = "${var.cluster_name}-api"
  internal           = false
  load_balancer_type = "network"
  subnets            = aws_subnet.talos[*].id

  tags = {
    Name = "${var.cluster_name}-api-lb"
  }
}

resource "aws_lb_target_group" "talos_api" {
  name     = "${var.cluster_name}-api-tg"
  port     = 6443
  protocol = "TCP"
  vpc_id   = aws_vpc.talos.id

  health_check {
    protocol = "TCP"
    port     = 6443
  }
}

resource "aws_lb_listener" "talos_api" {
  load_balancer_arn = aws_lb.talos_api.arn
  port              = 6443
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.talos_api.arn
  }
}

# Security group
resource "aws_security_group" "talos" {
  name_prefix = "${var.cluster_name}-"
  vpc_id      = aws_vpc.talos.id

  # Allow all traffic between cluster nodes
  ingress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"
    self      = true
  }

  # Kubernetes API
  ingress {
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Talos API
  ingress {
    from_port   = 50000
    to_port     = 50000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}
```

## Step 3: Configure Talos Resources

```hcl
# talos.tf

# Generate machine secrets
resource "talos_machine_secrets" "this" {}

# Get the Talos machine configuration for control plane
data "talos_machine_configuration" "controlplane" {
  cluster_name     = var.cluster_name
  machine_type     = "controlplane"
  cluster_endpoint = "https://${aws_lb.talos_api.dns_name}:6443"
  machine_secrets  = talos_machine_secrets.this.machine_secrets

  config_patches = [
    yamlencode({
      machine = {
        install = {
          image = "ghcr.io/siderolabs/installer:${var.talos_version}"
        }
        certSANs = [
          aws_lb.talos_api.dns_name
        ]
      }
      cluster = {
        allowSchedulingOnControlPlanes = false
        proxy = {
          disabled = true  # Using Cilium for kube-proxy replacement
        }
      }
    })
  ]
}

# Get the Talos machine configuration for workers
data "talos_machine_configuration" "worker" {
  cluster_name     = var.cluster_name
  machine_type     = "worker"
  cluster_endpoint = "https://${aws_lb.talos_api.dns_name}:6443"
  machine_secrets  = talos_machine_secrets.this.machine_secrets

  config_patches = [
    yamlencode({
      machine = {
        install = {
          image = "ghcr.io/siderolabs/installer:${var.talos_version}"
        }
      }
    })
  ]
}

# Apply configuration to control plane nodes
resource "talos_machine_configuration_apply" "controlplane" {
  count = var.controlplane_count

  client_configuration        = talos_machine_secrets.this.client_configuration
  machine_configuration_input = data.talos_machine_configuration.controlplane.machine_configuration
  node                        = aws_instance.controlplane[count.index].private_ip
  endpoint                    = aws_instance.controlplane[count.index].public_ip
}

# Apply configuration to worker nodes
resource "talos_machine_configuration_apply" "worker" {
  count = var.worker_count

  client_configuration        = talos_machine_secrets.this.client_configuration
  machine_configuration_input = data.talos_machine_configuration.worker.machine_configuration
  node                        = aws_instance.worker[count.index].private_ip
  endpoint                    = aws_instance.worker[count.index].public_ip
}

# Bootstrap the cluster on the first control plane node
resource "talos_machine_bootstrap" "this" {
  depends_on = [talos_machine_configuration_apply.controlplane]

  client_configuration = talos_machine_secrets.this.client_configuration
  node                 = aws_instance.controlplane[0].private_ip
  endpoint             = aws_instance.controlplane[0].public_ip
}

# Retrieve the kubeconfig
data "talos_cluster_kubeconfig" "this" {
  depends_on = [talos_machine_bootstrap.this]

  client_configuration = talos_machine_secrets.this.client_configuration
  node                 = aws_instance.controlplane[0].private_ip
  endpoint             = aws_instance.controlplane[0].public_ip
}
```

## Step 4: Create EC2 Instances

```hcl
# instances.tf

# Find the Talos AMI
data "aws_ami" "talos" {
  most_recent = true
  owners      = ["540036508848"]  # Sidero Labs

  filter {
    name   = "name"
    values = ["talos-${var.talos_version}-*-amd64"]
  }
}

# Control plane instances
resource "aws_instance" "controlplane" {
  count = var.controlplane_count

  ami                    = data.aws_ami.talos.id
  instance_type          = var.controlplane_instance_type
  subnet_id              = aws_subnet.talos[count.index % 3].id
  vpc_security_group_ids = [aws_security_group.talos.id]

  root_block_device {
    volume_size = 50
    volume_type = "gp3"
  }

  tags = {
    Name = "${var.cluster_name}-cp-${count.index}"
    Role = "controlplane"
  }
}

# Register control plane instances with the API load balancer
resource "aws_lb_target_group_attachment" "controlplane" {
  count            = var.controlplane_count
  target_group_arn = aws_lb_target_group.talos_api.arn
  target_id        = aws_instance.controlplane[count.index].id
  port             = 6443
}

# Worker instances
resource "aws_instance" "worker" {
  count = var.worker_count

  ami                    = data.aws_ami.talos.id
  instance_type          = var.worker_instance_type
  subnet_id              = aws_subnet.talos[count.index % 3].id
  vpc_security_group_ids = [aws_security_group.talos.id]

  root_block_device {
    volume_size = 100
    volume_type = "gp3"
  }

  tags = {
    Name = "${var.cluster_name}-worker-${count.index}"
    Role = "worker"
  }
}
```

## Step 5: Define Outputs

```hcl
# outputs.tf
output "kubeconfig" {
  description = "Kubeconfig for the cluster"
  value       = data.talos_cluster_kubeconfig.this.kubeconfig_raw
  sensitive   = true
}

output "talosconfig" {
  description = "Talos client configuration"
  value       = talos_machine_secrets.this.client_configuration
  sensitive   = true
}

output "api_endpoint" {
  description = "Kubernetes API endpoint"
  value       = "https://${aws_lb.talos_api.dns_name}:6443"
}

output "controlplane_ips" {
  description = "Control plane node IPs"
  value       = aws_instance.controlplane[*].public_ip
}
```

## Step 6: Deploy the Cluster

```bash
# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Deploy the cluster
terraform apply

# Get the kubeconfig
terraform output -raw kubeconfig > kubeconfig
export KUBECONFIG=./kubeconfig

# Verify the cluster
kubectl get nodes
```

## Step 7: Tear Down

When you no longer need the cluster:

```bash
terraform destroy
```

This removes all resources including VMs, load balancers, and networking.

## Conclusion

Terraform with the Talos provider gives you the most integrated infrastructure-as-code experience for Talos Linux. Your entire cluster, from VPC networking to Kubernetes bootstrap, is defined in HCL files that you can version control, review, and reproduce. The official Talos provider handles the unique aspects of Talos lifecycle management while Terraform handles cloud resource provisioning. This combination makes it practical to spin up and tear down clusters on demand, which is valuable for testing, staging environments, and disaster recovery scenarios.
