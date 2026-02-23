# How to Create EC2 with Elastic IP in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, EC2, Elastic IP, Networking

Description: Step-by-step guide to creating EC2 instances with Elastic IPs in Terraform, including association methods, multiple EIPs, and best practices for static IP management.

---

Public IP addresses assigned to EC2 instances change every time the instance stops and starts. If you need a stable, static IP address - for DNS records, firewall allowlists, or third-party integrations that require a fixed IP - you need an Elastic IP (EIP). Terraform makes it simple to allocate EIPs and associate them with your instances.

## Basic EIP Association

The most straightforward setup is creating an EC2 instance and an Elastic IP, then associating them.

```hcl
# AWS provider configuration
provider "aws" {
  region = "us-east-1"
}

# Create a VPC and public subnet
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name = "main-vpc"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = false  # We'll use EIP instead

  tags = {
    Name = "public-subnet"
  }
}

# Internet gateway for the public subnet
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "main-igw"
  }
}

# Route table with internet access
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "public-rt"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Security group allowing SSH and HTTP
resource "aws_security_group" "web" {
  name_prefix = "web-"
  vpc_id      = aws_vpc.main.id

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

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "web-sg"
  }
}

# Create the EC2 instance
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public.id

  vpc_security_group_ids = [aws_security_group.web.id]

  tags = {
    Name = "web-server"
  }
}

# Allocate an Elastic IP
resource "aws_eip" "web" {
  domain = "vpc"

  tags = {
    Name = "web-server-eip"
  }
}

# Associate the EIP with the instance
resource "aws_eip_association" "web" {
  instance_id   = aws_instance.web.id
  allocation_id = aws_eip.web.id
}
```

After applying, you can get the public IP from the output:

```hcl
# Output the Elastic IP address
output "web_server_public_ip" {
  value       = aws_eip.web.public_ip
  description = "Public IP address of the web server"
}

output "web_server_public_dns" {
  value       = aws_eip.web.public_dns
  description = "Public DNS of the web server"
}
```

## Simplified Approach - EIP with Instance Directly

You can skip the separate association resource by specifying the instance directly on the EIP.

```hcl
# Create the EC2 instance first
resource "aws_instance" "bastion" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public.id
  key_name      = aws_key_pair.admin.key_name

  vpc_security_group_ids = [aws_security_group.bastion.id]

  tags = {
    Name = "bastion-host"
  }
}

# Allocate and associate in one resource
resource "aws_eip" "bastion" {
  instance = aws_instance.bastion.id
  domain   = "vpc"

  tags = {
    Name = "bastion-eip"
  }
}
```

This is more concise but less flexible. If you need to re-associate the EIP with a different instance later, the separate `aws_eip_association` resource gives you more control.

## EIP with Network Interface

For more advanced networking setups, you can associate an EIP with a specific network interface instead of an instance.

```hcl
# Create a network interface
resource "aws_network_interface" "web_primary" {
  subnet_id       = aws_subnet.public.id
  security_groups = [aws_security_group.web.id]

  # Assign a specific private IP
  private_ips = ["10.0.1.50"]

  tags = {
    Name = "web-primary-eni"
  }
}

# Attach the network interface to the instance
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  network_interface {
    device_index         = 0
    network_interface_id = aws_network_interface.web_primary.id
  }

  tags = {
    Name = "web-server"
  }
}

# Associate EIP with the network interface
resource "aws_eip" "web" {
  domain = "vpc"

  tags = {
    Name = "web-eip"
  }
}

resource "aws_eip_association" "web" {
  allocation_id        = aws_eip.web.id
  network_interface_id = aws_network_interface.web_primary.id
}
```

## Multiple EIPs per Instance

Some use cases require multiple public IPs on the same instance. You achieve this by using multiple network interfaces.

