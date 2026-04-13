# How to Set Up Private Endpoints for MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Private Endpoint, AWS PrivateLink, Security

Description: Configure private endpoints (AWS PrivateLink, Azure Private Link, GCP Private Service Connect) for MongoDB Atlas to secure database connections without public internet exposure.

---

## What Are Private Endpoints?

Private endpoints use cloud provider private link services to expose Atlas inside your VPC with a private IP address. Unlike VPC peering (which connects two VPCs), private endpoints create a one-directional connection - your VPC to Atlas - with no route table changes needed and no risk of overlapping CIDR blocks.

Supported services:
- **AWS**: AWS PrivateLink
- **Azure**: Azure Private Link
- **GCP**: Private Service Connect

## AWS PrivateLink Setup

### Step 1: Initiate the Private Endpoint in Atlas

```bash
# Using Atlas CLI
atlas privateEndpoints aws create \
  --region us-east-1

# Note the endpointServiceName from the response
# e.g., com.amazonaws.vpce.us-east-1.vpce-svc-0f7d5d2abc1234567
```

Or via the Atlas UI: go to **Network Access > Private Endpoint** and click **Add Private Endpoint**.

### Step 2: Create the VPC Endpoint in AWS

```bash
# Create the VPC endpoint
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-0abc1234def56789 \
  --service-name com.amazonaws.vpce.us-east-1.vpce-svc-0f7d5d2abc1234567 \
  --vpc-endpoint-type Interface \
  --subnet-ids subnet-0aaa111 subnet-0bbb222 \
  --security-group-ids sg-0ccc333

# Note the VPC endpoint ID: vpce-0123456789abcdef0
```

### Step 3: Register the Endpoint with Atlas

```bash
atlas privateEndpoints aws interfaces create \
  --endpointServiceId <atlasEndpointServiceId> \
  --privateEndpointId vpce-0123456789abcdef0
```

### Step 4: Wait for Approval

Atlas automatically approves the connection. Check status:

```bash
atlas privateEndpoints aws interfaces describe \
  --endpointServiceId <atlasEndpointServiceId> \
  --privateEndpointId vpce-0123456789abcdef0
```

Status should be `AVAILABLE`.

### Step 5: Enable DNS Resolution

In the AWS Console, go to your VPC Endpoint and enable **Enable DNS names**:

```bash
aws ec2 modify-vpc-endpoint \
  --vpc-endpoint-id vpce-0123456789abcdef0 \
  --private-dns-enabled
```

### Step 6: Connect Using the Private Connection String

Atlas provides a private connection string for PrivateLink connections:

```text
mongodb+srv://cluster0-pl-0.abc123.mongodb.net
```

The `pl-0` in the hostname indicates a PrivateLink connection. Get it from Atlas UI under **Connect > PrivateLink**.

```javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient(
  "mongodb+srv://user:pass@cluster0-pl-0.abc123.mongodb.net/?retryWrites=true&w=majority"
);
```

## Azure Private Link Setup

### Step 1: Initiate in Atlas

```bash
atlas privateEndpoints azure create \
  --region EUROPE_WEST
```

Note the `privateLinkServiceResourceId` returned.

### Step 2: Create the Private Endpoint in Azure

```bash
# Create private endpoint
az network private-endpoint create \
  --name atlas-private-endpoint \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --subnet mySubnet \
  --private-connection-resource-id "/subscriptions/.../privateLinkServices/atlas-service" \
  --connection-name atlas-connection \
  --location westeurope
```

### Step 3: Register with Atlas

```bash
atlas privateEndpoints azure interfaces create \
  --endpointServiceId <atlasEndpointServiceId> \
  --privateEndpointId /subscriptions/.../privateEndpoints/atlas-private-endpoint \
  --privateEndpointIpAddress 10.0.0.5
```

## GCP Private Service Connect

### Step 1: Initiate in Atlas

```bash
atlas privateEndpoints gcp create \
  --region CENTRAL_US
```

### Step 2: Create Forwarding Rules in GCP

```bash
# Reserve internal IP addresses for each endpoint
gcloud compute addresses create atlas-psc-ip-1 \
  --region=us-central1 \
  --subnet=my-subnet \
  --addresses=10.0.0.10

gcloud compute addresses create atlas-psc-ip-2 \
  --region=us-central1 \
  --subnet=my-subnet \
  --addresses=10.0.0.11

# Create forwarding rules for each Atlas endpoint
gcloud compute forwarding-rules create atlas-endpoint-1 \
  --region=us-central1 \
  --network=my-vpc \
  --address=atlas-psc-ip-1 \
  --target-service-attachment=projects/atlas-project/regions/us-central1/serviceAttachments/atlas-attachment-1

gcloud compute forwarding-rules create atlas-endpoint-2 \
  --region=us-central1 \
  --network=my-vpc \
  --address=atlas-psc-ip-2 \
  --target-service-attachment=projects/atlas-project/regions/us-central1/serviceAttachments/atlas-attachment-2
```

GCP requires multiple forwarding rules (one per Atlas node endpoint).

### Step 3: Register with Atlas

```bash
atlas privateEndpoints gcp interfaces create \
  --endpointServiceId <atlasEndpointServiceId> \
  --gcpProjectId <yourGcpProjectId> \
  --endpointGroupName atlas-endpoint-group \
  --endpoints endpoint1=atlas-psc-ip-1,endpoint2=atlas-psc-ip-2
```

## Security Group Configuration (AWS)

Ensure the security group attached to the VPC endpoint allows outbound traffic to Atlas:

```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-0ccc333 \
  --protocol tcp \
  --port 27017 \
  --cidr 10.0.0.0/16

aws ec2 authorize-security-group-egress \
  --group-id sg-0ccc333 \
  --protocol tcp \
  --port 27017 \
  --cidr 0.0.0.0/0
```

## Verify the Connection

```bash
# From an EC2 instance in the VPC
mongosh "mongodb+srv://user:pass@cluster0-pl-0.abc123.mongodb.net/test"

# Should connect without traversing public internet
db.runCommand({ ping: 1 })
```

## Private Endpoints vs VPC Peering

| Feature | Private Endpoints | VPC Peering |
|---|---|---|
| CIDR conflicts | No issue | Must not overlap |
| Route table changes | Not required | Required |
| Direction | One-way (your VPC to Atlas) | Bidirectional |
| Cross-region | Supported (regionalized endpoints) | Not supported |

## Summary

Private endpoints provide the most secure way to connect to Atlas by routing traffic through cloud provider private link services within your VPC. On AWS, create a VPC interface endpoint for the Atlas PrivateLink service, register it in Atlas, enable DNS, then connect using the private hostname. Azure and GCP follow similar patterns with their respective private link services.
