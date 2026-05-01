# How to Create an Elastic IP with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Elastic IP, Networking, Infrastructure as Code

Description: Learn how to allocate and associate AWS Elastic IP addresses with OpenTofu for stable public IP addressing of EC2 instances and NAT Gateways.

## Introduction

Elastic IPs (EIPs) are static public IPv4 addresses that persist independently of instances. When an EC2 instance is stopped and restarted, its public IP changes-but an associated Elastic IP stays constant. This is critical for DNS records, firewall whitelists, and any system that references your instance by IP.

## Allocating an Elastic IP

```hcl
resource "aws_eip" "web" {
  domain = "vpc"  # Explicitly allocate a VPC Elastic IP

  tags = {
    Name        = "${var.name}-eip"
    Environment = var.environment
  }
}
```

## Associating with an EC2 Instance

```hcl
resource "aws_eip_association" "web" {
  instance_id   = aws_instance.web.id
  allocation_id = aws_eip.web.id
}
```

## Elastic IP for a NAT Gateway

```hcl
resource "aws_eip" "nat" {
  count  = var.az_count
  domain = "vpc"

  tags = { Name = "${var.name}-nat-eip-${count.index + 1}" }
}

resource "aws_nat_gateway" "main" {
  count         = var.az_count
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = { Name = "${var.name}-nat-${count.index + 1}" }

  # Ensure the Internet Gateway exists before creating the public NAT Gateway
  depends_on = [aws_internet_gateway.main]
}
```

## Important: Elastic IPs Incur Public IPv4 Charges

AWS charges for Elastic IP addresses whether they are associated or disassociated. AWS also charges for other public IPv4 addresses, including the public IPv4 addresses assigned to running instances. Always release unused EIPs:

```hcl
# Best practice: output the EIP so you can track and monitor it

output "web_eip" {
  value       = aws_eip.web.public_ip
  description = "Stable public IP for the web server - update DNS records to point here"
}
```

## Elastic IP with a Network Interface

```hcl
resource "aws_network_interface" "web" {
  subnet_id       = aws_subnet.public.id
  security_groups = [aws_security_group.web.id]
  private_ips     = ["10.0.0.10"]
}

resource "aws_eip" "web_ni" {
  domain                    = "vpc"
  network_interface         = aws_network_interface.web.id
  associate_with_private_ip = "10.0.0.10"
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  primary_network_interface {
    network_interface_id = aws_network_interface.web.id
  }
}
```

## Outputs

```hcl
output "eip_public_ip"  { value = aws_eip.web.public_ip }
output "eip_allocation_id" { value = aws_eip.web.id }
```

## Conclusion

Elastic IPs are a simple but essential tool for maintaining stable IP addresses in AWS. Attach them to instances or NAT Gateways, export their addresses as outputs, and whitelist them in upstream systems. Release Elastic IPs you no longer need-they incur hourly public IPv4 charges whether attached or idle.
