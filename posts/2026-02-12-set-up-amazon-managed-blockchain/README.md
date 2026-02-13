# How to Set Up Amazon Managed Blockchain

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Blockchain, Amazon Managed Blockchain, Hyperledger Fabric, Ethereum, Distributed Ledger

Description: A practical guide to setting up Amazon Managed Blockchain for building scalable blockchain networks on AWS with Hyperledger Fabric or Ethereum.

---

Blockchain technology has moved well beyond cryptocurrency hype. Enterprises use it for supply chain tracking, financial settlements, identity verification, and more. But running your own blockchain infrastructure is painful. You need to provision hardware, configure networking, manage certificates, handle peer nodes, and keep everything in sync.

Amazon Managed Blockchain takes most of that operational burden off your plate. It lets you create and manage scalable blockchain networks using popular frameworks like Hyperledger Fabric and Ethereum, without worrying about the underlying infrastructure.

In this guide, we will walk through setting up a blockchain network on AWS from scratch.

## What Is Amazon Managed Blockchain?

Amazon Managed Blockchain is a fully managed service that makes it straightforward to join public blockchain networks or create and manage private blockchain networks. It supports two frameworks:

- **Hyperledger Fabric** - A permissioned blockchain framework ideal for private enterprise networks where you control who can participate.
- **Ethereum** - A public, decentralized blockchain you can connect to for reading and writing transactions.

The service handles node provisioning, certificate management, scaling, and monitoring. You focus on writing chaincode (smart contracts) and building applications.

## Architecture Overview

Here is how a typical Managed Blockchain deployment looks:

```mermaid
graph TD
    A[AWS Account - Organization Owner] --> B[Managed Blockchain Network]
    B --> C[Member 1]
    B --> D[Member 2]
    C --> E[Peer Node 1a]
    C --> F[Peer Node 1b]
    D --> G[Peer Node 2a]
    E --> H[VPC Endpoint]
    F --> H
    G --> H
    H --> I[Client Application]
    B --> J[Ordering Service]
    J --> E
    J --> F
    J --> G
```

The network consists of members, each with peer nodes. An ordering service sequences transactions. Your application connects through a VPC endpoint.

## Prerequisites

Before you start, make sure you have:

- An AWS account with appropriate IAM permissions
- AWS CLI installed and configured
- A VPC with at least two subnets in different availability zones
- Basic familiarity with blockchain concepts

You will need the following IAM permissions at minimum:

```json
// IAM policy for Managed Blockchain administration
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "managedblockchain:*",
        "ec2:CreateVpcEndpoint",
        "ec2:DescribeVpcEndpoints",
        "ec2:DeleteVpcEndpoints",
        "ec2:DescribeSubnets",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeVpcs"
      ],
      "Resource": "*"
    }
  ]
}
```

## Step 1: Create a Blockchain Network

Let us start by creating a Hyperledger Fabric network. This is the foundation everything else builds on.

```bash
# Create a new Hyperledger Fabric network on Managed Blockchain
aws managedblockchain create-network \
  --name "MySupplyChainNetwork" \
  --description "Supply chain tracking network" \
  --framework HYPERLEDGER_FABRIC \
  --framework-version 2.2 \
  --voting-policy "ApprovalThresholdPolicy={ThresholdPercentage=50,ProposalDurationInHours=24,ThresholdComparator=GREATER_THAN}" \
  --member-configuration \
    "Name=OrgAlpha,Description=First organization,FrameworkConfiguration={Fabric={AdminUsername=admin,AdminPassword=Password123!}}"
```

This command creates both the network and your first member in one shot. The voting policy controls how new members get approved - here we require more than 50% of existing members to vote yes within 24 hours.

Note the `NetworkId` and `MemberId` from the output. You will need both going forward.

## Step 2: Create Peer Nodes

Peer nodes are where your blockchain data lives and where transactions get endorsed. Each member needs at least one peer node.

```bash
# Create a peer node for your member
aws managedblockchain create-node \
  --network-id n-ABCDEFGHIJKLMNOP1234567890 \
  --member-id m-ABCDEFGHIJKLMNOP1234567890 \
  --node-configuration \
    "InstanceType=bc.t3.small,AvailabilityZone=us-east-1a,LogPublishingConfiguration={Fabric={ChaincodeLogs={Cloudwatch={Enabled=true}},PeerLogs={Cloudwatch={Enabled=true}}}}"
```

For production workloads, consider `bc.t3.medium` or larger instance types. The `bc.t3.small` works fine for development and testing.

You can check the status of your node:

```bash
# Check the status of your peer node
aws managedblockchain get-node \
  --network-id n-ABCDEFGHIJKLMNOP1234567890 \
  --member-id m-ABCDEFGHIJKLMNOP1234567890 \
  --node-id nd-ABCDEFGHIJKLMNOP1234567890
```

Wait until the status shows `AVAILABLE` before proceeding.

## Step 3: Set Up the VPC Endpoint

Your application needs a way to talk to the blockchain network. This happens through a VPC endpoint.

```bash
# Create a VPC endpoint for the Managed Blockchain network
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-0123456789abcdef0 \
  --service-name com.amazonaws.us-east-1.managedblockchain.n-ABCDEFGHIJKLMNOP1234567890 \
  --vpc-endpoint-type Interface \
  --subnet-ids subnet-0123456789abcdef0 subnet-abcdef0123456789a \
  --security-group-ids sg-0123456789abcdef0
```

Make sure your security group allows inbound traffic on ports 443 (for the CA) and 30001-30004 (for peer and ordering service communication).

