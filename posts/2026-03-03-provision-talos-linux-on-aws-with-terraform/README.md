# How to Provision Talos Linux on AWS with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, AWS, Terraform, Kubernetes, Infrastructure as Code

Description: Learn how to provision Talos Linux clusters on AWS using Terraform for repeatable and automated Kubernetes infrastructure deployments.

---

Running Kubernetes on Talos Linux gives you a minimal, secure, and immutable operating system purpose-built for container orchestration. When you combine that with AWS for cloud infrastructure and Terraform for infrastructure as code, you get a production-ready setup that is both repeatable and auditable. This guide walks through the full process of provisioning Talos Linux on AWS using Terraform.

## Why Talos Linux on AWS?

Talos Linux strips away everything you do not need from a traditional Linux distribution. There is no SSH, no shell, and no package manager. The entire operating system is managed through a declarative API. This approach reduces the attack surface dramatically and makes node management consistent across environments.

AWS provides the elastic compute, networking, and storage you need to run Kubernetes at scale. Terraform ties it all together by letting you define your infrastructure in code, version it, and apply changes with confidence.

## Prerequisites

Before you begin, make sure you have the following installed on your workstation:

- Terraform 1.5 or later
- The `talosctl` CLI tool
- AWS CLI configured with appropriate IAM credentials
- An AWS account with permissions to create EC2 instances, VPCs, security groups, and load balancers

You will also need to have the Talos Linux AMI available in your target AWS region. Sidero Labs publishes official AMIs that you can reference directly.

## Project Structure

Set up your Terraform project with a clean directory structure:

```
talos-aws/
  main.tf
  variables.tf
  outputs.tf
  terraform.tfvars
```

## Defining Variables

Start by defining the variables your configuration will use:

```hcl
# variables.tf - Define input variables for the Talos AWS deployment

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "Name of the Talos Kubernetes cluster"
  type        = string
  default     = "talos-cluster"
}

variable "control_plane_count" {
  description = "Number of control plane nodes"
  type        = number
  default     = 3
}

variable "worker_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 3
}

variable "control_plane_instance_type" {
  description = "EC2 instance type for control plane nodes"
  type        = string
  default     = "m5.xlarge"
}

variable "worker_instance_type" {
  description = "EC2 instance type for worker nodes"
  type        = string
  default     = "m5.large"
}

variable "talos_version" {
  description = "Talos Linux version to use"
  type        = string
  default     = "v1.7.0"
}
```

## Setting Up the VPC and Networking

Your Talos nodes need a proper VPC with subnets, an internet gateway, and security groups:

```hcl
# main.tf - Provider and networking configuration

provider "aws" {
  region = var.aws_region
}

# Look up the official Talos AMI
data "aws_ami" "talos" {
  most_recent = true
  owners      = ["540036508848"] # Sidero Labs AWS account

  filter {
    name   = "name"
    values = ["talos-${var.talos_version}-*"]
  }

  filter {
    name   = "architecture"
    values = ["amd64"]
  }
}

# Create a VPC for the cluster
resource "aws_vpc" "talos" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.cluster_name}-vpc"
  }
}

# Create public subnets across availability zones
resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.talos.id
  cidr_block              = "10.0.${count.index}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.cluster_name}-public-${count.index}"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Internet gateway for public access
resource "aws_internet_gateway" "talos" {
  vpc_id = aws_vpc.talos.id

  tags = {
    Name = "${var.cluster_name}-igw"
  }
}
```

## Creating Security Groups

Talos nodes communicate over specific ports. You need security groups that allow the Talos API (port 50000), Kubernetes API (port 6443), and etcd traffic between control plane nodes:

```hcl
# Security group for Talos cluster nodes
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

  # Talos API access from your workstation
  ingress {
    from_port   = 50000
    to_port     = 50000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Kubernetes API access
  ingress {
    from_port   = 6443
    to_port     = 6443
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
```

## Provisioning Control Plane and Worker Nodes

Now create the EC2 instances for both control plane and worker nodes:

```hcl
# Control plane EC2 instances
resource "aws_instance" "control_plane" {
  count         = var.control_plane_count
  ami           = data.aws_ami.talos.id
  instance_type = var.control_plane_instance_type
  subnet_id     = aws_subnet.public[count.index % 3].id

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

# Worker EC2 instances
resource "aws_instance" "worker" {
  count         = var.worker_count
  ami           = data.aws_ami.talos.id
  instance_type = var.worker_instance_type
  subnet_id     = aws_subnet.public[count.index % 3].id

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

## Creating the Load Balancer

Set up a Network Load Balancer for the Kubernetes API endpoint:

```hcl
# NLB for the Kubernetes API
resource "aws_lb" "talos_api" {
  name               = "${var.cluster_name}-api"
  internal           = false
  load_balancer_type = "network"
  subnets            = aws_subnet.public[*].id
}

resource "aws_lb_target_group" "k8s_api" {
  name     = "${var.cluster_name}-k8s-api"
  port     = 6443
  protocol = "TCP"
  vpc_id   = aws_vpc.talos.id
}

resource "aws_lb_target_group_attachment" "cp" {
  count            = var.control_plane_count
  target_group_arn = aws_lb_target_group.k8s_api.arn
  target_id        = aws_instance.control_plane[count.index].id
  port             = 6443
}
```

## Generating Talos Configuration and Bootstrapping

After Terraform creates the infrastructure, generate the Talos machine configuration and bootstrap the cluster:

```bash
# Generate Talos secrets and machine configs
talosctl gen secrets -o secrets.yaml

# Generate configs pointing to the load balancer endpoint
talosctl gen config talos-cluster https://<NLB_DNS>:6443 \
  --with-secrets secrets.yaml

# Apply config to each control plane node
talosctl apply-config --insecure \
  --nodes <CP_IP> \
  --file controlplane.yaml

# Apply config to each worker node
talosctl apply-config --insecure \
  --nodes <WORKER_IP> \
  --file worker.yaml

# Bootstrap the cluster on the first control plane node
talosctl bootstrap --nodes <FIRST_CP_IP> \
  --endpoints <FIRST_CP_IP> \
  --talosconfig talosconfig

# Retrieve the kubeconfig
talosctl kubeconfig --nodes <FIRST_CP_IP> \
  --endpoints <FIRST_CP_IP>
```

## Outputs

Define useful outputs to retrieve after applying:

```hcl
# outputs.tf - Export useful values after provisioning

output "control_plane_ips" {
  value = aws_instance.control_plane[*].public_ip
}

output "worker_ips" {
  value = aws_instance.worker[*].public_ip
}

output "load_balancer_dns" {
  value = aws_lb.talos_api.dns_name
}
```

## Applying the Configuration

Run Terraform to provision everything:

```bash
# Initialize the Terraform project
terraform init

# Preview what will be created
terraform plan

# Apply the configuration
terraform apply
```

## Production Considerations

For a production deployment, consider adding private subnets with NAT gateways to keep worker nodes off the public internet. You should also use a dedicated IAM role for the EC2 instances rather than relying on access keys. Encrypting the EBS volumes with AWS KMS is another good practice.

Storing your Terraform state in an S3 backend with DynamoDB locking ensures that multiple team members can work on the infrastructure safely without stepping on each other.

Talos Linux on AWS with Terraform gives you a solid foundation for running Kubernetes in a way that is secure, reproducible, and easy to manage over time. The combination of an immutable OS with infrastructure as code removes much of the operational burden that comes with traditional Kubernetes deployments.
