# How to Use AWS Egress-Only Internet Gateway for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IPv6, Egress-Only Internet Gateway, VPC, Security, Private Subnet

Description: Configure an AWS Egress-Only Internet Gateway (EIGW) to allow private subnet instances to initiate outbound IPv6 connections while blocking all inbound IPv6 traffic.

## Introduction

The AWS Egress-Only Internet Gateway (EIGW) is the IPv6 equivalent of a NAT Gateway for outbound connectivity - it allows instances in private subnets to initiate IPv6 connections to the internet while blocking all inbound connections initiated from outside. Unlike NAT Gateway, which translates addresses, the EIGW maintains IPv6 addresses while simply blocking inbound-initiated flows using stateful connection tracking.

## How EIGW Works

```text
Private Subnet Instance (2600:1f14::100):
  - Can initiate: connections to external IPv6 hosts (outbound)
  - Blocked: external hosts cannot initiate connections to instance
  - Mechanism: EIGW uses stateful tracking, allows only response traffic

vs Internet Gateway (public subnets):
  - Can allow both inbound and outbound IPv6 connections
  - External hosts CAN initiate connections if routes and security controls allow it
```

## Create Egress-Only Internet Gateway

```bash
VPC_ID="vpc-12345678"

# Create EIGW

EIGW_ID=$(aws ec2 create-egress-only-internet-gateway \
    --vpc-id "$VPC_ID" \
    --tag-specifications "ResourceType=egress-only-internet-gateway,Tags=[{Key=Name,Value=main-eigw}]" \
    --query "EgressOnlyInternetGateway.EgressOnlyInternetGatewayId" \
    --output text)

echo "Created EIGW: $EIGW_ID"

# Add IPv6 route to private subnet route table
PRIVATE_RT_ID="rtb-87654321"

aws ec2 create-route \
    --route-table-id "$PRIVATE_RT_ID" \
    --destination-ipv6-cidr-block "::/0" \
    --egress-only-internet-gateway-id "$EIGW_ID"

echo "IPv6 route added to private route table"
```

## Terraform Configuration

```hcl
# eigw.tf

resource "aws_egress_only_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "main-egress-only-igw"
  }
}

# Private route table using EIGW for IPv6
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  # IPv4 outbound via NAT Gateway
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  # IPv6 outbound via Egress-Only IGW (no inbound)
  route {
    ipv6_cidr_block        = "::/0"
    egress_only_gateway_id = aws_egress_only_internet_gateway.main.id
  }

  tags = { Name = "private-rt" }
}

resource "aws_route_table_association" "private_a" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_b" {
  subnet_id      = aws_subnet.private_b.id
  route_table_id = aws_route_table.private.id
}
```

## Testing EIGW Connectivity

```bash
# SSH into a private subnet instance
# Test outbound IPv6 (should work via EIGW)
curl -6 -s https://ipv6.icanhazip.com
# Returns the instance's IPv6 address

# Test outbound IPv6 to a known host
ping6 -c 3 2001:4860:4860::8888
# Should succeed (outbound allowed)

# Test that inbound is blocked
# From an external host, try to connect to the instance's IPv6 address:
# curl https://[2600:1f14::instance-ipv6]/
# Should fail (EIGW blocks internet-initiated inbound connections)
```

## Security Group Considerations

```hcl
# Security groups still apply - EIGW is for routing, not access control

resource "aws_security_group" "private_instances" {
  vpc_id = aws_vpc.main.id
  name   = "private-instance-sg"

  # Outbound IPv6 allowed
  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    ipv6_cidr_blocks = ["::/0"]
  }

  # Inbound from VPC only (no public IPv6 inbound)
  ingress {
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    ipv6_cidr_blocks = [aws_vpc.main.ipv6_cidr_block]
    description      = "HTTPS from within VPC only"
  }

  tags = { Name = "private-instance-sg" }
}
```

## EIGW vs NAT Gateway Comparison

| Feature | Egress-Only IGW (IPv6) | NAT Gateway (IPv4) |
|---------|------------------------|-------------------|
| Outbound traffic | Yes | Yes |
| Inbound initiated | No (blocked) | No (uses translation) |
| Cost | Free | Per-hour + per-GB |
| Address translation | No (keeps IPv6) | Yes (hides private IPv4) |
| IPv6 only | Yes | IPv4 only |

## Conclusion

The Egress-Only Internet Gateway provides secure outbound IPv6 for private subnet instances at no cost (unlike NAT Gateway). It uses stateful connection tracking to allow outbound-initiated connections while blocking externally-initiated inbound connections. Configure it by creating an EIGW, then adding a `::/0` route to private subnet route tables pointing to the EIGW. Security groups provide additional access control on top of the EIGW's routing-level protection.