## Step 4: Enroll the Admin User

With Hyperledger Fabric, you use a Certificate Authority (CA) to manage identities. The admin user you specified during network creation needs to be enrolled first.

```bash
# Get the CA endpoint for your member
aws managedblockchain get-member \
  --network-id n-ABCDEFGHIJKLMNOP1234567890 \
  --member-id m-ABCDEFGHIJKLMNOP1234567890 \
  --query 'Member.FrameworkAttributes.Fabric.CaEndpoint' \
  --output text
```

Then use the Fabric CA client to enroll:

```bash
# Enroll the admin identity using the Fabric CA client
fabric-ca-client enroll \
  -u https://admin:Password123!@ca.m-ABCDEFGHIJKLMNOP1234567890.n-ABCDEFGHIJKLMNOP1234567890.managedblockchain.us-east-1.amazonaws.com:30002 \
  --tls.certfiles /home/ec2-user/managedblockchain-tls-chain.pem \
  -M /home/ec2-user/admin-msp
```

This generates the admin's cryptographic material in the specified MSP (Membership Service Provider) directory.

## Step 5: Create a Channel

Channels are private communication pathways between specific members. Think of them as isolated ledgers within your network.

First, create the channel configuration:

```bash
# Generate the channel configuration transaction
configtxgen -outputCreateChannelTx mychannel.pb \
  -profile OneOrgChannel \
  -channelID mychannel
```

Then create the channel on the network:

```bash
# Create the channel using the peer CLI
peer channel create \
  -o orderer.n-ABCDEFGHIJKLMNOP1234567890.managedblockchain.us-east-1.amazonaws.com:30001 \
  -c mychannel \
  -f mychannel.pb \
  --cafile /home/ec2-user/managedblockchain-tls-chain.pem \
  --tls
```

Finally, join your peer to the channel:

```bash
# Join the peer node to the newly created channel
peer channel join -b mychannel.block
```

## Step 6: Deploy Chaincode

Chaincode is Hyperledger Fabric's term for smart contracts. Here is a simple example in Go:

```go
// Simple asset transfer chaincode
package main

import (
    "encoding/json"
    "fmt"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type AssetContract struct {
    contractapi.Contract
}

type Asset struct {
    ID    string `json:"id"`
    Owner string `json:"owner"`
    Value int    `json:"value"`
}

func (c *AssetContract) CreateAsset(ctx contractapi.TransactionContextInterface, id string, owner string, value int) error {
    asset := Asset{ID: id, Owner: owner, Value: value}
    assetJSON, err := json.Marshal(asset)
    if err != nil {
        return err
    }
    return ctx.GetStub().PutState(id, assetJSON)
}

func main() {
    cc, err := contractapi.NewChaincode(&AssetContract{})
    if err != nil {
        fmt.Printf("Error creating chaincode: %s", err)
        return
    }
    if err := cc.Start(); err != nil {
        fmt.Printf("Error starting chaincode: %s", err)
    }
}
```

Package and install it on your peer, then approve and commit the chaincode definition through the standard Fabric lifecycle.

## Monitoring Your Network

Amazon Managed Blockchain integrates with CloudWatch for monitoring. Key metrics to watch include:

- **PeerNodeCPUUtilization** - Keep this below 80% for stable performance
- **PeerNodeMemoryUtilization** - High memory usage can indicate you need a larger instance
- **TransactionCount** - Track throughput over time
- **BlockHeight** - Confirm your peer stays in sync

For a deeper look at monitoring practices, check out our post on [AWS CloudWatch monitoring strategies](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view).

## Cost Considerations

Managed Blockchain pricing has several components:

- Network membership fees (hourly)
- Peer node instance charges (hourly, varies by instance type)
- Data storage for the ledger
- Data transfer through the VPC endpoint

For a development environment with a single `bc.t3.small` node, expect to pay roughly $50-80/month. Production setups with multiple nodes and larger instance types will cost more.

## Inviting Other Members

The whole point of a blockchain network is collaboration. To invite other AWS accounts:

```bash
# Create an invitation proposal for a new member
aws managedblockchain create-proposal \
  --network-id n-ABCDEFGHIJKLMNOP1234567890 \
  --member-id m-ABCDEFGHIJKLMNOP1234567890 \
  --actions "Invitations=[{Principal=123456789012}]"
```

Existing members vote on the proposal based on your network's voting policy. Once approved, the invited account can create their member and join.

## Common Pitfalls

A few things that trip people up regularly:

1. **Forgetting the TLS certificate** - Always download the Managed Blockchain TLS certificate chain and reference it in your commands.
2. **Security group misconfiguration** - The VPC endpoint needs specific ports open. Double-check 443, 30001-30004.
3. **Instance sizing** - Starting too small leads to performance issues under load. Monitor and scale proactively.
4. **Not backing up crypto material** - The admin enrollment generates keys and certificates. Store them securely in AWS Secrets Manager or similar.

## Wrapping Up

Amazon Managed Blockchain removes the heavy lifting of running blockchain infrastructure. You can go from zero to a working Hyperledger Fabric network in under an hour, then focus your energy on building the smart contracts and applications that deliver actual business value.

The key steps are: create the network, provision peer nodes, set up VPC connectivity, enroll identities, create channels, and deploy chaincode. From there, invite other organizations and start transacting.

If you are looking at monitoring your blockchain applications and the underlying AWS infrastructure, take a look at [OneUptime](https://oneuptime.com) for unified observability across your stack.
