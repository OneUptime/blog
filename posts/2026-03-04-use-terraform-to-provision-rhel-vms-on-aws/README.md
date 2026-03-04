# How to Use Terraform to Provision RHEL VMs on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Terraform, AWS, IaC, Automation, Cloud

Description: Use Terraform to declaratively provision RHEL EC2 instances on AWS, including selecting the right AMI and configuring security groups.

---

Terraform makes it easy to provision and manage RHEL instances on AWS in a repeatable, version-controlled way. This guide shows how to write a basic Terraform configuration to launch a RHEL instance.

## Provider Configuration

Create a `main.tf` file:

```hcl
# main.tf - Provision a RHEL instance on AWS

terraform {
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

# Look up the latest official RHEL AMI
data "aws_ami" "rhel9" {
  most_recent = true
  owners      = ["309956199498"] # Red Hat's AWS account

  filter {
    name   = "name"
    values = ["RHEL-9.*_HVM-*-x86_64-*-Hourly*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security group allowing SSH access
resource "aws_security_group" "rhel_sg" {
  name        = "rhel-ssh-access"
  description = "Allow SSH inbound"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Restrict this in production
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Launch the RHEL instance
resource "aws_instance" "rhel" {
  ami                    = data.aws_ami.rhel9.id
  instance_type          = "t3.medium"
  key_name               = "my-key-pair"
  vpc_security_group_ids = [aws_security_group.rhel_sg.id]

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  tags = {
    Name = "rhel9-terraform"
  }
}

output "instance_public_ip" {
  value = aws_instance.rhel.public_ip
}
```

## Deploy the Instance

```bash
# Initialize Terraform and download the AWS provider
terraform init

# Preview the changes
terraform plan

# Apply the configuration
terraform apply -auto-approve
```

## Clean Up

```bash
# Destroy the instance when done
terraform destroy -auto-approve
```

The AMI data source ensures you always get the latest RHEL image. In production, pin to a specific AMI ID for stability.
