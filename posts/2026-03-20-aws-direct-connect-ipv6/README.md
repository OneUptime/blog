# How to Configure AWS Direct Connect IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Direct Connect, IPv6, BGP, Private VIF, Dedicated Connection, Dual-Stack

Description: Configure AWS Direct Connect private virtual interfaces (VIFs) to carry IPv6 traffic between on-premises and AWS using BGP.

## Introduction

AWS Direct Connect IPv6 enables private IPv6 connectivity between on-premises networks and resources in one or more VPCs. Proper configuration requires setting up dual-stack support, IPv6 BGP sessions, and route advertisement.

## Prerequisites

- VPC with dual-stack (IPv4 + IPv6) subnets
- An existing AWS account with appropriate IAM permissions and a Direct Connect connection
- IPv6 address space allocated for the VPC and on-premises network

## Step 1: Verify IPv6 Prerequisites

```bash
# Check VPC has IPv6 CIDR

aws ec2 describe-vpcs --query 'Vpcs[].{VpcId:VpcId, IPv6CIDRs:Ipv6CidrBlockAssociationSet}'
```

## Step 2: Enable IPv6 on the VPC and Subnets

```bash
# Associate IPv6 CIDR block with the VPC
aws ec2 associate-vpc-cidr-block \
    --vpc-id vpc-0123456789abcdef0 \
    --amazon-provided-ipv6-cidr-block

# Associate a /64 IPv6 CIDR block with the subnet
aws ec2 associate-subnet-cidr-block \
    --subnet-id subnet-0123456789abcdef0 \
    --ipv6-cidr-block 2001:db8:1234:1a00::/64
```

## Step 3: Configure IPv6 BGP

```bash
# Create an IPv6 private VIF to a virtual private gateway; AWS auto-assigns the IPv6 BGP peer addresses
aws directconnect create-private-virtual-interface \
    --connection-id dxcon-XXXXX \
    --new-private-virtual-interface \
        virtualInterfaceName=ipv6-vif,vlan=100,asn=65000,addressFamily=ipv6,virtualGatewayId=vgw-XXXXX
```

## Step 4: Add IPv6 Routes

```bash
# Enable route propagation from the virtual private gateway to the VPC route table
aws ec2 enable-vgw-route-propagation \
    --route-table-id rtb-0123456789abcdef0 \
    --gateway-id vgw-XXXXX
```

## Step 5: Test IPv6 Connectivity

```bash
# Verify the IPv6 BGP peer is up
aws directconnect describe-virtual-interfaces \
    --virtual-interface-id dxvif-XXXXX \
    --query 'virtualInterfaces[].bgpPeers[].{AddressFamily:addressFamily,BGPStatus:bgpStatus,BGPPeerState:bgpPeerState}'

# Test from a dual-stack EC2 instance
ping -6 -c 3 <on-premises-ipv6-address>

# Verify the propagated IPv6 route is present
aws ec2 describe-route-tables --route-table-ids rtb-XXX --query 'RouteTables[].Routes[?DestinationIpv6CidrBlock]'
```

## Step 6: Terraform Example

```hcl
# Terraform for AWS Direct Connect IPv6
resource "aws_dx_private_virtual_interface" "ipv6_vif" {
  connection_id  = aws_dx_connection.main.id
  name           = "ipv6-vif"
  vlan           = 100
  address_family = "ipv6"
  bgp_asn        = 65000
  vpn_gateway_id = aws_vpn_gateway.main.id
}
```

## Conclusion

AWS Direct Connect IPv6 requires enabling dual-stack on the VPC and subnets, configuring IPv6 BGP sessions, and ensuring the relevant route tables contain the required IPv6 routes. Test connectivity end-to-end after configuration. Use Terraform for declarative, repeatable deployments. Monitor IPv6 BGP session state and route advertisement with OneUptime's network health checks.
