# How to Set Up a VPN Between AWS VPC and On-Premises Networks (IPv4)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, VPN, Networking, IPv4, On-Premise, Site-to-Site VPN

Description: Learn how to configure a Site-to-Site VPN connection between an AWS VPC and an on-premises network using IPv4, enabling secure private connectivity.

## Introduction

AWS Site-to-Site VPN creates two encrypted IPsec tunnels between your AWS VPC and your on-premises network, allowing private communication over the public internet. This guide walks through the setup using the AWS Management Console and CLI.

## Prerequisites

- An AWS VPC with subnets
- An on-premises VPN device (physical or software)
- A static public IP address for your on-premises device
- Non-overlapping CIDR blocks between AWS and on-premises

## Step 1: Create a Customer Gateway

The Customer Gateway represents your on-premises VPN device:

```bash
aws ec2 create-customer-gateway \
  --type ipsec.1 \
  --ip-address 203.0.113.10 \
  --bgp-asn 65000 \
  --tag-specifications 'ResourceType=customer-gateway,Tags=[{Key=Name,Value=on-prem-cgw}]'
```

## Step 2: Create a Virtual Private Gateway

```bash
aws ec2 create-vpn-gateway \
  --type ipsec.1 \
  --tag-specifications 'ResourceType=vpn-gateway,Tags=[{Key=Name,Value=aws-vpn-gw}]'
```

Attach it to your VPC:

```bash
aws ec2 attach-vpn-gateway \
  --vpn-gateway-id vgw-xxxxxxxxxxxxxxxxx \
  --vpc-id vpc-xxxxxxxxxxxxxxxxx
```

## Step 3: Create the VPN Connection

```bash
aws ec2 create-vpn-connection \
  --type ipsec.1 \
  --customer-gateway-id cgw-xxxxxxxxxxxxxxxxx \
  --vpn-gateway-id vgw-xxxxxxxxxxxxxxxxx \
  --options StaticRoutesOnly=true
```

## Step 4: Add a Static Route

```bash
aws ec2 create-vpn-connection-route \
  --vpn-connection-id vpn-xxxxxxxxxxxxxxxxx \
  --destination-cidr-block 192.168.0.0/24
```

## Step 5: Update Route Tables

Enable route propagation or add static routes pointing to the Virtual Private Gateway:

```bash
aws ec2 enable-vgw-route-propagation \
  --route-table-id rtb-xxxxxxxxxxxxxxxxx \
  --gateway-id vgw-xxxxxxxxxxxxxxxxx
```

## Step 6: Download Configuration for On-Premises Device

Download the VPN configuration file from the AWS console for your specific device (Cisco, Juniper, pfSense, etc.) and apply it to your on-premises router.

## Verifying the Connection

Check the VPN tunnel status:

```bash
aws ec2 describe-vpn-connections \
  --vpn-connection-ids vpn-xxxxxxxxxxxxxxxxx \
  --query 'VpnConnections[0].VgwTelemetry'
```

Both tunnels should show `UP` status. Test with a ping from an on-premises host to an AWS instance after allowing ICMP from the on-premises CIDR in the instance security group, network ACLs, and host firewall.

## Conclusion

AWS Site-to-Site VPN provides a secure, reliable way to extend your on-premises network into AWS over IPv4. By creating the necessary gateways, VPN connection, and updating route tables, you can establish private connectivity in under an hour.
