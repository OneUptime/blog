# How to Manage MongoDB Atlas Network Peering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Network, Security, Cloud

Description: Learn how to configure VPC peering between MongoDB Atlas and your cloud VPC on AWS, GCP, or Azure so applications connect without traversing the public internet.

---

## What is Network Peering

Network peering (VPC peering on AWS and GCP, VNet peering on Azure) creates a private network route between your cloud VPC and the MongoDB Atlas project network. Traffic between your application and Atlas flows entirely over the private network, avoiding the public internet and reducing latency and exposure.

```mermaid
flowchart LR
    AppServer[Application Server] --> AppVPC[Your VPC 10.0.0.0/16]
    AppVPC -->|VPC peering| AtlasVPC[Atlas VPC 192.168.0.0/21]
    AtlasVPC --> Cluster[MongoDB Cluster]
    Cluster --> PrivateEndpoint[Private IP only]
```

## Requirements

- MongoDB Atlas M10 or higher cluster (M0/M2/M5 do not support peering)
- Your cloud VPC and Atlas VPC CIDR ranges must not overlap
- Appropriate IAM permissions to create peering connections in your cloud account

## Setting Up VPC Peering on AWS

### Step 1: Note Atlas VPC CIDR

In the Atlas UI, go to **Network Access > Peering**. Before creating the connection, note the Atlas VPC CIDR for your region (e.g., `192.168.0.0/21`).

Make sure your application VPC CIDR does not overlap. Common safe choices for the app VPC: `10.0.0.0/16`, `172.16.0.0/12`.

### Step 2: Create the Peering Connection in Atlas

Via the Atlas CLI:

```bash
atlas networking peering create aws \
  --accountId "123456789012" \
  --routeTableCidrBlock "10.0.0.0/16" \
  --vpcId "vpc-0a1b2c3d4e5f" \
  --region "us-east-1"
```

Via the Atlas API:

```bash
curl --user "${PUBLIC_KEY}:${PRIVATE_KEY}" \
  --digest \
  --header "Accept: application/vnd.atlas.2023-01-01+json" \
  --header "Content-Type: application/json" \
  --request POST \
  --data '{
    "containerId": "<ATLAS_CONTAINER_ID>",
    "accepterRegionName": "us-east-1",
    "awsAccountId": "123456789012",
    "routeTableCidrBlock": "10.0.0.0/16",
    "vpcId": "vpc-0a1b2c3d4e5f"
  }' \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/peers"
```

Atlas creates the peering request and returns a `vpcPeeringConnectionId`.

### Step 3: Accept the Peering Request in AWS

```bash
# Accept the pending peering request
aws ec2 accept-vpc-peering-connection \
  --vpc-peering-connection-id pcx-0a1b2c3d4e5f6g7h8

# Add a route to the Atlas CIDR in your route table
aws ec2 create-route \
  --route-table-id rtb-0a1b2c3d4e5f \
  --destination-cidr-block 192.168.0.0/21 \
  --vpc-peering-connection-id pcx-0a1b2c3d4e5f6g7h8
```

### Step 4: Update Security Groups

Allow outbound traffic from your application security group to the Atlas CIDR on port 27017:

```bash
aws ec2 authorize-security-group-egress \
  --group-id sg-0a1b2c3d4e5f \
  --ip-permissions IpProtocol=tcp,FromPort=27017,ToPort=27017,IpRanges='[{CidrIp=192.168.0.0/21}]'
```

### Step 5: Add the App VPC CIDR to Atlas IP Access List

Even with peering, the Atlas IP access list must include your VPC CIDR:

```bash
atlas accessLists create \
  --cidr "10.0.0.0/16" \
  --comment "App VPC peering range"
```

## Setting Up VNet Peering on Azure

Step 1: Get the Atlas VNet details:

```bash
atlas networking containers list --provider AZURE
```

Step 2: Create peering via the Atlas CLI:

```bash
atlas networking peering create azure \
  --atlasCidrBlock "192.168.0.0/21" \
  --directoryId "your-azure-ad-directory-id" \
  --subscriptionId "your-azure-subscription-id" \
  --resourceGroupName "myResourceGroup" \
  --vnetName "myVNet"
```

Step 3: Atlas will provision the peering and return an `atlasPeeringId`. Accept the peering on Azure:

```bash
az network vnet peering create \
  --name AtlasVNetPeering \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --remote-vnet /subscriptions/<ATLAS_SUB_ID>/resourceGroups/<ATLAS_RG>/providers/Microsoft.Network/virtualNetworks/<ATLAS_VNET> \
  --allow-vnet-access
```

## Connecting Over the Peered Connection

After peering is established, use the standard connection string. With VPC peering active, the standard hostnames automatically resolve to private IPs when accessed from within the peered VPC:

```bash
atlas clusters connectionStrings describe myCluster
```

Use the `standard` or `standardSrv` connection string (not the `private`/`privateSrv` strings, which are for Private Endpoints such as AWS PrivateLink):

```javascript
const { MongoClient } = require("mongodb");

// Standard SRV endpoint resolves to private IPs over peered connection
const uri = "mongodb+srv://appuser:password@mycluster.abcde.mongodb.net/myapp?retryWrites=true&w=majority";

const client = new MongoClient(uri);
await client.connect();
```

## Verifying the Peering Connection

Check the peering status:

```bash
atlas networking peering list
```

Status meanings:

| Status | Meaning |
|---|---|
| INITIATING | Atlas is creating the request |
| PENDING_ACCEPTANCE | Waiting for you to accept in your cloud |
| FINALIZING | AWS/Azure/GCP is finalizing |
| AVAILABLE | Peering is active |
| FAILED | Error during setup |

Test connectivity from within your VPC:

```bash
# Test TCP connectivity to Atlas on port 27017
nc -zv <private-mongodb-host> 27017
```

## Summary

VPC/VNet peering connects your cloud network to MongoDB Atlas over private IP addresses without public internet exposure. Create the peering request from Atlas, accept it in your cloud provider console, update route tables and security groups, and add your VPC CIDR to the Atlas IP access list. Switch to the private connection string in your application after peering is established. Peering requires M10+ clusters and non-overlapping CIDR ranges between your VPC and the Atlas VPC.
