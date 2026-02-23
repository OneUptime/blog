# How to Create EC2 with Multiple Network Interfaces in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, EC2, Networking, ENI

Description: A hands-on guide to creating EC2 instances with multiple network interfaces (ENIs) in Terraform for multi-homed servers, network isolation, and advanced networking patterns.

---

Most EC2 instances get by with a single network interface. But some architectures need more. Maybe you want separate interfaces for management traffic and application traffic, or you need an instance sitting in two subnets for network bridging, or your compliance requirements demand separate interfaces for different security zones.

Terraform lets you define Elastic Network Interfaces (ENIs) as independent resources and attach them to your EC2 instances. This gives you fine-grained control over IP addressing, security groups, and subnet placement for each interface.

## Why Multiple Network Interfaces

Before jumping into code, here are the common reasons for multiple ENIs:

- **Network segmentation** - Management traffic on one interface, application traffic on another
- **Multi-homed instances** - An instance that bridges two subnets
- **Separate security groups per interface** - Different firewall rules for different traffic types
- **Multiple public IPs** - Each ENI can have its own Elastic IP
- **MAC-based licensing** - Some software licenses tie to a MAC address, and ENIs have persistent MACs
- **Failover** - Move an ENI (and its IP) from a failed instance to a healthy one

## Instance Type Limits

Not every instance type supports the same number of network interfaces. Here are some common limits:

| Instance Type | Max ENIs | Max IPs per ENI |
|--------------|----------|-----------------|
| t3.micro     | 2        | 2               |
| t3.small     | 3        | 4               |
| t3.medium    | 3        | 6               |
| t3.large     | 3        | 12              |
| m5.large     | 3        | 10              |
| m5.xlarge    | 4        | 15              |
| c5.2xlarge   | 4        | 15              |

Check the [AWS documentation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-eni.html) for the full list.

## Basic Multi-ENI Setup

Let's create an instance with two network interfaces - one in a public subnet and one in a private subnet.

```hcl
provider "aws" {
  region = "us-east-1"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name = "multi-eni-vpc"
  }
}

# Public subnet for the primary interface
resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "public-subnet"
  }
}

# Private subnet for the secondary interface
resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1a"  # Must be same AZ as public subnet

  tags = {
    Name = "private-subnet"
  }
}

# Security group for the public interface (web traffic)
resource "aws_security_group" "public" {
  name_prefix = "public-"
  vpc_id      = aws_vpc.main.id

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

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "public-eni-sg"
  }
}

# Security group for the private interface (management traffic)
resource "aws_security_group" "private" {
  name_prefix = "private-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]  # SSH only from within VPC
  }

  ingress {
    from_port   = 9100
    to_port     = 9100
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]  # Prometheus metrics
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["10.0.0.0/16"]
  }

  tags = {
    Name = "private-eni-sg"
  }
}

# Primary ENI in the public subnet
resource "aws_network_interface" "public" {
  subnet_id       = aws_subnet.public.id
  security_groups = [aws_security_group.public.id]
  private_ips     = ["10.0.1.100"]

  tags = {
    Name = "primary-eni"
  }
}

# Secondary ENI in the private subnet
resource "aws_network_interface" "private" {
  subnet_id       = aws_subnet.private.id
  security_groups = [aws_security_group.private.id]
  private_ips     = ["10.0.2.100"]

  tags = {
    Name = "secondary-eni"
  }
}

# EC2 instance with both interfaces attached
resource "aws_instance" "multi_eni" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"  # Supports 3 ENIs

  # Primary network interface
  network_interface {
    device_index         = 0
    network_interface_id = aws_network_interface.public.id
  }

  # Secondary network interface
  network_interface {
    device_index         = 1
    network_interface_id = aws_network_interface.private.id
  }

  tags = {
    Name = "multi-eni-instance"
  }
}
```

Important: both ENIs must be in the **same availability zone** as the instance. This is a hard AWS requirement.

## Configuring the OS for Multiple Interfaces

When you attach multiple ENIs, the operating system needs to be configured to handle routing properly. Without this, traffic arriving on the secondary interface may try to leave through the primary interface and get dropped.

```hcl
# User data script to configure routing for the secondary interface
resource "aws_instance" "multi_eni" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"

  network_interface {
    device_index         = 0
    network_interface_id = aws_network_interface.public.id
  }

  network_interface {
    device_index         = 1
    network_interface_id = aws_network_interface.private.id
  }

  user_data = <<-EOF
    #!/bin/bash
    set -euxo pipefail

    # Wait for the secondary interface to be available
    while ! ip link show eth1 2>/dev/null; do
      sleep 1
    done

    # Configure the secondary interface
    cat > /etc/sysconfig/network-scripts/ifcfg-eth1 <<IFCFG
    DEVICE=eth1
    BOOTPROTO=dhcp
    ONBOOT=yes
    TYPE=Ethernet
    DEFROUTE=no
    IFCFG

    # Bring up the secondary interface
    ifup eth1

    # Add a routing table for the secondary interface
    echo "100 management" >> /etc/iproute2/rt_tables

    # Get the secondary interface IP and gateway
    SECONDARY_IP=$(ip addr show eth1 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)
    GATEWAY=$(echo $SECONDARY_IP | awk -F. '{print $1"."$2"."$3".1"}')

    # Add routing rules for the secondary interface
    ip route add default via $GATEWAY dev eth1 table management
    ip rule add from $SECONDARY_IP table management

    echo "Secondary interface configured successfully"
  EOF

  tags = {
    Name = "multi-eni-configured"
  }
}
```

