# How to Configure AWS Site-to-Site VPN IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Site-to-Site VPN, IPv6, IPsec, On-Premise, Dual-Stack, BGP

Description: Configure AWS Site-to-Site VPN for IPv6 traffic between your on-premises network and AWS VPC using dual-stack VPN tunnels.

## Introduction

AWS Site-to-Site VPN can carry private IPv6 traffic between your VPC and on-premises network when the VPN connection is attached to a transit gateway and configured for IPv6 inside the tunnels. Proper configuration requires IPv6-enabled VPC resources, a transit gateway VPN attachment, and route advertisement or static routes.

## Prerequisites

- VPC with an associated IPv6 CIDR block and IPv6-enabled subnets
- A transit gateway to terminate the Site-to-Site VPN connection
- An existing AWS account with appropriate IAM permissions
- A customer gateway device that supports BGP and IPv6 traffic through the VPN tunnel

## Step 1: Verify IPv6 Prerequisites

```bash
# Check that the VPC has an IPv6 CIDR block associated
aws ec2 describe-vpcs \
    --query 'Vpcs[].{VpcId:VpcId,IPv6CIDRs:Ipv6CidrBlockAssociationSet}'
```

## Step 2: Enable IPv6 on the VPC and Subnets

```bash
# Associate an Amazon-provided IPv6 CIDR block with the VPC
aws ec2 associate-vpc-cidr-block \
    --vpc-id vpc-0123456789abcdef0 \
    --amazon-provided-ipv6-cidr-block

# Associate an IPv6 CIDR block with the subnet
aws ec2 associate-subnet-cidr-block \
    --subnet-id subnet-0123456789abcdef0 \
    --ipv6-cidr-block 2001:db8:1234:1a00::/64

# Automatically assign IPv6 addresses to new ENIs in the subnet
aws ec2 modify-subnet-attribute \
    --subnet-id subnet-0123456789abcdef0 \
    --assign-ipv6-address-on-creation
```

## Step 3: Configure the IPv6 VPN Connection

```bash
# Create the customer gateway with a BGP ASN
aws ec2 create-customer-gateway \
    --bgp-asn 65000 \
    --ip-address 198.51.100.10 \
    --type ipsec.1

# Create a Site-to-Site VPN connection on a transit gateway with IPv6 inside the tunnels
aws ec2 create-vpn-connection \
    --type ipsec.1 \
    --transit-gateway-id tgw-0123456789abcdef0 \
    --customer-gateway-id cgw-0123456789abcdef0 \
    --options 'TunnelInsideIpVersion=ipv6,LocalIpv6NetworkCidr=2001:db8:100::/56,RemoteIpv6NetworkCidr=2001:db8:200::/56'

# Inspect the IPv6 VPN connection options
aws ec2 describe-vpn-connections \
    --vpn-connection-ids vpn-0123456789abcdef0 \
    --query 'VpnConnections[].Options.{TunnelInsideIpVersion:TunnelInsideIpVersion,LocalIpv6NetworkCidr:LocalIpv6NetworkCidr,RemoteIpv6NetworkCidr:RemoteIpv6NetworkCidr}'
```

## Step 4: Add IPv6 Routes

```bash
# Route the on-premises IPv6 prefix to the transit gateway from the VPC subnet route table
aws ec2 create-route \
    --route-table-id rtb-0123456789abcdef0 \
    --destination-ipv6-cidr-block 2001:db8:100::/56 \
    --transit-gateway-id tgw-0123456789abcdef0

# If you use a custom transit gateway route table, enable propagation from the VPN attachment
aws ec2 enable-transit-gateway-route-table-propagation \
    --transit-gateway-route-table-id tgw-rtb-0123456789abcdef0 \
    --transit-gateway-attachment-id tgw-attach-0123456789abcdef0
```

## Step 5: Test IPv6 Connectivity

```bash
# Test from an EC2 instance in the IPv6-enabled subnet
ping -6 -c 3 <on-premises-ipv6-address>

# Verify the IPv6 route is present in the transit gateway route table
aws ec2 search-transit-gateway-routes \
    --transit-gateway-route-table-id tgw-rtb-0123456789abcdef0 \
    --filters 'Name=route-search.exact-match,Values=2001:db8:100::/56'
```

## Step 6: Terraform Example

```hcl
# Terraform for AWS Site-to-Site VPN IPv6
resource "aws_vpn_connection" "ipv6_vpn" {
  transit_gateway_id  = aws_ec2_transit_gateway.main.id
  customer_gateway_id = aws_customer_gateway.onprem.id
  type                = "ipsec.1"

  local_ipv6_network_cidr  = "2001:db8:100::/56"
  remote_ipv6_network_cidr = "2001:db8:200::/56"
  tunnel_inside_ip_version = "ipv6"
}
```

## Conclusion

AWS Site-to-Site VPN IPv6 requires IPv6-enabled VPC subnets, a transit gateway-based VPN connection configured with `TunnelInsideIpVersion=ipv6`, and the right VPC and transit gateway routes. If you need both IPv4 and IPv6 traffic, create separate VPN connections. Test connectivity end-to-end after configuration. Use Terraform for declarative, repeatable deployments. Monitor IPv6 BGP session state and route advertisement with OneUptime's network health checks.
