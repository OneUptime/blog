# How to Set Up EC2 Instances with IPv6 Addresses

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, IPv6, Networking, VPC

Description: Complete guide to configuring EC2 instances with IPv6 addresses, including VPC setup, subnet configuration, security groups, and routing for dual-stack networking.

---

IPv4 addresses are a finite resource, and AWS charges for public IPv4 addresses now. IPv6, on the other hand, gives you a virtually unlimited address space at no extra cost per address. Setting up IPv6 on EC2 instances isn't complicated, but it touches several layers of your VPC configuration. Let's walk through the entire process from VPC to running instance.

## Understanding IPv6 in AWS

AWS implements IPv6 as a dual-stack setup. Your instances get both IPv4 and IPv6 addresses and can communicate over either protocol. Unlike IPv4 private addresses, IPv6 addresses in AWS are globally unique and publicly routable by default. There's no concept of "private" IPv6 addresses in the traditional sense, though you can control access with security groups and NACLs.

Key differences from IPv4:
- IPv6 addresses are /128 per instance (from your VPC's /56 block)
- No need for NAT - IPv6 addresses are globally routable
- Security groups and NACLs control access instead of NAT
- Egress-only internet gateways replace NAT gateways for outbound-only IPv6

## Step 1: Enable IPv6 on Your VPC

Your VPC needs an IPv6 CIDR block before any of its resources can use IPv6. AWS assigns an Amazon-provided /56 block to your VPC.

Add an IPv6 CIDR block to an existing VPC:

```bash
# Associate an Amazon-provided IPv6 CIDR block with your VPC
aws ec2 associate-vpc-cidr-block \
  --vpc-id vpc-0abc123def456 \
  --amazon-provided-ipv6-cidr-block
```

Check what block was assigned:

```bash
# View the VPC's IPv6 CIDR block
aws ec2 describe-vpcs \
  --vpc-ids vpc-0abc123def456 \
  --query 'Vpcs[].Ipv6CidrBlockAssociationSet[].Ipv6CidrBlock'
```

You'll get something like `2600:1f18:abc:de00::/56`. This is your VPC's IPv6 range.

## Step 2: Configure Subnets with IPv6

Each subnet needs its own /64 block carved from the VPC's /56. That gives you 256 possible subnets, each with an astronomically large address space.

Associate an IPv6 CIDR with a subnet:

```bash
# Assign a /64 IPv6 CIDR block to a subnet
aws ec2 associate-subnet-cidr-block \
  --subnet-id subnet-0abc123def456 \
  --ipv6-cidr-block "2600:1f18:abc:de01::/64"
```

If you want instances to automatically get IPv6 addresses when they launch, enable auto-assignment:

```bash
# Enable automatic IPv6 address assignment for the subnet
aws ec2 modify-subnet-attribute \
  --subnet-id subnet-0abc123def456 \
  --assign-ipv6-address-on-creation
```

## Step 3: Update Route Tables

Your route tables need entries for IPv6 traffic. For public subnets, point the IPv6 default route at the Internet Gateway.

Add an IPv6 route to the Internet Gateway:

```bash
# Add an IPv6 default route through the Internet Gateway
aws ec2 create-route \
  --route-table-id rtb-0abc123def456 \
  --destination-ipv6-cidr-block ::/0 \
  --gateway-id igw-0abc123def456
```

For private subnets where you want outbound-only IPv6 access (similar to how NAT works for IPv4), create an Egress-Only Internet Gateway:

```bash
# Create an Egress-Only Internet Gateway
aws ec2 create-egress-only-internet-gateway \
  --vpc-id vpc-0abc123def456

# Add a route for outbound IPv6 through the EIGW
aws ec2 create-route \
  --route-table-id rtb-0abc123private \
  --destination-ipv6-cidr-block ::/0 \
  --egress-only-internet-gateway-id eigw-0abc123def456
```

The Egress-Only Internet Gateway allows outbound connections and their responses but blocks unsolicited inbound connections, just like NAT does for IPv4.

## Step 4: Update Security Groups

Security groups need IPv6 rules. Your existing IPv4 rules won't apply to IPv6 traffic.

Add IPv6 rules to allow inbound traffic:

```bash
# Allow SSH over IPv6
aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123def456 \
  --ip-permissions IpProtocol=tcp,FromPort=22,ToPort=22,Ipv6Ranges='[{CidrIpv6=::/0,Description="SSH from anywhere IPv6"}]'

# Allow HTTP over IPv6
aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123def456 \
  --ip-permissions IpProtocol=tcp,FromPort=80,ToPort=80,Ipv6Ranges='[{CidrIpv6=::/0,Description="HTTP from anywhere IPv6"}]'

# Allow HTTPS over IPv6
aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123def456 \
  --ip-permissions IpProtocol=tcp,FromPort=443,ToPort=443,Ipv6Ranges='[{CidrIpv6=::/0,Description="HTTPS from anywhere IPv6"}]'
```

Don't forget to update NACLs too if you're using custom ones. The default NACL allows all IPv6 traffic, but any custom NACLs need explicit IPv6 rules.

## Step 5: Launch an EC2 Instance with IPv6

Now you can launch an instance that gets an IPv6 address.

Launch an instance with an IPv6 address assigned automatically:

```bash
# Launch an instance with automatic IPv6 address assignment
aws ec2 run-instances \
  --image-id ami-0abc123def456 \
  --instance-type t3.medium \
  --key-name my-key \
  --subnet-id subnet-0abc123def456 \
  --security-group-ids sg-0abc123def456 \
  --network-interfaces "DeviceIndex=0,SubnetId=subnet-0abc123def456,Groups=sg-0abc123def456,Ipv6AddressCount=1"
```

The `Ipv6AddressCount=1` parameter tells AWS to assign one IPv6 address. You can assign multiple IPv6 addresses if needed (up to the instance type's limit).

To assign a specific IPv6 address:

```bash
# Launch with a specific IPv6 address
aws ec2 run-instances \
  --image-id ami-0abc123def456 \
  --instance-type t3.medium \
  --key-name my-key \
  --network-interfaces "DeviceIndex=0,SubnetId=subnet-0abc123def456,Groups=sg-0abc123def456,Ipv6Addresses=[{Ipv6Address=2600:1f18:abc:de01::100}]"
```

## Step 6: Verify IPv6 Connectivity

SSH into your instance and verify the IPv6 configuration:

```bash
# Check IPv6 addresses on the instance
ip -6 addr show

# Test IPv6 connectivity
ping6 ipv6.google.com

# Check the default IPv6 route
ip -6 route show default
```

You should see your assigned IPv6 address and be able to ping IPv6 endpoints.

## Adding IPv6 to Existing Instances

If you have running instances that need IPv6 addresses, you can assign them without stopping the instance.

Assign an IPv6 address to a running instance:

```bash
# Assign an IPv6 address to an existing instance's network interface
aws ec2 assign-ipv6-addresses \
  --network-interface-id eni-0abc123def456 \
  --ipv6-address-count 1
```

Then inside the instance, you may need to refresh the network configuration:

```bash
# On Amazon Linux 2, restart networking
sudo systemctl restart network

# On Ubuntu, use netplan
sudo netplan apply

# Or simply request a DHCP refresh
sudo dhclient -6 eth0
```

## Setting Up IPv6 with Terraform

Here's a complete Terraform configuration for a dual-stack VPC with IPv6-enabled instances:

```hcl
resource "aws_vpc" "main" {
  cidr_block                       = "10.0.0.0/16"
  assign_generated_ipv6_cidr_block = true
  enable_dns_support               = true
  enable_dns_hostnames             = true

  tags = { Name = "ipv6-vpc" }
}

resource "aws_subnet" "public" {
  vpc_id                          = aws_vpc.main.id
  cidr_block                      = "10.0.1.0/24"
  ipv6_cidr_block                 = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 1)
  assign_ipv6_address_on_creation = true

  tags = { Name = "ipv6-public-subnet" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  # IPv4 route
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  # IPv6 route
  route {
    ipv6_cidr_block = "::/0"
    gateway_id      = aws_internet_gateway.igw.id
  }
}

resource "aws_instance" "ipv6_instance" {
  ami           = "ami-0abc123def456"
  instance_type = "t3.medium"
  subnet_id     = aws_subnet.public.id

  ipv6_address_count = 1

  tags = { Name = "ipv6-instance" }
}
```

For more Terraform patterns with EC2, check out our guide on [creating EC2 instances with Terraform](https://oneuptime.com/blog/post/2026-02-12-create-ec2-instance-terraform/view).

## IPv6-Only Instances

AWS also supports IPv6-only instances, which don't get any IPv4 address at all. This is useful for backend services that only need to communicate with other IPv6-enabled resources.

Launch an IPv6-only instance:

```bash
# Launch an IPv6-only instance (no IPv4 address)
aws ec2 run-instances \
  --image-id ami-0abc123def456 \
  --instance-type t3.medium \
  --network-interfaces "DeviceIndex=0,SubnetId=subnet-0abc123def456,Groups=sg-0abc123,Ipv6AddressCount=1,AssociatePublicIpAddress=false" \
  --metadata-options "HttpProtocolIpv6=enabled"
```

Note the `HttpProtocolIpv6=enabled` flag - this lets the instance metadata service work over IPv6, which is essential since the instance won't have IPv4 to reach the metadata endpoint at 169.254.169.254.

## Troubleshooting IPv6 Connectivity

**Instance has an IPv6 address but can't reach the internet**: Check the route table. You need a `::/0` route pointing to your Internet Gateway (public subnet) or Egress-Only Internet Gateway (private subnet).

**Can't SSH to instance via IPv6**: Verify your security group has an inbound rule for port 22 with an IPv6 CIDR. IPv4 rules don't apply to IPv6 traffic.

**DNS resolution not returning IPv6 addresses**: Make sure your VPC has DNS support enabled and the domain you're resolving has AAAA records.

**Applications only listening on IPv4**: Some applications default to IPv4. You may need to configure them to listen on `::` (all IPv6 addresses) or `[::]` in their configuration files.

## Wrapping Up

Setting up IPv6 on EC2 involves configuring every layer of the networking stack - VPC, subnets, route tables, security groups, and NACLs. The good news is it's all additive; you don't need to touch your existing IPv4 setup. With AWS now charging for public IPv4 addresses, moving workloads to IPv6 where possible is both technically sound and cost-effective.