## Dynamic ENI Attachment

Sometimes you want to manage ENI attachment separately from instance creation, for example to move an ENI between instances during failover.

```hcl
# Create the ENI independently
resource "aws_network_interface" "floating" {
  subnet_id       = aws_subnet.private.id
  security_groups = [aws_security_group.private.id]
  private_ips     = ["10.0.2.200"]

  tags = {
    Name = "floating-eni"
  }

  # Prevent destruction when moving between instances
  lifecycle {
    create_before_destroy = true
  }
}

# Attach it to an instance as a separate resource
resource "aws_network_interface_attachment" "floating" {
  instance_id          = aws_instance.primary.id
  network_interface_id = aws_network_interface.floating.id
  device_index         = 1
}
```

Using `aws_network_interface_attachment` as a separate resource lets you change the `instance_id` to move the ENI (and its IP address) to a different instance without destroying and recreating the ENI.

## Multiple IPs on a Single ENI

Each ENI can have multiple private IP addresses. This is useful for hosting multiple services on different IPs.

```hcl
# ENI with multiple private IPs
resource "aws_network_interface" "multi_ip" {
  subnet_id       = aws_subnet.public.id
  security_groups = [aws_security_group.web.id]

  # Assign multiple private IPs
  private_ips     = ["10.0.1.10", "10.0.1.11", "10.0.1.12"]
  private_ips_count = 0  # Set to 0 when using explicit IPs

  tags = {
    Name = "multi-ip-eni"
  }
}

# Or let AWS assign secondary IPs automatically
resource "aws_network_interface" "auto_ip" {
  subnet_id         = aws_subnet.public.id
  security_groups   = [aws_security_group.web.id]
  private_ips_count = 3  # AWS assigns 3 secondary IPs automatically

  tags = {
    Name = "auto-ip-eni"
  }
}
```

## Source/Destination Check

By default, AWS drops traffic not addressed to or from an ENI's assigned IPs. For NAT instances, VPN servers, or any instance doing packet forwarding, you need to disable this.

```hcl
# NAT instance ENI with source/dest check disabled
resource "aws_network_interface" "nat" {
  subnet_id         = aws_subnet.public.id
  security_groups   = [aws_security_group.nat.id]
  source_dest_check = false  # Required for NAT functionality

  tags = {
    Name = "nat-eni"
  }
}
```

## Module for Reusable Multi-ENI Instances

Wrap the pattern in a module for reuse across your organization.

```hcl
# modules/multi-eni-instance/variables.tf
variable "name" {
  type = string
}

variable "instance_type" {
  type = string
}

variable "ami_id" {
  type = string
}

variable "interfaces" {
  type = list(object({
    subnet_id       = string
    security_groups = list(string)
    private_ip      = optional(string)
  }))
  description = "List of network interfaces to create and attach"
}

# modules/multi-eni-instance/main.tf
resource "aws_network_interface" "this" {
  count = length(var.interfaces)

  subnet_id       = var.interfaces[count.index].subnet_id
  security_groups = var.interfaces[count.index].security_groups
  private_ips     = var.interfaces[count.index].private_ip != null ? [var.interfaces[count.index].private_ip] : null

  tags = {
    Name = "${var.name}-eni-${count.index}"
  }
}

resource "aws_instance" "this" {
  ami           = var.ami_id
  instance_type = var.instance_type

  dynamic "network_interface" {
    for_each = aws_network_interface.this
    content {
      device_index         = network_interface.key
      network_interface_id = network_interface.value.id
    }
  }

  tags = {
    Name = var.name
  }
}
```

Use the module:

```hcl
module "web_server" {
  source = "./modules/multi-eni-instance"

  name          = "web-server"
  instance_type = "t3.medium"
  ami_id        = data.aws_ami.amazon_linux.id

  interfaces = [
    {
      subnet_id       = aws_subnet.public.id
      security_groups = [aws_security_group.web.id]
      private_ip      = "10.0.1.50"
    },
    {
      subnet_id       = aws_subnet.private.id
      security_groups = [aws_security_group.mgmt.id]
      private_ip      = "10.0.2.50"
    }
  ]
}
```

## Summary

Multiple network interfaces give you flexibility for network segmentation, multi-homing, failover patterns, and per-interface security groups. The main constraints are that all ENIs must be in the same AZ, and your instance type determines how many ENIs you can attach. Don't forget to configure OS-level routing when using multiple interfaces, otherwise return traffic may take the wrong path.

For related networking patterns, check out our guide on [creating EC2 with Elastic IP in Terraform](https://oneuptime.com/blog/post/2026-02-23-create-ec2-with-elastic-ip-in-terraform/view) and [configuring Network ACLs](https://oneuptime.com/blog/post/2026-02-23-configure-network-acls-with-terraform/view).
