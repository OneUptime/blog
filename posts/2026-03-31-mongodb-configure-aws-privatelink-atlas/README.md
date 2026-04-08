# How to Configure AWS PrivateLink for MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, AWS, PrivateLink, Networking

Description: Configure AWS PrivateLink for MongoDB Atlas to create a private one-way endpoint that connects your VPC to Atlas without VPC peering or internet exposure.

---

## Why Use AWS PrivateLink with Atlas

AWS PrivateLink provides private connectivity between your VPC and MongoDB Atlas using interface endpoints. Unlike VPC peering, PrivateLink is unidirectional - Atlas cannot initiate connections to your VPC. This is ideal when you want strict isolation and do not want overlapping CIDR blocks to be a concern.

## Prerequisites

- Atlas M10 or higher cluster
- AWS account with permissions to create VPC endpoints
- Atlas project owner or organization owner role

## Step 1: Enable Private Endpoint in Atlas

Navigate to your Atlas project > **Network Access** > **Private Endpoint** > **Add Private Endpoint**. Select **AWS** and your region, then copy the Atlas endpoint service name:

```text
com.amazonaws.vpce.us-east-1.vpce-svc-0fed9cbb58abc1234
```

## Step 2: Create a VPC Interface Endpoint in AWS

Use the AWS CLI to create the interface endpoint pointing to the Atlas endpoint service:

```bash
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-0yourappvpc \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.vpce.us-east-1.vpce-svc-0fed9cbb58abc1234 \
  --subnet-ids subnet-0abc subnet-0def \
  --security-group-ids sg-0yoursg \
  --region us-east-1
```

Note the VPC endpoint ID returned (e.g., `vpce-0abc123def456789`).

## Step 3: Register the Endpoint in Atlas

After creating the endpoint in AWS, register it with Atlas via the API:

```bash
curl --user "PUBLIC_KEY:PRIVATE_KEY" --digest \
  --header "Content-Type: application/json" \
  --header "Accept: application/vnd.atlas.2023-01-01+json" \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/privateEndpoint/AWS/endpointService/{endpointServiceId}/endpoint" \
  --data '{"id": "vpce-0abc123def456789"}'
```

Note that private endpoints bypass the Atlas IP Access List entirely. You do not need to add any IP access list entries for connections through PrivateLink to work.

## Step 4: Get the Private Endpoint Connection String

Once the endpoint status shows `AVAILABLE`, retrieve the private endpoint connection string from the Atlas UI under **Connect** > **Private Endpoint**:

```text
mongodb+srv://cluster0-pl-0.abcde.mongodb.net
```

## Step 5: Connect Using the Private Endpoint

```javascript
const { MongoClient } = require("mongodb");

const uri =
  "mongodb+srv://cluster0-pl-0.abcde.mongodb.net/?authSource=admin";
const client = new MongoClient(uri, {
  tls: true,
  authMechanism: "SCRAM-SHA-256",
});

async function main() {
  await client.connect();
  console.log("Connected via PrivateLink");
  await client.close();
}

main();
```

## Verify Endpoint Status

Check endpoint status from AWS:

```bash
aws ec2 describe-vpc-endpoints \
  --vpc-endpoint-ids vpce-0abc123def456789 \
  --query 'VpcEndpoints[0].State'
```

Expected output: `"available"`

## Summary

AWS PrivateLink for MongoDB Atlas creates a one-way interface endpoint in your VPC that routes traffic directly to Atlas over AWS infrastructure. The setup involves enabling a private endpoint in Atlas, creating a VPC interface endpoint in AWS pointing to the Atlas endpoint service, registering the endpoint ID back in Atlas, and using the dedicated private endpoint connection string. This approach avoids CIDR overlap concerns and provides stricter network isolation than VPC peering.
