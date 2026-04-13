# How to Configure MongoDB Atlas Network Peering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Network Peering, VPC, Security

Description: Configure MongoDB Atlas network peering to establish private VPC connections between Atlas clusters and your cloud infrastructure without traffic over the public internet.

---

## What Is Network Peering?

Network peering (VPC Peering on AWS/GCP, VNet Peering on Azure) creates a private network connection between your Atlas cluster's VPC and your application's VPC. Traffic stays within the cloud provider's backbone network - no public internet exposure.

Benefits:
- Lower latency than public connections
- No data egress charges (within the same region)
- Enhanced security - no public IP needed for Atlas
- Simpler firewall rules

## Prerequisites

- Atlas M10 or higher (peering not available on free/shared tiers)
- AWS VPC, GCP VPC, or Azure VNet in the same cloud provider and region as your Atlas cluster
- Sufficient permissions to modify VPC/VNet routing and peering settings

## AWS VPC Peering

### Step 1: Get Atlas VPC Information

In Atlas, go to **Network Access > Peering** and click **Add Peering Connection**. Select **AWS** and note the Atlas AWS Account ID and Atlas VPC ID shown.

### Step 2: Configure the Peering in Atlas

Fill in the form:
- **AWS Account ID**: Your AWS account ID
- **VPC ID**: Your application VPC ID
- **VPC CIDR Block**: Your VPC's CIDR (e.g., `10.0.0.0/16`)
- **AWS Region**: Must match Atlas cluster region

```bash
# Using Atlas CLI
atlas networking peering create aws \
  --accountId 123456789012 \
  --vpcId vpc-0abc1234def56789 \
  --routeTableCidrBlock 10.0.0.0/16 \
  --region us-east-1
```

### Step 3: Accept the Peering Request in AWS

After Atlas initiates the request, accept it in the AWS Console:

1. Go to **VPC > Peering Connections** in the AWS Console
2. Find the pending connection from MongoDB Atlas
3. Select it and click **Actions > Accept Request**

### Step 4: Update Route Tables in AWS

Add a route to each subnet route table:

```text
Destination: 192.168.248.0/21  (Atlas VPC CIDR - shown in Atlas UI)
Target: pcx-0abc123456789def   (The peering connection ID)
```

Via AWS CLI:

```bash
aws ec2 create-route \
  --route-table-id rtb-12345678 \
  --destination-cidr-block 192.168.248.0/21 \
  --vpc-peering-connection-id pcx-0abc123456789def
```

### Step 5: Update Atlas IP Access List

Add your VPC CIDR to Atlas Network Access:

```bash
atlas accessList create "10.0.0.0/16" \
  --comment "Application VPC"
```

### Step 6: Connect Using Private Connection String

Once peering is established (status shows AVAILABLE), use the private endpoint in your connection string:

```text
mongodb+srv://cluster0-pri.abc123.mongodb.net
```

Atlas provides the private hostname in the cluster's connection dialog under "VPC Peering" tab.

## GCP VPC Peering

### Step 1: Initiate Peering in Atlas

```bash
atlas networking peering create gcp \
  --gcpProjectId my-gcp-project-123 \
  --networkName my-app-network \
  --atlasCidrBlock 192.168.0.0/18
```

### Step 2: Create Peering from GCP Side

```bash
gcloud compute networks peerings create atlas-peering \
  --network=my-app-network \
  --peer-project=mongodb-atlas-project \
  --peer-network=atlas-vpc-name \
  --import-custom-routes \
  --export-custom-routes
```

### Step 3: Verify Peering Status

```bash
gcloud compute networks peerings list --network=my-app-network
```

Expected output:

```text
NAME           NETWORK          PEER_PROJECT   PEER_NETWORK  STATE
atlas-peering  my-app-network   atlas-project  atlas-vpc     ACTIVE
```

## Azure VNet Peering

### Step 1: Initiate in Atlas

In Atlas UI, select **Azure** and provide:
- **Azure Directory ID** (Tenant ID)
- **Azure Subscription ID**
- **Resource Group Name**
- **VNet Name**
- **Atlas CIDR Block**

```bash
atlas networking peering create azure \
  --atlasCidrBlock 192.168.248.0/21 \
  --azureDirectoryId your-tenant-id \
  --azureSubscriptionId your-subscription-id \
  --resourceGroupName myResourceGroup \
  --vnetName myVNet
```

### Step 2: Accept in Azure

Atlas creates a peering request in your Azure subscription. Accept it:

```bash
az network vnet peering update \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --name atlas-peering \
  --set allowVirtualNetworkAccess=true
```

## Verify Connectivity

After peering is established, test from an EC2/GCE/Azure VM in the peered VPC:

```bash
# Test DNS resolution
nslookup cluster0-pri.abc123.mongodb.net

# Test connectivity
mongosh "mongodb+srv://user:pass@cluster0-pri.abc123.mongodb.net/test"
```

## Summary

Atlas network peering creates private VPC/VNet connections between your Atlas cluster and application infrastructure, keeping all database traffic off the public internet. The process involves initiating the peering request from Atlas, accepting it in your cloud console, updating route tables and access lists, then connecting using the private Atlas hostname. Supported on AWS (VPC Peering), GCP (VPC Peering), and Azure (VNet Peering).
