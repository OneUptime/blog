# How to Install Rancher Using Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Terraform, IaC, Installation, Cloud

Description: Automate your Rancher deployment with Terraform for reproducible and version-controlled infrastructure.

Terraform by HashiCorp is the industry standard for Infrastructure as Code (IaC). Using Terraform to deploy Rancher ensures your installation is reproducible, version-controlled, and can be easily replicated across environments. This guide demonstrates how to provision infrastructure and install Rancher using Terraform on AWS, though the approach applies to any cloud provider.

## Prerequisites

- Terraform 1.5 or later installed
- AWS CLI configured with appropriate credentials
- A DNS-resolvable hostname for Rancher (a domain name is recommended)
- Basic familiarity with Terraform syntax

## Step 1: Set Up the Project Structure

Create a directory for your Terraform configuration:

```bash
mkdir rancher-terraform && cd rancher-terraform
```

## Step 2: Define the Provider Configuration

Create the provider configuration file:

```hcl
# providers.tf

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
  region = var.aws_region
}
```

## Step 3: Define Variables

Create a variables file:

```hcl
# variables.tf
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "key_name" {
  description = "Name of the SSH key pair in AWS"
  type        = string
}

variable "rancher_hostname" {
  description = "Hostname for Rancher"
  type        = string
}

variable "rancher_bootstrap_password" {
  description = "Bootstrap password for Rancher"
  type        = string
  sensitive   = true
  default     = "admin"
}

variable "ssh_private_key_path" {
  description = "Path to the SSH private key"
  type        = string
  default     = "~/.ssh/id_rsa"
}
```

## Step 4: Define the Infrastructure

Create the main configuration file:

```hcl
# main.tf
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_security_group" "rancher" {
  name        = "rancher-sg"
  description = "Security group for Rancher server"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "rancher-sg"
  }
}

resource "aws_instance" "rancher" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.rancher.id]

  root_block_device {
    volume_size = 50
    volume_type = "gp3"
  }

  tags = {
    Name = "rancher-server"
  }
}

resource "aws_eip" "rancher" {
  instance = aws_instance.rancher.id
  domain   = "vpc"

  tags = {
    Name = "rancher-eip"
  }
}
```

## Step 5: Add the Provisioning Script

Create a script that runs on the instance to install K3s, Helm, and Rancher:

```hcl
# provisioner.tf
resource "terraform_data" "install_rancher" {
  depends_on = [aws_eip.rancher]

  triggers_replace = [
    aws_instance.rancher.id,
    aws_eip.rancher.public_ip,
    var.rancher_hostname,
  ]

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(pathexpand(var.ssh_private_key_path))
    host        = aws_eip.rancher.public_ip
  }

  provisioner "remote-exec" {
    inline = [
      "cloud-init status --wait",

      # Install K3s
      "curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644",
      "export KUBECONFIG=/etc/rancher/k3s/k3s.yaml",
      "kubectl wait --for=condition=Ready node --all --timeout=300s",

      # Install Helm
      "curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash",

      # Install cert-manager
      "helm repo add jetstack https://charts.jetstack.io --force-update",
      "helm repo update",
      "helm upgrade --install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --set crds.enabled=true --wait --timeout 10m",

      # Install Rancher
      "helm repo add rancher-stable https://releases.rancher.com/server-charts/stable --force-update",
      "helm repo update",
      "helm upgrade --install rancher rancher-stable/rancher --namespace cattle-system --create-namespace --set hostname=${var.rancher_hostname} --set bootstrapPassword=${var.rancher_bootstrap_password} --set replicas=1 --wait --timeout 10m",
    ]
  }
}
```

## Step 6: Define Outputs

```hcl
# outputs.tf
output "rancher_public_ip" {
  description = "Public IP of the Rancher server"
  value       = aws_eip.rancher.public_ip
}

output "rancher_url" {
  description = "URL to access Rancher"
  value       = "https://${var.rancher_hostname}"
}
```

## Step 7: Create a tfvars File

```hcl
# terraform.tfvars
aws_region        = "us-east-1"
instance_type     = "t3.medium"
key_name          = "your-key-pair"
rancher_hostname  = "rancher.example.com"
ssh_private_key_path = "~/.ssh/id_rsa"
```

## Step 8: Deploy

Initialize and apply the Terraform configuration:

```bash
terraform init
terraform plan
terraform apply
```

Review the plan and confirm when prompted. Terraform will create the infrastructure and install Rancher.

## Step 9: Access Rancher

After the apply completes, get the public IP from the Terraform output:

```bash
terraform output rancher_public_ip
```

Configure your DNS to point to this IP and access `https://rancher.example.com` in your browser.

## Destroying the Infrastructure

When you no longer need the Rancher installation:

```bash
terraform destroy
```

This cleanly removes all AWS resources created by Terraform.

## Summary

You have deployed Rancher using Terraform, giving you a fully automated and reproducible installation process. The Terraform configuration can be stored in version control, shared with team members, and applied across multiple environments. This IaC approach makes it easy to rebuild your Rancher installation or replicate it in different regions or cloud providers.
