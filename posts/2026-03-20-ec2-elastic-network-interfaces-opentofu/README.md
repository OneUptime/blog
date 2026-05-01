# How to Configure EC2 Elastic Network Interfaces with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EC2, ENI, Networking, Infrastructure as Code, Multi-Homed

Description: Learn how to create and attach EC2 Elastic Network Interfaces (ENIs) using OpenTofu to enable multi-homed instances, static IP addresses, and network appliance configurations.

## Introduction

Elastic Network Interfaces (ENIs) are virtual network cards that you can create independently and attach to EC2 instances. They retain their attributes when detached and can be moved between instances in the same Availability Zone, making them useful for high-availability appliances, multi-homed instances, and static IP failover.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with EC2 permissions
- An existing VPC and subnets

## Step 1: Create a Standalone ENI

```hcl
# Create an ENI in a private subnet with a static private IP

resource "aws_network_interface" "primary" {
  subnet_id   = var.private_subnet_id
  private_ips = ["10.0.1.50"]  # Optional: specify static IP

  security_groups = [aws_security_group.app.id]

  # Leave source/destination check enabled unless this ENI is used for NAT or routing appliances
  source_dest_check = true

  tags = {
    Name        = "primary-eni"
    Environment = var.environment
  }
}
```

## Step 2: Create Multiple ENIs for a Multi-Homed Instance

```hcl
# Management ENI in management subnet
resource "aws_network_interface" "management" {
  subnet_id       = var.mgmt_subnet_id
  security_groups = [aws_security_group.management.id]

  tags = { Name = "management-eni" }
}

# Data ENI in data subnet for application traffic
resource "aws_network_interface" "data" {
  subnet_id       = var.data_subnet_id
  security_groups = [aws_security_group.data.id]

  # Disable source/dest check for network appliances (NAT, firewall)
  source_dest_check = false

  tags = { Name = "data-eni" }
}
```

## Step 3: Launch an Instance and Attach ENIs

```hcl
# Launch instance with the management ENI as the primary interface
resource "aws_instance" "multi_homed" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"

  # Attach the management ENI as the primary interface
  primary_network_interface {
    network_interface_id = aws_network_interface.management.id
  }

  tags = {
    Name = "multi-homed-instance"
  }
}

# Attach the data ENI as the secondary interface
resource "aws_network_interface_attachment" "data" {
  instance_id          = aws_instance.multi_homed.id
  network_interface_id = aws_network_interface.data.id
  device_index         = 1
}
```

## Step 4: Attach an ENI to an Existing Instance

```hcl
# Attach a pre-existing ENI to a running instance
resource "aws_network_interface_attachment" "extra" {
  instance_id          = aws_instance.multi_homed.id
  network_interface_id = aws_network_interface.primary.id
  device_index         = 2  # eth2
}
```

## Step 5: Associate an Elastic IP with an ENI

```hcl
# Allocate an EIP and associate it with a specific ENI
# This is useful for high-availability: move the EIP to another instance by
# detaching and reattaching the ENI
resource "aws_eip" "app" {
  domain = "vpc"
  tags   = { Name = "app-elastic-ip" }
}

resource "aws_eip_association" "app" {
  network_interface_id = aws_network_interface.primary.id
  allocation_id        = aws_eip.app.id
  private_ip_address   = tolist(aws_network_interface.primary.private_ips)[0]
}
```

## Step 6: Outputs

```hcl
output "management_eni_id" {
  value = aws_network_interface.management.id
}

output "data_eni_private_ip" {
  value = tolist(aws_network_interface.data.private_ips)[0]
}
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

Elastic Network Interfaces provide flexible networking for EC2 instances, enabling management separation, network appliance configurations, and elastic IP failover. For high-availability patterns, create ENIs with attached EIPs in your configuration-when an instance fails, terminate it and launch a replacement in the same Availability Zone that reattaches the same ENI, preserving IP addresses and security group settings.
