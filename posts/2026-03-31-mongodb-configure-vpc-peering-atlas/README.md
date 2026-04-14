# How to Configure VPC Peering for MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Networking, VPC, Security

Description: Learn how to configure VPC peering between your cloud VPC and MongoDB Atlas to enable private, low-latency connectivity without public internet exposure.

---

## What is VPC Peering in MongoDB Atlas

VPC peering creates a direct network connection between your cloud provider VPC and the Atlas VPC. Traffic flows over private IP addresses, bypassing the public internet entirely. This reduces latency, improves security, and avoids data transfer costs associated with internet egress.

Atlas supports VPC peering for AWS, Azure (via VNet peering), and GCP. This guide focuses on the general workflow and AWS-specific steps.

## Prerequisites

Before configuring VPC peering, ensure:
- Your Atlas cluster is deployed in the same cloud region as your application VPC
- You have sufficient IAM permissions to create VPC peering connections in your cloud account
- CIDR blocks of your application VPC and Atlas VPC do not overlap

## Step 1: Find Your Atlas VPC CIDR

Navigate to your Atlas project, go to **Network Access** > **Peering**, and click **Add Peering Connection**. Atlas will display its VPC ID and CIDR block for the selected region.

```text
Atlas VPC ID:   vpc-0abc123def456789
Atlas CIDR:     192.168.248.0/21
Region:         us-east-1
```

## Step 2: Create the Peering Connection via Atlas API

Use the Atlas API or UI to initiate the peering request:

```bash
curl --user "PUBLIC_KEY:PRIVATE_KEY" --digest \
  --header "Content-Type: application/json" \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/peers" \
  --data '{
    "containerId": "5e2211c17a3e5a48f5497de3",
    "vpcId": "vpc-0yourappvpc",
    "awsAccountId": "123456789012",
    "routeTableCidrBlock": "10.0.0.0/16",
    "accepterRegionName": "us-east-1"
  }'
```

## Step 3: Accept the Peering Connection in AWS

After Atlas initiates the request, accept it from your AWS account:

```bash
aws ec2 accept-vpc-peering-connection \
  --vpc-peering-connection-id pcx-0abc123def456789 \
  --region us-east-1
```

## Step 4: Update Route Tables

Add routes in your application VPC subnets so traffic destined for the Atlas CIDR is routed through the peering connection:

```bash
aws ec2 create-route \
  --route-table-id rtb-0yourroutetable \
  --destination-cidr-block 192.168.248.0/21 \
  --vpc-peering-connection-id pcx-0abc123def456789
```

## Step 5: Update Security Groups

Ensure your application security group allows outbound traffic to the Atlas VPC CIDR on port 27017. If your security group restricts outbound traffic, add a rule:

```bash
aws ec2 authorize-security-group-egress \
  --group-id sg-yourappSG \
  --protocol tcp \
  --port 27017 \
  --cidr 192.168.248.0/21
```

Atlas manages its own security groups on the MongoDB-controlled VPC. You do not need to modify any security group on the Atlas side - access control is handled through the Atlas IP Access List in the next step.

## Step 6: Update Atlas IP Access List

Add your application VPC CIDR to the Atlas IP Access List to permit connections:

```bash
curl --user "PUBLIC_KEY:PRIVATE_KEY" --digest \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/accessList" \
  --header "Content-Type: application/json" \
  --data '[{"cidrBlock": "10.0.0.0/16", "comment": "App VPC"}]'
```

## Verify Connectivity

From an EC2 instance in your application VPC, test the connection:

```bash
mongosh "mongodb+srv://cluster0.abcde.mongodb.net/test" \
  --username myUser --password myPassword
```

If peering is configured correctly, the connection will route privately without traversing the internet.

## Summary

VPC peering for MongoDB Atlas involves initiating a peering request from Atlas, accepting it in your cloud provider console, updating route tables to direct Atlas-bound traffic through the peering connection, and adding the application CIDR to the Atlas IP Access List. Once configured, all database traffic stays within the private network fabric, improving security and reducing latency compared to public internet connections.