```hcl
# Primary network interface
resource "aws_network_interface" "primary" {
  subnet_id       = aws_subnet.public.id
  security_groups = [aws_security_group.multi_ip.id]
  private_ips     = ["10.0.1.10"]

  tags = {
    Name = "primary-eni"
  }
}

# Secondary network interface in the same subnet
resource "aws_network_interface" "secondary" {
  subnet_id       = aws_subnet.public.id
  security_groups = [aws_security_group.multi_ip.id]
  private_ips     = ["10.0.1.11"]

  tags = {
    Name = "secondary-eni"
  }
}

# Instance with both interfaces
resource "aws_instance" "multi_ip" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"  # Must support multiple ENIs

  network_interface {
    device_index         = 0
    network_interface_id = aws_network_interface.primary.id
  }

  network_interface {
    device_index         = 1
    network_interface_id = aws_network_interface.secondary.id
  }

  tags = {
    Name = "multi-ip-server"
  }
}

# EIP for the primary interface
resource "aws_eip" "primary" {
  domain = "vpc"
  tags   = { Name = "primary-eip" }
}

resource "aws_eip_association" "primary" {
  allocation_id        = aws_eip.primary.id
  network_interface_id = aws_network_interface.primary.id
}

# EIP for the secondary interface
resource "aws_eip" "secondary" {
  domain = "vpc"
  tags   = { Name = "secondary-eip" }
}

resource "aws_eip_association" "secondary" {
  allocation_id        = aws_eip.secondary.id
  network_interface_id = aws_network_interface.secondary.id
}
```

## EIPs with for_each

When managing multiple instances with EIPs, use `for_each` to keep things clean.

```hcl
# Define your servers
locals {
  servers = {
    web    = { instance_type = "t3.small", ami = data.aws_ami.amazon_linux.id }
    api    = { instance_type = "t3.medium", ami = data.aws_ami.amazon_linux.id }
    worker = { instance_type = "t3.large", ami = data.aws_ami.amazon_linux.id }
  }
}

# Create instances for each server
resource "aws_instance" "servers" {
  for_each = local.servers

  ami           = each.value.ami
  instance_type = each.value.instance_type
  subnet_id     = aws_subnet.public.id

  vpc_security_group_ids = [aws_security_group.servers.id]

  tags = {
    Name = "${each.key}-server"
  }
}

# Allocate an EIP for each server
resource "aws_eip" "servers" {
  for_each = local.servers

  domain = "vpc"

  tags = {
    Name = "${each.key}-eip"
  }
}

# Associate each EIP with its corresponding instance
resource "aws_eip_association" "servers" {
  for_each = local.servers

  instance_id   = aws_instance.servers[each.key].id
  allocation_id = aws_eip.servers[each.key].id
}

# Output all public IPs as a map
output "server_ips" {
  value = { for k, eip in aws_eip.servers : k => eip.public_ip }
}
```

## Using EIP with DNS

A common pattern is creating a DNS record that points to the Elastic IP.

```hcl
# Look up the hosted zone
data "aws_route53_zone" "main" {
  name = "example.com"
}

# Create an A record pointing to the Elastic IP
resource "aws_route53_record" "web" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "web.example.com"
  type    = "A"
  ttl     = 300
  records = [aws_eip.web.public_ip]
}
```

## Cost and Limits

A few things to keep in mind:

- **EIPs are free** when associated with a running instance
- **EIPs cost money** when allocated but not associated, or when associated with a stopped instance (approximately $0.005/hour as of early 2026)
- Each AWS account has a default limit of **5 EIPs per region** (you can request an increase)
- You are charged for remapping an EIP more than 100 times per month

Add a lifecycle rule to prevent accidental deallocation of important EIPs:

```hcl
# Protect the EIP from accidental deletion
resource "aws_eip" "critical" {
  domain = "vpc"

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name = "production-api-eip"
  }
}
```

## Summary

Elastic IPs give your EC2 instances stable public addresses that survive reboots and stop/start cycles. For simple cases, associate the EIP directly with the instance. For advanced networking, associate it with a network interface. Use `for_each` when you're managing multiple instances. And always tag your EIPs clearly - orphaned EIPs sitting in your account cost money and are easy to lose track of.

For more EC2 networking topics, see our guide on [creating EC2 with multiple network interfaces in Terraform](https://oneuptime.com/blog/post/2026-02-23-create-ec2-with-multiple-network-interfaces-in-terraform/view).
