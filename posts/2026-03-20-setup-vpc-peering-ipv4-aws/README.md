# How to Set Up VPC Peering for IPv4 on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, VPC, Networking, IPv4, Infrastructure, Cloud

Description: Learn how to configure VPC peering connections between two AWS VPCs to enable private IPv4 communication without routing traffic over the public internet.

## Introduction

VPC peering allows two AWS VPCs to communicate privately using their IPv4 address ranges. This is useful for connecting workloads across separate VPCs in the same account or across different AWS accounts and regions.

## Prerequisites

- Two AWS VPCs with non-overlapping IPv4 CIDR blocks
- Appropriate IAM permissions
- AWS CLI or console access

## Planning Your IP Address Space

Ensure the CIDR blocks do not overlap:

- VPC A: `10.0.0.0/16`
- VPC B: `10.1.0.0/16`

## Creating the VPCs

```bash
# Create VPC A

aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications \
  'ResourceType=vpc,Tags=[{Key=Name,Value=vpc-a}]'

# Create VPC B
aws ec2 create-vpc --cidr-block 10.1.0.0/16 --tag-specifications \
  'ResourceType=vpc,Tags=[{Key=Name,Value=vpc-b}]'
```

## Requesting the Peering Connection

The following command assumes both VPCs are in the same AWS account and Region. For cross-account or cross-Region peering, include `--peer-owner-id`, `--peer-region`, or both as needed.

```bash
aws ec2 create-vpc-peering-connection \
  --vpc-id vpc-aaaaaaaa \
  --peer-vpc-id vpc-bbbbbbbb \
  --tag-specifications 'ResourceType=vpc-peering-connection,Tags=[{Key=Name,Value=vpc-a-to-b}]'
```

## Accepting the Peering Connection

The owner of the accepter VPC must accept the peering request. If both VPCs are in the same account, you can use the same AWS credentials:

```bash
aws ec2 accept-vpc-peering-connection \
  --vpc-peering-connection-id pcx-xxxxxxxxxxxxxxxxx
```

## Updating Route Tables

Add routes in the route tables associated with the subnets that need to communicate in both VPCs.

For VPC A's relevant route table, add a route to VPC B's CIDR:

```bash
aws ec2 create-route \
  --route-table-id rtb-aaaaaaaa \
  --destination-cidr-block 10.1.0.0/16 \
  --vpc-peering-connection-id pcx-xxxxxxxxxxxxxxxxx
```

For VPC B's relevant route table, add a route to VPC A's CIDR:

```bash
aws ec2 create-route \
  --route-table-id rtb-bbbbbbbb \
  --destination-cidr-block 10.0.0.0/16 \
  --vpc-peering-connection-id pcx-xxxxxxxxxxxxxxxxx
```

## Updating Security Groups

Ensure the security group on the destination instance allows traffic from the peer VPC's CIDR. For example, to allow ping from VPC A to an instance in VPC B:

```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-bbbbbbbb \
  --protocol icmp \
  --port -1 \
  --cidr 10.0.0.0/16
```

## Verifying the Peering Connection

Test connectivity from an instance in VPC A to an instance in VPC B:

```bash
ping 10.1.0.5
```

## Limitations

- VPC peering does not support transitive routing
- CIDR blocks must not overlap
- DNS resolution across peered VPCs requires enabling DNS hostnames and DNS resolution options

## Conclusion

VPC peering is a simple and cost-effective way to enable private IPv4 communication between AWS VPCs. By updating route tables and security groups in both VPCs, you can route traffic securely without exposing it to the internet.
