# How to Allocate Elastic IPs for IPv4 Using Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, AWS, Elastic IP, IPv4, EC2, Infrastructure as Code

Description: Allocate and associate AWS Elastic IPs (EIPs) for IPv4 using Terraform, covering EC2 association, NAT gateway allocation, and lifecycle management.

## Introduction

AWS Elastic IPs are static public IPv4 addresses allocated to your account. They persist across EC2 instance stops/starts and can be reassigned between resources. Terraform manages EIP allocation and association declaratively.

## Allocate and Associate with EC2

```hcl
# elastic_ips.tf

resource "aws_eip" "bastion" {
  domain = "vpc"

  tags = {
    Name = "bastion-eip"
  }

  lifecycle {
    prevent_destroy = true  # Protect against accidental deletion
  }
}

resource "aws_eip_association" "bastion" {
  instance_id   = aws_instance.bastion.id
  allocation_id = aws_eip.bastion.id
}

# EC2 instance for bastion

resource "aws_instance" "bastion" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public_a.id

  vpc_security_group_ids = [aws_security_group.bastion.id]

  tags = { Name = "bastion" }
}
```

## Multiple EIPs

```hcl
variable "eip_count" {
  default = 3
}

resource "aws_eip" "app_servers" {
  count  = var.eip_count
  domain = "vpc"

  tags = {
    Name  = "app-server-eip-${count.index + 1}"
    Index = count.index + 1
  }
}

resource "aws_eip_association" "app_servers" {
  count         = var.eip_count
  instance_id   = aws_instance.app[count.index].id
  allocation_id = aws_eip.app_servers[count.index].id
}
```

## EIP for NAT Gateway

```hcl
resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = { Name = "nat-eip" }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_a.id
  depends_on    = [aws_internet_gateway.main]
}
```

## Outputs

```hcl
output "bastion_public_ip" {
  value       = aws_eip.bastion.public_ip
  description = "Bastion host static public IPv4 address"
}

output "nat_gateway_public_ip" {
  value = aws_eip.nat.public_ip
}

output "app_server_public_ips" {
  value = aws_eip.app_servers[*].public_ip
}
```

## Import Existing EIP

```bash
# If you have an existing EIP allocation ID (eipalloc-xxxx)
terraform import aws_eip.bastion eipalloc-0a1b2c3d4e5f67890
```

## EIP Lifecycle Considerations

```hcl
# AWS charges for Elastic IPs whether they are associated or idle
# Use count = 0 to release a dev EIP when the environment is inactive (cost saving)

resource "aws_eip" "dev_server" {
  count  = var.dev_environment_active ? 1 : 0
  domain = "vpc"
}
```

## Conclusion

AWS Elastic IPs in Terraform are allocated with `aws_eip { domain = "vpc" }` and associated with EC2 instances via `aws_eip_association`, or assigned to NAT gateways through the NAT gateway `allocation_id`. Use `prevent_destroy = true` for production EIPs to prevent accidental release. AWS bills Elastic IPs whether they are associated or idle - release them when not in use.
