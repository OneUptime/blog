# How to Configure AWS Client VPN IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Client VPN, IPv6, OpenVPN, Remote Access, Dual-Stack, VPN

Description: Configure AWS Client VPN to assign IPv6 addresses to VPN clients and route IPv6 traffic over the VPN tunnel.

## Introduction

AWS Client VPN IPv6 enables remote users to reach IPv6 resources over an OpenVPN-based tunnel. Proper configuration requires choosing the correct endpoint and traffic IP address types, associating an IPv6-capable target network, and adding the authorization rules and routes that match your IPv6 design.

## Prerequisites

- A VPC with IPv6 or dual-stack subnets
- An existing AWS account with appropriate IAM permissions
- An ACM server certificate and a supported client authentication method
- An OpenVPN-compatible client such as AWS VPN Client

## Step 1: Verify IPv6 Prerequisites

```bash
# Check the VPC has an IPv6 CIDR block
aws ec2 describe-vpcs \
    --vpc-ids vpc-0123456789abcdef0 \
    --query 'Vpcs[].{VpcId:VpcId,IPv6CIDRs:Ipv6CidrBlockAssociationSet[*].Ipv6CidrBlock}'

# Check the target subnet has an IPv6 CIDR association
aws ec2 describe-subnets \
    --subnet-ids subnet-0123456789abcdef0 \
    --query 'Subnets[].{SubnetId:SubnetId,IPv6CIDRs:Ipv6CidrBlockAssociationSet[*].Ipv6CidrBlock}'
```

## Step 2: Create an IPv6 or Dual-Stack Client VPN Endpoint

```bash
# Create a dual-stack Client VPN endpoint
# For an IPv6-only endpoint, set both IP address types to ipv6 and omit --client-cidr-block.
aws ec2 create-client-vpn-endpoint \
    --endpoint-ip-address-type dual-stack \
    --traffic-ip-address-type dual-stack \
    --client-cidr-block 172.31.0.0/16 \
    --server-certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/11111111-2222-3333-4444-555555555555 \
    --authentication-options Type=certificate-authentication,MutualAuthentication={ClientRootCertificateChainArn=arn:aws:acm:us-east-1:123456789012:certificate/66666666-7777-8888-9999-000000000000} \
    --connection-log-options Enabled=false
```

## Step 3: Associate an IPv6-Capable Target Network

```bash
# Associate a dual-stack subnet with the Client VPN endpoint
aws ec2 associate-client-vpn-target-network \
    --client-vpn-endpoint-id cvpn-endpoint-0123456789abcdef0 \
    --subnet-id subnet-0123456789abcdef0
```

## Step 4: Add Authorization Rules and Review Routes

```bash
# Allow clients to access the associated VPC
aws ec2 authorize-client-vpn-ingress \
    --client-vpn-endpoint-id cvpn-endpoint-0123456789abcdef0 \
    --target-network-cidr 10.0.0.0/16 \
    --authorize-all-groups

# When you associate a subnet, AWS automatically adds a route for the VPC.
# Review the Client VPN route table, and add extra routes only if clients
# need access to additional networks such as peered VPCs or on-premises networks.
aws ec2 describe-client-vpn-routes \
    --client-vpn-endpoint-id cvpn-endpoint-0123456789abcdef0
```

## Step 5: Test IPv6 Connectivity

```bash
# Export the client configuration file
aws ec2 export-client-vpn-client-configuration \
    --client-vpn-endpoint-id cvpn-endpoint-0123456789abcdef0 \
    --output text > client-config.ovpn

# After connecting with an OpenVPN-compatible client, test access to an IPv6 resource
ping -6 -c 3 2001:db8:1234:1::10
```

## Step 6: Terraform Example

```hcl
# Terraform for AWS Client VPN IPv6
resource "aws_ec2_client_vpn_endpoint" "ipv6_vpn" {
  description              = "dual-stack-client-vpn"
  server_certificate_arn   = aws_acm_certificate.server.arn
  endpoint_ip_address_type = "dual-stack"
  traffic_ip_address_type  = "dual-stack"
  client_cidr_block        = "172.31.0.0/16"

  authentication_options {
    type                       = "certificate-authentication"
    root_certificate_chain_arn = aws_acm_certificate.client_ca.arn
  }

  connection_log_options {
    enabled = false
  }
}

resource "aws_ec2_client_vpn_network_association" "ipv6_vpn" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.ipv6_vpn.id
  subnet_id              = aws_subnet.client_vpn.id
}

resource "aws_ec2_client_vpn_authorization_rule" "ipv6_vpn" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.ipv6_vpn.id
  target_network_cidr    = "10.0.0.0/16"
  authorize_all_groups   = true
}
```

## Conclusion

AWS Client VPN IPv6 requires creating an IPv6 or dual-stack endpoint, associating an IPv6-capable subnet, and configuring the authorization rules that allow clients to reach the target VPC or other networks. Test connectivity end-to-end after exporting the client configuration and connecting with an OpenVPN-compatible client. Use Terraform for declarative, repeatable deployments. Monitor endpoint health, route propagation, and client connectivity with OneUptime's network health checks.
