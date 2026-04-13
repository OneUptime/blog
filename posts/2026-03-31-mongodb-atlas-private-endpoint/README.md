# How to Configure MongoDB Atlas Private Endpoint

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Security, Network, Cloud

Description: Learn how to configure AWS PrivateLink, Azure Private Link, or GCP Private Service Connect private endpoints for MongoDB Atlas to eliminate public internet exposure.

---

## What is a Private Endpoint

A private endpoint creates a private IP address in your VPC that routes directly to MongoDB Atlas without traversing the public internet. Unlike VPC peering (which connects two entire VPC address spaces), a private endpoint is a targeted connection to a specific Atlas cluster endpoint. It is available on AWS (PrivateLink), Azure (Private Link), and GCP (Private Service Connect).

```mermaid
flowchart LR
    App[Application] --> AppVPC[Your VPC]
    AppVPC --> PrivateIP[Private endpoint IP 10.0.5.10]
    PrivateIP -->|AWS PrivateLink| AtlasService[Atlas endpoint service]
    AtlasService --> Cluster[MongoDB Cluster]
    Note[No public internet traffic]
```

## When to Use Private Endpoints vs VPC Peering

| Feature | Private Endpoint | VPC Peering |
|---|---|---|
| Routing | Targeted to one service | Full VPC-to-VPC route |
| Overlapping CIDRs | Allowed | Not allowed |
| Transitive routing | Not supported | Not supported |
| Setup complexity | Lower | Higher (route tables required) |
| Cost | Higher (per endpoint-hour) | Lower |
| Availability | M10+ | M10+ |

Private endpoints are preferred when CIDR ranges overlap or when you want strict, service-specific connectivity.

## Setting Up an AWS PrivateLink Endpoint

### Step 1: Create the Atlas Private Endpoint Service

Via the Atlas CLI:

```bash
atlas privateEndpoints aws create \
  --region us-east-1
```

This returns a `vpcEndpointServiceName` (e.g., `com.amazonaws.vpce.us-east-1.vpce-svc-...`). Save it.

Via the Atlas API:

```bash
curl --user "${PUBLIC_KEY}:${PRIVATE_KEY}" \
  --digest \
  --header "Accept: application/vnd.atlas.2023-01-01+json" \
  --header "Content-Type: application/json" \
  --request POST \
  --data '{ "providerName": "AWS", "region": "us-east-1" }' \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/privateEndpoint/AWS/endpointService"
```

### Step 2: Create the VPC Endpoint in AWS

```bash
VPC_ENDPOINT_ID=$(aws ec2 create-vpc-endpoint \
  --vpc-id vpc-0a1b2c3d4e5f \
  --service-name com.amazonaws.vpce.us-east-1.vpce-svc-0a1b2c3d4e5f \
  --vpc-endpoint-type Interface \
  --subnet-ids subnet-0a1b2c3d subnet-1b2c3d4e \
  --security-group-ids sg-0a1b2c3d \
  --query 'VpcEndpoint.VpcEndpointId' \
  --output text)

echo "Created endpoint: $VPC_ENDPOINT_ID"
```

### Step 3: Register the VPC Endpoint with Atlas

```bash
atlas privateEndpoints aws interfaces create <ATLAS_ENDPOINT_SERVICE_ID> \
  --privateEndpointId "$VPC_ENDPOINT_ID"
```

Via the API:

```bash
curl --user "${PUBLIC_KEY}:${PRIVATE_KEY}" \
  --digest \
  --header "Accept: application/vnd.atlas.2023-01-01+json" \
  --header "Content-Type: application/json" \
  --request POST \
  --data "{\"id\": \"$VPC_ENDPOINT_ID\"}" \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/privateEndpoint/AWS/endpointService/<SERVICE_ID>/endpoint"
```

### Step 4: Update Security Group

Allow outbound traffic from your application to the endpoint on port 27017:

```bash
aws ec2 authorize-security-group-egress \
  --group-id sg-0a1b2c3d \
  --protocol tcp \
  --port 27017 \
  --source-group sg-0a1b2c3d
```

## Setting Up an Azure Private Link Endpoint

### Step 1: Create the Atlas Private Endpoint Service on Azure

```bash
atlas privateEndpoints azure create \
  --region eastus
```

This returns a `serviceResourceId` (the Atlas Private Link resource ID on Azure).

### Step 2: Create the Private Endpoint in Azure

```bash
# Create the private endpoint in your VNet subnet
az network private-endpoint create \
  --name atlas-pe \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --subnet mySubnet \
  --private-connection-resource-id "<ATLAS_SERVICE_RESOURCE_ID>" \
  --group-ids mongoCluster \
  --connection-name AtlasConnection

# Get the private endpoint network interface
PE_NIC_ID=$(az network private-endpoint show \
  --name atlas-pe \
  --resource-group myResourceGroup \
  --query 'networkInterfaces[0].id' -o tsv)

# Get the private IP address
PRIVATE_IP=$(az network nic show --ids $PE_NIC_ID \
  --query 'ipConfigurations[0].privateIpAddress' -o tsv)

echo "Atlas private IP: $PRIVATE_IP"
```

### Step 3: Register the Endpoint with Atlas

```bash
atlas privateEndpoints azure interfaces create <ATLAS_SERVICE_ID> \
  --privateEndpointId "<AZURE_PE_RESOURCE_ID>" \
  --privateEndpointIPAddress "$PRIVATE_IP"
```

## Getting the Private Connection String

After the private endpoint is active, Atlas provides a private connection string. Get it via the CLI:

```bash
atlas clusters connectionStrings describe myCluster
```

The `privateSrv` field contains the private SRV endpoint. Use this in your application:

```javascript
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_PRIVATE_URI;
// e.g., mongodb+srv://appuser:pass@mycluster-private.abcde.mongodb.net/myapp

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000,
  retryWrites: true,
  w: "majority"
});
```

## Verifying the Private Endpoint

Check the status:

```bash
atlas privateEndpoints aws list
```

Look for `AVAILABLE` status. Then test connectivity from within your VPC:

```bash
# DNS resolution should return a private IP
nslookup mycluster-private.abcde.mongodb.net

# Test TCP connectivity
nc -zv <private-endpoint-host> 27017
```

## IP Access List with Private Endpoints

When using private endpoints, you can remove public IPs from the Atlas access list. Add your VPC's private CIDR range:

```bash
atlas accessLists create "10.0.0.0/16" \
  --comment "App VPC private range for private endpoint"
```

For even tighter security, set the access list to only allow the specific private endpoint IP:

```bash
atlas accessLists create "10.0.5.10" \
  --comment "Private endpoint IP only"
```

## Summary

Private endpoints (AWS PrivateLink, Azure Private Link, GCP Private Service Connect) create a dedicated private IP in your VPC that routes to Atlas without public internet exposure. Create the Atlas endpoint service first, then create the matching cloud provider endpoint resource, register it with Atlas, and switch to the private SRV connection string. Private endpoints allow overlapping CIDRs and provide service-level isolation compared to VPC peering. They are available on M10+ dedicated clusters.
