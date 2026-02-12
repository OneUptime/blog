# How to Set Up a VPC with IPv6 Support

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Networking, IPv6

Description: Step-by-step guide to enabling IPv6 in your AWS VPC, including CIDR assignment, subnet configuration, route tables, security groups, and egress-only internet gateways.

---

IPv6 in AWS VPCs is no longer a "nice to have" - it's increasingly necessary. AWS charges for public IPv4 addresses now, some services and partners require IPv6 connectivity, and the global IPv4 pool has been exhausted for years. Setting up a dual-stack VPC (one that supports both IPv4 and IPv6) is straightforward once you understand the key differences in how IPv6 networking works.

Let's build a dual-stack VPC from scratch.

## How IPv6 Differs from IPv4 in AWS

A few important differences to understand before we start:

- IPv6 addresses in AWS are globally unique and publicly routable. There's no concept of "private" IPv6 addresses the way private IPv4 ranges work (though there are now VPC-specific IPv6 CIDR blocks using unique local addresses).
- NAT doesn't exist in IPv6. Instead, you use an egress-only internet gateway for outbound-only traffic.
- IPv6 CIDR blocks are /56 for VPCs and /64 for subnets.
- Security groups and NACLs work the same way for IPv6, but you need separate rules for IPv6 traffic.

## Creating a Dual-Stack VPC

First, create a VPC with both IPv4 and IPv6 CIDR blocks.

```bash
# Create a VPC with an IPv4 CIDR and request an Amazon-provided IPv6 CIDR
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --amazon-provided-ipv6-cidr-block \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=dual-stack-vpc}]'
```

AWS assigns a /56 IPv6 CIDR block to your VPC from Amazon's pool. You can also bring your own IPv6 addresses (BYOIP) if you have an allocated range.

Check the assigned IPv6 CIDR.

```bash
# Get the IPv6 CIDR block assigned to your VPC
aws ec2 describe-vpcs \
  --vpc-ids vpc-0abc123def456789 \
  --query 'Vpcs[0].Ipv6CidrBlockAssociationSet[0].Ipv6CidrBlock'

# Example output: "2600:1f18:2551:8900::/56"
```

## Creating Dual-Stack Subnets

Each subnet gets a /64 from your VPC's /56. That gives you 256 possible subnets, and each subnet gets a virtually unlimited number of addresses.

```bash
# Create a public subnet with both IPv4 and IPv6
aws ec2 create-subnet \
  --vpc-id vpc-0abc123def456789 \
  --cidr-block 10.0.1.0/24 \
  --ipv6-cidr-block 2600:1f18:2551:8901::/64 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=public-subnet-a}]'

# Create a private subnet
aws ec2 create-subnet \
  --vpc-id vpc-0abc123def456789 \
  --cidr-block 10.0.2.0/24 \
  --ipv6-cidr-block 2600:1f18:2551:8902::/64 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=private-subnet-a}]'
```

Enable auto-assignment of IPv6 addresses so instances get an IPv6 address automatically when launched.

```bash
# Enable auto-assign IPv6 addresses on the subnet
aws ec2 modify-subnet-attribute \
  --subnet-id subnet-public-a \
  --assign-ipv6-address-on-creation
```

## Configuring Route Tables

For IPv6, you need separate route entries. The internet gateway handles both IPv4 and IPv6 traffic for public subnets.

```bash
# Add an IPv6 default route to the public route table
aws ec2 create-route \
  --route-table-id rtb-public \
  --destination-ipv6-cidr-block ::/0 \
  --gateway-id igw-0abc123def456789
```

