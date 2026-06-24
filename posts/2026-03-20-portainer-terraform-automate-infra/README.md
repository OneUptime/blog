# How to Automate Portainer Infrastructure with Terraform - Infra

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Terraform, Automation, Infrastructure, DevOps

Description: Learn how to fully automate Portainer infrastructure provisioning using Terraform, integrating it with cloud infrastructure provisioning for end-to-end automated deployments.

## Introduction

The ultimate goal of using Terraform with Portainer is full automation: provision a server, install Portainer, configure it, and deploy applications with repeatable Terraform workflows. In practice, Portainer provider settings must be known before apply, so this is typically split into an infrastructure stage and a Portainer stage. This guide shows how to integrate Portainer Terraform with cloud infrastructure providers for end-to-end automated deployments.

## Prerequisites

- Terraform v1.0+
- Cloud provider account (AWS/GCP/Azure) or on-premises servers
- Portainer Terraform provider (`portainer/portainer`)
- Ability to install Docker on target servers

## Step 1: Full Stack Architecture

```text
Terraform Workflow:
  1. Infra stage: Provision EC2/VM
  2. Infra stage: cloud-init installs Docker + Portainer
  3. Portainer stage: Configure Portainer
  4. Portainer stage: Deploy application stacks
```

## Step 2: Provision a Server with Docker and Portainer

```hcl
# infra/server.tf - Provision EC2 with Docker and Portainer

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Security group

resource "aws_security_group" "portainer" {
  name        = "portainer-sg"
  description = "Allow Portainer and Docker traffic"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]  # Restrict SSH to admin IP
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 9443
    to_port     = 9443
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]  # Restrict Portainer to admin IP
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# EC2 instance with Portainer
resource "aws_instance" "portainer_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  key_name               = var.ssh_key_name
  vpc_security_group_ids = [aws_security_group.portainer.id]
  subnet_id              = var.subnet_id

  user_data = templatefile("${path.module}/cloud-init.sh", {
    portainer_admin_pass = var.portainer_admin_pass
    portainer_version    = var.portainer_version
  })

  tags = {
    Name        = "portainer-server"
    ManagedBy   = "terraform"
    Environment = "production"
  }
}

# Latest Ubuntu AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-*-22.04-amd64-server-*"]
  }
}
```

## Step 3: Cloud-Init Bootstrap Script

```bash
#!/bin/bash
# cloud-init.sh - Bootstrap script run on first boot

set -euo pipefail

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Docker Compose v2
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Create Portainer data directory
mkdir -p /opt/portainer/data

# Start Portainer
docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /opt/portainer/data:/data \
  portainer/portainer-ce:${portainer_version}

# Wait for Portainer to start
until curl -skf https://localhost:9443/api/system/status >/dev/null; do
  sleep 5
done

# Initialize admin user
curl -sk -X POST https://localhost:9443/api/users/admin/init \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"${portainer_admin_pass}"}'

echo "Portainer initialized!"
```

## Step 4: Configure Portainer After Server Provisioning

```hcl
# portainer/portainer_config.tf - Run in a separate Terraform root module after the server is provisioned

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    portainer = {
      source = "portainer/portainer"
    }
  }
}

# Configure Portainer provider using the server URL from the infra stage
provider "portainer" {
  endpoint        = var.portainer_endpoint
  api_user        = "admin"
  api_password    = var.portainer_admin_pass
  skip_ssl_verify = true  # Self-signed cert initially
}

# Register the local Docker environment
resource "portainer_environment" "local" {
  name                = "production-local"
  environment_address = "unix:///var/run/docker.sock"
  type                = 1
}

# Deploy monitoring stack immediately
resource "portainer_stack" "monitoring" {
  depends_on = [portainer_environment.local]

  name            = "monitoring"
  deployment_type = "standalone"
  method          = "string"
  endpoint_id     = portainer_environment.local.id

  stack_file_content = file("${path.module}/stacks/monitoring/docker-compose.yml")
}

# Deploy application stack
resource "portainer_stack" "application" {
  depends_on = [portainer_stack.monitoring]

  name            = "myapp"
  deployment_type = "standalone"
  method          = "string"
  endpoint_id     = portainer_environment.local.id

  stack_file_content = templatefile("${path.module}/stacks/myapp/docker-compose.yml", {
    image_tag = var.app_image_tag
    domain    = var.app_domain
  })

  env {
    name  = "DATABASE_URL"
    value = var.database_url
  }

  env {
    name  = "APP_SECRET"
    value = var.app_secret
  }
}
```

## Step 5: Outputs

```hcl
# infra/outputs.tf

output "portainer_url" {
  description = "Portainer management URL"
  value       = "https://${aws_instance.portainer_server.public_ip}:9443"
}

output "server_ip" {
  description = "Server public IP"
  value       = aws_instance.portainer_server.public_ip
}

output "ssh_command" {
  description = "SSH command to access the server"
  value       = "ssh ubuntu@${aws_instance.portainer_server.public_ip}"
}
```

## Step 6: Apply the Full Stack

```bash
# Stage 1 - infra root module
terraform -chdir=infra init

# Set required infra variables
export TF_VAR_portainer_admin_pass="SecureAdminPass123!"
export TF_VAR_portainer_version="lts"
export TF_VAR_vpc_id="vpc-..."
export TF_VAR_subnet_id="subnet-..."
export TF_VAR_ssh_key_name="my-key"
export TF_VAR_admin_cidr="203.0.113.10/32"

# Apply - provision server and bootstrap Portainer
terraform -chdir=infra apply

# Stage 2 - Portainer root module
export TF_VAR_portainer_endpoint="$(terraform -chdir=infra output -raw portainer_url)"
export TF_VAR_app_image_tag="v1.2.3"
export TF_VAR_app_domain="app.example.com"
export TF_VAR_database_url="postgresql://..."
export TF_VAR_app_secret="replace-me"

until curl -skf "${TF_VAR_portainer_endpoint}/api/system/status" >/dev/null; do
  sleep 5
done

terraform -chdir=portainer init
terraform -chdir=portainer apply

# Get Portainer URL
echo "${TF_VAR_portainer_endpoint}"
```

## Conclusion

Fully automated Portainer infrastructure with Terraform creates a repeatable path from "empty cloud account" to "running application" in a small number of Terraform stages. Cloud provider resources provision the server, cloud-init bootstraps Docker and Portainer, and a second Terraform stage using the Portainer provider handles configuration and application deployment. This end-to-end automation is the foundation for disaster recovery, multi-region deployments, and consistent environment provisioning across development, staging, and production.
