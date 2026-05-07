# How to Configure IPv6 Route Tables in AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IPv6, Route Tables, VPC, Routing, Internet Gateway

Description: Configure AWS VPC route tables with IPv6 routes, including default routes via Internet Gateway for public subnets and Egress-Only Internet Gateway for private subnets.

## Introduction

AWS route tables control IPv6 traffic routing just as they do for IPv4, but IPv6 routes must be added separately. A public subnet needs a `::/0` route via an Internet Gateway to allow inbound and outbound IPv6 traffic. A private subnet that needs outbound-only IPv6 access uses an Egress-Only Internet Gateway (EIGW). Without the appropriate IPv6 routes, IPv6-assigned instances cannot reach the internet over IPv6.

## Add IPv6 Route to Existing Route Table

```bash
# Variables

ROUTE_TABLE_ID="rtb-12345678"
IGW_ID="igw-12345678"

# Add IPv6 default route via Internet Gateway (public subnet)
aws ec2 create-route \
    --route-table-id "$ROUTE_TABLE_ID" \
    --destination-ipv6-cidr-block "::/0" \
    --gateway-id "$IGW_ID"

# Verify routes
aws ec2 describe-route-tables \
    --route-table-ids "$ROUTE_TABLE_ID" \
    --query "RouteTables[0].Routes[?DestinationIpv6CidrBlock!=null]"
```

## Terraform Route Table Configuration

```hcl
# route_tables.tf

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "main-igw" }
}

resource "aws_egress_only_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "main-eigw" }
}

# Public route table (IPv4 + IPv6)
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  # IPv4 default route
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  # IPv6 default route (same IGW for public subnets)
  route {
    ipv6_cidr_block = "::/0"
    gateway_id      = aws_internet_gateway.main.id
  }

  tags = { Name = "public-rt" }
}

# Private route table (IPv4 via NAT, IPv6 via Egress-Only IGW)
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  # IPv4: use NAT Gateway for outbound
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  # IPv6: use Egress-Only IGW (outbound only, no inbound)
  route {
    ipv6_cidr_block        = "::/0"
    egress_only_gateway_id = aws_egress_only_internet_gateway.main.id
  }

  tags = { Name = "private-rt" }
}

# Associate subnets with route tables
resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private_a" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_route_table.private.id
}
```

## Route Table Design Patterns

```text
Public Subnet Route Table:
  0.0.0.0/0   → Internet Gateway (IGW)     [IPv4 inbound+outbound]
  ::/0        → Internet Gateway (IGW)     [IPv6 inbound+outbound]

Private Subnet Route Table:
  0.0.0.0/0   → NAT Gateway               [IPv4 outbound only]
  ::/0        → Egress-Only IGW (EIGW)    [IPv6 outbound only]

Isolated Subnet Route Table:
  (no default route)                       [No internet access]
  vpc-local routes only
```

## Verify IPv6 Routing

```bash
# Check all route tables in VPC for IPv6 routes
aws ec2 describe-route-tables \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query "RouteTables[*].{RTID:RouteTableId, Routes:Routes[?DestinationIpv6CidrBlock!=null].{Dest:DestinationIpv6CidrBlock, GatewayId:GatewayId, EgressOnlyInternetGatewayId:EgressOnlyInternetGatewayId}}"

# From an EC2 instance, test IPv6 routing
# SSH into an instance in the public subnet:
curl -6 -s https://ipv6.icanhazip.com
# If returns an IPv6 address: routing works

# Check if instance has IPv6 address
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" \
    -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
curl -H "X-aws-ec2-metadata-token: $TOKEN" \
    http://169.254.169.254/latest/meta-data/network/interfaces/macs/
# Get MAC then:
curl -H "X-aws-ec2-metadata-token: $TOKEN" \
    "http://169.254.169.254/latest/meta-data/network/interfaces/macs/MAC/ipv6s"
```

## CloudFormation Route Configuration

```yaml
# IPv6 routes in CloudFormation

PublicRouteIPv6:
  Type: AWS::EC2::Route
  Properties:
    RouteTableId: !Ref PublicRouteTable
    DestinationIpv6CidrBlock: "::/0"
    GatewayId: !Ref InternetGateway

PrivateRouteIPv6:
  Type: AWS::EC2::Route
  Properties:
    RouteTableId: !Ref PrivateRouteTable
    DestinationIpv6CidrBlock: "::/0"
    EgressOnlyInternetGatewayId: !Ref EgressOnlyInternetGateway
```

## Conclusion

AWS IPv6 routing requires explicit `::/0` routes in each route table. Public subnets need `::/0 → Internet Gateway` for bidirectional IPv6 traffic. Private subnets that need outbound-only IPv6 access use `::/0 → Egress-Only Internet Gateway`. Unlike IPv4 NAT, IPv6 doesn't require port address translation - the Egress-Only IGW simply blocks inbound-initiated connections to private IPv6 addresses. Always verify routes with `aws ec2 describe-route-tables` and test from actual EC2 instances.
