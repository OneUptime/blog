# How to Configure NAT on AWS VPC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, AWS, VPC, Cloud

Description: Learn how to configure NAT Gateway and NAT Instances in AWS VPC to give private subnet resources outbound internet access.

## AWS NAT Options

| Option | Managed | Cost | Bandwidth | Use Case |
|--------|---------|------|-----------|---------|
| NAT Gateway | Yes (AWS managed) | Higher | Up to 100 Gbps | Production |
| NAT Instance | No (you manage EC2) | Lower | Instance type limited | Dev/cost optimization |
| Internet Gateway | N/A (for public subnets) | Free | No limit | Public-facing resources |

## Architecture Overview

```text
Public Subnet:
  Internet Gateway → NAT Gateway (gets Elastic IP)
  
Private Subnet:
  EC2 instances → Route table → NAT Gateway → Internet
```

## Configuring NAT Gateway

### Using AWS Console

1. **VPC → NAT Gateways → Create NAT Gateway**
2. Select **Public Subnet** (NAT Gateway must be in public subnet)
3. Allocate or select an **Elastic IP**
4. Click **Create NAT Gateway**
5. Wait for state to become **Available**

### Update Private Subnet Route Table

1. **VPC → Route Tables**
2. Select the route table for your private subnet
3. Add route:
   - Destination: `0.0.0.0/0`
   - Target: `nat-XXXXXXXX` (your NAT Gateway)

### Using AWS CLI

```bash
# Allocate Elastic IP

aws ec2 allocate-address --domain vpc

# Create NAT Gateway
aws ec2 create-nat-gateway \
    --subnet-id subnet-XXXXXXXX \
    --allocation-id eipalloc-XXXXXXXX

# Update route table to use NAT Gateway
aws ec2 create-route \
    --route-table-id rtb-XXXXXXXX \
    --destination-cidr-block 0.0.0.0/0 \
    --nat-gateway-id nat-XXXXXXXX
```

### Using Terraform

```hcl
# Elastic IP for NAT
resource "aws_eip" "nat" {
  domain = "vpc"
}

# NAT Gateway in public subnet
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id
  
  tags = {
    Name = "main-nat"
  }
}

# Route in private subnet
resource "aws_route" "private_nat" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main.id
}
```

## Configuring a NAT Instance (Cost-Efficient Alternative)

```bash
# Launch an Amazon Linux 2 instance in the public subnet
# Assign it an Elastic IP or public IP

# On the NAT instance:
# 1. Disable source/destination check (via EC2 console or CLI)
aws ec2 modify-instance-attribute \
    --instance-id i-XXXXXXXXX \
    --source-dest-check '{"Value": false}'

# 2. Configure NAT on the instance
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
sysctl -p
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# 3. Point private subnet default route to NAT instance ENI
```

## Verifying NAT Works

```bash
# From a private EC2 instance (no public IP):
curl -s https://ifconfig.me
# Should return the NAT Gateway's Elastic IP

# Test DNS resolution
dig google.com

# Test HTTPS
curl -I https://aws.amazon.com
```

## NAT Gateway Cost Optimization

```hcl
# Use one NAT Gateway per AZ for HA
# But for dev/test, one NAT Gateway is sufficient

# Per-AZ NAT setup (Terraform)
resource "aws_nat_gateway" "per_az" {
  count         = length(var.availability_zones)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
}
```

## Key Takeaways

- AWS NAT Gateway is fully managed but costs more than a NAT instance.
- NAT Gateway must be placed in a **public subnet** with an Internet Gateway.
- Update private subnet route tables to point `0.0.0.0/0` to the NAT Gateway.
- Disable source/destination check on NAT instances (EC2-based NAT).

**Related Reading:**

- [How to Configure NAT Gateway on Azure](https://oneuptime.com/blog/post/2026-03-20-nat-gateway-azure/view)
- [How to Configure NAT on Linux Using iptables](https://oneuptime.com/blog/post/2026-03-20-nat-linux-iptables/view)
- [How to Configure PAT (Port Address Translation)](https://oneuptime.com/blog/post/2026-03-20-configure-pat-nat-overload/view)
