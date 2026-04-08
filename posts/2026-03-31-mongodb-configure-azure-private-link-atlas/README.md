# How to Configure Azure Private Link for MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Azure, PrivateLink, Networking

Description: Set up Azure Private Link for MongoDB Atlas to route database traffic through private endpoints inside your Azure VNet, avoiding the public internet.

---

## Why Use Azure Private Link with Atlas

Azure Private Link lets you connect to MongoDB Atlas over a private endpoint within your Azure VNet. Traffic between your application and Atlas never leaves the Microsoft Azure backbone network. This is essential for compliance-heavy workloads and reduces exposure to public internet threats.

## Prerequisites

- Atlas M10 or higher cluster deployed in an Azure region
- Azure subscription with Contributor access
- Atlas project owner permissions

## Step 1: Enable Private Endpoint in Atlas

In Atlas, go to **Network Access** > **Private Endpoint** > **Add Private Endpoint**. Select **Azure**, your region, and copy the Atlas Private Link service resource ID:

```text
/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-atlas/providers/Microsoft.Network/privateLinkServices/pls-atlas-eastus
```

## Step 2: Create the Private Endpoint in Azure

Use the Azure CLI to create the private endpoint in your VNet:

```bash
az network private-endpoint create \
  --name myAtlasPrivateEndpoint \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --subnet mySubnet \
  --private-connection-resource-id "/subscriptions/00000000.../privateLinkServices/pls-atlas-eastus" \
  --connection-name atlasConnection \
  --location eastus
```

Get the private endpoint resource ID for later:

```bash
az network private-endpoint show \
  --name myAtlasPrivateEndpoint \
  --resource-group myResourceGroup \
  --query "id" \
  --output tsv
```

## Step 3: Register the Endpoint in Atlas

Submit the Azure private endpoint ID to Atlas:

```bash
curl --user "PUBLIC_KEY:PRIVATE_KEY" --digest \
  --header "Content-Type: application/json" \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/privateEndpoint/azure/endpointService/{endpointServiceId}/endpoint" \
  --data '{
    "id": "/subscriptions/.../privateEndpoints/myAtlasPrivateEndpoint",
    "privateEndpointIPAddress": "10.0.1.5"
  }'
```

## Step 4: Configure Private DNS Zone

Atlas hostnames must resolve to private IP addresses inside your VNet. Create a private DNS zone and link it:

```bash
az network private-dns zone create \
  --resource-group myResourceGroup \
  --name "privatelink.mongodb.net"

az network private-dns link vnet create \
  --resource-group myResourceGroup \
  --zone-name "privatelink.mongodb.net" \
  --name myDNSLink \
  --virtual-network myVNet \
  --registration-enabled false
```

Add a DNS A record pointing the Atlas hostname to the private endpoint IP:

```bash
az network private-dns record-set a add-record \
  --resource-group myResourceGroup \
  --zone-name "privatelink.mongodb.net" \
  --record-set-name "cluster0-pl-0.abcde" \
  --ipv4-address 10.0.1.5
```

## Step 5: Connect Using the Private Endpoint String

Retrieve the private endpoint connection string from Atlas UI:

```python
from pymongo import MongoClient

uri = "mongodb+srv://cluster0-pl-0.abcde.privatelink.mongodb.net/?authSource=admin"
client = MongoClient(uri, username="myUser", password="myPassword", tls=True)
db = client["mydb"]
print(db.list_collection_names())
```

## Summary

Azure Private Link for MongoDB Atlas routes all traffic through private endpoints within your Azure VNet, using the Microsoft backbone rather than the public internet. The process involves enabling a private endpoint in Atlas, creating the corresponding Azure private endpoint, registering the endpoint ID back in Atlas, configuring a private DNS zone for hostname resolution, and using the private endpoint connection string in your application.
