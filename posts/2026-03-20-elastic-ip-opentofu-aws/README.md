# How to Create an Elastic IP with OpenTofu on AWS - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Infrastructure as Code, IaC, Elastic IP, Networking

Description: Learn how to allocate and associate AWS Elastic IP addresses with EC2 instances and network interfaces using OpenTofu.

## Introduction

An Elastic IP (EIP) is a static public IPv4 address designed for dynamic cloud computing. Unlike standard public IPs, EIPs persist through instance stop/start cycles. This guide shows how to manage Elastic IPs using OpenTofu.

## Step 1: Allocate an Elastic IP

```hcl
terraform {
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

# Allocate an EIP from Amazon's pool

resource "aws_eip" "app_server" {
  domain = "vpc"  # Allocate a VPC Elastic IP

  tags = {
    Name        = "app-server-eip"
    Environment = "production"
  }
}
```

## Step 2: Associate EIP with an EC2 Instance

```hcl
# Associate the EIP with an EC2 instance
resource "aws_eip_association" "app_server" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app_server.id
}

# Example EC2 instance
resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  subnet_id     = var.public_subnet_id

  # Do NOT auto-assign public IP since we're using EIP
  associate_public_ip_address = false

  tags = {
    Name = "app-server"
  }
}
```

## Step 3: Associate EIP with a Network Interface

```hcl
# For more granular control, associate with a network interface
resource "aws_network_interface" "app" {
  subnet_id       = var.public_subnet_id
  security_groups = [var.security_group_id]

  tags = {
    Name = "app-primary-eni"
  }
}

resource "aws_eip" "eni_eip" {
  domain            = "vpc"
  network_interface = aws_network_interface.app.id

  tags = {
    Name = "app-eni-eip"
  }
}
```

## Step 4: Bring Your Own IP (BYOIP)

```hcl
# Use BYOIP address pool
resource "aws_eip" "byoip" {
  domain           = "vpc"
  public_ipv4_pool = var.byoip_pool_id  # Your BYOIP public IPv4 pool ID

  tags = {
    Name = "byoip-eip"
  }
}
```

## Step 5: Outputs

```hcl
output "elastic_ip" {
  description = "The Elastic IP address"
  value       = aws_eip.app_server.public_ip
}

output "elastic_ip_allocation_id" {
  description = "The EIP allocation ID"
  value       = aws_eip.app_server.allocation_id
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Best Practices

- Release unused EIPs when you no longer need them to avoid unnecessary public IPv4 charges
- Use EIP associations in destroy/create order with lifecycle settings
- Consider using `prevent_destroy = true` in lifecycle to avoid accidental release

## Conclusion

You have successfully created and associated Elastic IP addresses using OpenTofu. EIPs provide stable IP addresses for your instances, enabling DNS records to point to a consistent IP. Remember that AWS charges for all public IPv4 addresses, including Elastic IPs, whether they are associated or not.
