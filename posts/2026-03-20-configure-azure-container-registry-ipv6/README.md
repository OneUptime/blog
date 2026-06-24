# How to Configure Azure Container Registry with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Container Registry, ACR, IPv6, Azure, Docker, AKS, DevOps

Description: Configure Azure Container Registry to push and pull container images over IPv6, using Azure Private Endpoints with dual-stack support and AKS IPv6 integration.

---

Azure Container Registry (ACR) can be used from dual-stack Azure networks by combining Azure Private Link, private DNS, and dual-stack AKS networking. This guide covers configuring ACR for private access from Azure and on-premises networks while your workloads run in dual-stack environments.

## Checking ACR Reachability

```bash
# After the registry is created, check whether its name resolves

dig myregistry.azurecr.io +short

# Test connectivity to the registry API
curl https://myregistry.azurecr.io/v2/ 2>&1 | head -5
```

## Installing Azure CLI and Authenticating

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Or use service principal authentication
az login --service-principal \
  --username APP_ID \
  --password PASSWORD \
  --tenant TENANT_ID

# Configure Docker for ACR
az acr login --name myregistry
```

## Creating an ACR with Premium SKU (for Private Endpoints)

```bash
# Create Resource Group
az group create \
  --name myResourceGroup \
  --location eastus

# Create ACR (Premium required for private endpoints)
az acr create \
  --resource-group myResourceGroup \
  --name myregistry \
  --sku Premium \
  --location eastus

# Verify creation
az acr show --name myregistry --query loginServer
```

## Configuring ACR Private Endpoint in a Dual-Stack VNet

```bash
# Create a VNet with IPv4 and IPv6 address spaces
az network vnet create \
  --resource-group myResourceGroup \
  --name myVNet \
  --address-prefixes 10.0.0.0/16 2001:db8:1::/48 \
  --subnet-name mySubnet \
  --subnet-prefixes 10.0.1.0/24 2001:db8:1:1::/64

# Disable private endpoint network policies on the subnet
az network vnet subnet update \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --name mySubnet \
  --disable-private-endpoint-network-policies

# Create the private DNS zone and link it to the VNet
az network private-dns zone create \
  --resource-group myResourceGroup \
  --name privatelink.azurecr.io

az network private-dns link vnet create \
  --resource-group myResourceGroup \
  --zone-name privatelink.azurecr.io \
  --name myDNSLink \
  --virtual-network myVNet \
  --registration-enabled false

# Create private endpoint for ACR
REGISTRY_NAME=myregistry
REGISTRY_LOCATION=$(az acr show --name $REGISTRY_NAME --query location -o tsv)
ACR_ID=$(az acr show --name $REGISTRY_NAME --query id -o tsv)

az network private-endpoint create \
  --resource-group myResourceGroup \
  --name myACRPrivateEndpoint \
  --vnet-name myVNet \
  --subnet mySubnet \
  --private-connection-resource-id "$ACR_ID" \
  --group-ids registry \
  --connection-name myACRConnection

# Get the private endpoint NIC so you can create DNS records
NETWORK_INTERFACE_ID=$(az network private-endpoint show \
  --name myACRPrivateEndpoint \
  --resource-group myResourceGroup \
  --query 'networkInterfaces[0].id' \
  -o tsv)

REGISTRY_PRIVATE_IP=$(az network nic show \
  --ids "$NETWORK_INTERFACE_ID" \
  --query "ipConfigurations[?privateLinkConnectionProperties.requiredMemberName=='registry'].privateIPAddress" \
  -o tsv)

DATA_ENDPOINT_PRIVATE_IP=$(az network nic show \
  --ids "$NETWORK_INTERFACE_ID" \
  --query "ipConfigurations[?privateLinkConnectionProperties.requiredMemberName=='registry_data_$REGISTRY_LOCATION'].privateIPAddress" \
  -o tsv)

# Create private DNS records for the registry and data endpoint
az network private-dns record-set a create \
  --name $REGISTRY_NAME \
  --zone-name privatelink.azurecr.io \
  --resource-group myResourceGroup

az network private-dns record-set a add-record \
  --record-set-name $REGISTRY_NAME \
  --zone-name privatelink.azurecr.io \
  --resource-group myResourceGroup \
  --ipv4-address "$REGISTRY_PRIVATE_IP"

az network private-dns record-set a create \
  --name ${REGISTRY_NAME}.${REGISTRY_LOCATION}.data \
  --zone-name privatelink.azurecr.io \
  --resource-group myResourceGroup

az network private-dns record-set a add-record \
  --record-set-name ${REGISTRY_NAME}.${REGISTRY_LOCATION}.data \
  --zone-name privatelink.azurecr.io \
  --resource-group myResourceGroup \
  --ipv4-address "$DATA_ENDPOINT_PRIVATE_IP"

# Check private DNS resolution for the registry
dig $REGISTRY_NAME.azurecr.io +short
```

## Pushing and Pulling Images from the Connected Network

```bash
# Login to ACR
az acr login --name myregistry

# Build and push image
docker build -t myapp:latest .
docker tag myapp:latest myregistry.azurecr.io/myapp:latest
docker push myregistry.azurecr.io/myapp:latest

# List repositories
az acr repository list --name myregistry

# Pull image
docker pull myregistry.azurecr.io/myapp:latest

# Confirm the registry API is reachable from the connected network
curl https://myregistry.azurecr.io/v2/ 2>&1 | head -5
```

## Configuring AKS with Dual-Stack Networking to Use ACR

If you disable public access on the registry, make sure the AKS cluster can resolve and reach the ACR private endpoint through the same virtual network or a peered network.

```bash
# Create AKS cluster with dual-stack networking and ACR integration
az aks create \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --attach-acr myregistry \
  --ip-families ipv4,ipv6 \
  --network-plugin azure \
  --network-plugin-mode overlay \
  --pod-cidrs 10.244.0.0/16,fd12:3456:789a::/64 \
  --service-cidrs 10.0.0.0/16,fd12:3456:789a:1::/108 \
  --enable-managed-identity \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group myResourceGroup \
  --name myAKSCluster

# Deploy using ACR image
kubectl create deployment myapp \
  --image=myregistry.azurecr.io/myapp:latest
```

## Geo-Replication for High Availability

If the registry uses private endpoints, add the corresponding private DNS record for each replica's regional data endpoint after you create the replica.

```bash
# Add geo-replication to another Azure region
az acr replication create \
  --registry myregistry \
  --location westeurope

# List replications
az acr replication list --registry myregistry --output table
```

## ACR Webhook Events

```bash
# Create a webhook for push events
az acr webhook create \
  --registry myregistry \
  --name mywebhook \
  --uri https://webhook.example.com/webhook \
  --actions push delete

# Test the webhook
az acr webhook ping --registry myregistry --name mywebhook
```

Azure Container Registry fits well into dual-stack Azure deployments when you combine Premium SKU, Private Link, private DNS, and dual-stack AKS networking. In practice, the registry connectivity is established through Private Link and DNS while dual-stack workloads continue to access the registry from the same connected network.