For private subnets, instead of a NAT gateway (which doesn't support IPv6), you use an egress-only internet gateway. This allows instances to initiate outbound IPv6 connections but prevents inbound connections from the internet.

```bash
# Create an egress-only internet gateway
aws ec2 create-egress-only-internet-gateway \
  --vpc-id vpc-0abc123def456789

# Add an IPv6 default route through the egress-only gateway
aws ec2 create-route \
  --route-table-id rtb-private \
  --destination-ipv6-cidr-block ::/0 \
  --egress-only-internet-gateway-id eigw-0abc123def456789
```

The egress-only internet gateway is the IPv6 equivalent of a NAT gateway - it lets traffic out but not in. The difference is that it doesn't do address translation (because IPv6 addresses are globally unique).

## Updating Security Groups for IPv6

Security groups need separate rules for IPv6 traffic. If you have a rule allowing HTTP from 0.0.0.0/0, that only covers IPv4. You need a matching rule for ::/0.

```bash
# Allow inbound HTTP from all IPv6 addresses
aws ec2 authorize-security-group-ingress \
  --group-id sg-webserver \
  --ip-permissions IpProtocol=tcp,FromPort=80,ToPort=80,Ipv6Ranges='[{CidrIpv6=::/0}]'

# Allow inbound HTTPS from all IPv6 addresses
aws ec2 authorize-security-group-ingress \
  --group-id sg-webserver \
  --ip-permissions IpProtocol=tcp,FromPort=443,ToPort=443,Ipv6Ranges='[{CidrIpv6=::/0}]'

# Allow ICMPv6 (needed for IPv6 to function properly)
aws ec2 authorize-security-group-ingress \
  --group-id sg-webserver \
  --ip-permissions IpProtocol=58,FromPort=-1,ToPort=-1,Ipv6Ranges='[{CidrIpv6=::/0}]'
```

ICMPv6 is more important than ICMP in IPv4 - IPv6 relies on ICMPv6 for neighbor discovery (the equivalent of ARP), path MTU discovery, and other essential functions. Blocking ICMPv6 entirely will break IPv6 connectivity.

## Updating NACLs for IPv6

Similarly, NACLs need IPv6 rules alongside your IPv4 ones.

```bash
# Allow inbound HTTP over IPv6
aws ec2 create-network-acl-entry \
  --network-acl-id acl-0123456789abcdef0 \
  --rule-number 105 \
  --protocol tcp \
  --port-range From=80,To=80 \
  --ipv6-cidr-block ::/0 \
  --rule-action allow \
  --ingress

# Allow inbound ephemeral ports over IPv6
aws ec2 create-network-acl-entry \
  --network-acl-id acl-0123456789abcdef0 \
  --rule-number 145 \
  --protocol tcp \
  --port-range From=1024,To=65535 \
  --ipv6-cidr-block ::/0 \
  --rule-action allow \
  --ingress
```

## Complete Terraform Configuration

Here's a complete dual-stack VPC setup in Terraform.

```hcl
resource "aws_vpc" "main" {
  cidr_block                       = "10.0.0.0/16"
  assign_generated_ipv6_cidr_block = true
  enable_dns_support               = true
  enable_dns_hostnames             = true

  tags = {
    Name = "dual-stack-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_egress_only_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_subnet" "public" {
  vpc_id                          = aws_vpc.main.id
  cidr_block                      = "10.0.1.0/24"
  ipv6_cidr_block                 = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 1)
  assign_ipv6_address_on_creation = true
  availability_zone               = "us-east-1a"

  tags = {
    Name = "public-subnet"
  }
}

resource "aws_subnet" "private" {
  vpc_id                          = aws_vpc.main.id
  cidr_block                      = "10.0.2.0/24"
  ipv6_cidr_block                 = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 2)
  assign_ipv6_address_on_creation = true
  availability_zone               = "us-east-1a"

  tags = {
    Name = "private-subnet"
  }
}

# Public route table with IPv4 and IPv6 routes
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  route {
    ipv6_cidr_block = "::/0"
    gateway_id      = aws_internet_gateway.main.id
  }
}

# Private route table with egress-only gateway for IPv6
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    ipv6_cidr_block                = "::/0"
    egress_only_gateway_id         = aws_egress_only_internet_gateway.main.id
  }
}
```

## Testing IPv6 Connectivity

Once your instances are running in the dual-stack VPC, verify IPv6 connectivity.

```bash
# Check IPv6 address on the instance
ip -6 addr show

# Test IPv6 connectivity
ping6 ipv6.google.com

# Test that your web server is reachable over IPv6
curl -6 http://[2600:1f18:2551:8901::1234]
```

## Migration Considerations

If you're adding IPv6 to an existing VPC, the process is non-disruptive. You can add an IPv6 CIDR to an existing VPC and then add IPv6 CIDRs to individual subnets incrementally. Your IPv4 traffic continues to flow normally throughout the process.

```bash
# Add IPv6 to an existing VPC
aws ec2 associate-vpc-cidr-block \
  --vpc-id vpc-existing \
  --amazon-provided-ipv6-cidr-block
```

Remember to update your security groups and NACLs as you enable IPv6 on each subnet, or IPv6 traffic will be blocked by the default deny rules. For security group details, see https://oneuptime.com/blog/post/security-groups-stateful-filtering/view.

IPv6 is the future of networking, and AWS makes it straightforward to adopt. Start with new VPCs as dual-stack, and migrate existing ones incrementally. The cost savings from reducing IPv4 address usage alone make it worth the effort.
