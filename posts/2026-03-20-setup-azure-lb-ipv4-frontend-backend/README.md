# How to Set Up Azure Load Balancer with IPv4 Frontend and Backend Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Load Balancer, IPv4, Frontend, Backend Pool, Standard SKU

Description: Configure Azure Standard Load Balancer with a public IPv4 frontend IP, backend pool of VMs, health probe, and load balancing rules using the Azure CLI.

## Introduction

Azure Load Balancer is a Layer 4 (TCP/UDP) service. The Standard SKU supports availability zones, HA ports for internal load balancers, and backend pools with VMs, VMSS, and IP-based targets. This guide builds a complete load balancer configuration step by step.

## Create Supporting Resources

```bash
RESOURCE_GROUP="lb-rg"
LOCATION="eastus"

az group create --name $RESOURCE_GROUP --location $LOCATION

# Create VNet and subnet

az network vnet create \
  --resource-group $RESOURCE_GROUP \
  --name lb-vnet \
  --address-prefixes 10.0.0.0/16 \
  --subnet-name lb-subnet \
  --subnet-prefixes 10.0.1.0/24

# Create NSG to allow inbound web traffic through Standard Load Balancer
az network nsg create \
  --resource-group $RESOURCE_GROUP \
  --name lb-nsg

az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name lb-nsg \
  --name allow-http \
  --protocol Tcp \
  --direction Inbound \
  --source-address-prefix Internet \
  --source-port-range '*' \
  --destination-address-prefix '*' \
  --destination-port-range 80 \
  --access Allow \
  --priority 100

az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name lb-nsg \
  --name allow-https \
  --protocol Tcp \
  --direction Inbound \
  --source-address-prefix Internet \
  --source-port-range '*' \
  --destination-address-prefix '*' \
  --destination-port-range 443 \
  --access Allow \
  --priority 110

# Create public IP for the frontend
az network public-ip create \
  --resource-group $RESOURCE_GROUP \
  --name lb-pip \
  --sku Standard \
  --allocation-method Static
```

## Create the Load Balancer

```bash
az network lb create \
  --resource-group $RESOURCE_GROUP \
  --name prod-lb \
  --sku Standard \
  --frontend-ip-name frontend-ip \
  --public-ip-address lb-pip \
  --backend-pool-name backend-pool
```

## Add Health Probe

```bash
az network lb probe create \
  --resource-group $RESOURCE_GROUP \
  --lb-name prod-lb \
  --name http-probe \
  --protocol Http \
  --port 80 \
  --path /health \
  --interval 15 \
  --threshold 2
```

## Add Load Balancing Rules

```bash
# HTTP rule
az network lb rule create \
  --resource-group $RESOURCE_GROUP \
  --lb-name prod-lb \
  --name http-rule \
  --frontend-ip-name frontend-ip \
  --frontend-port 80 \
  --backend-pool-name backend-pool \
  --backend-port 80 \
  --protocol Tcp \
  --probe-name http-probe \
  --disable-outbound-snat true \
  --idle-timeout 4 \
  --enable-tcp-reset true

# HTTPS rule
az network lb rule create \
  --resource-group $RESOURCE_GROUP \
  --lb-name prod-lb \
  --name https-rule \
  --frontend-ip-name frontend-ip \
  --frontend-port 443 \
  --backend-pool-name backend-pool \
  --backend-port 443 \
  --protocol Tcp \
  --probe-name http-probe \
  --disable-outbound-snat true \
  --enable-tcp-reset true
```

## Create Backend VMs and Add to Pool

```bash
for i in 1 2; do
  # Create NIC
  az network nic create \
    --resource-group $RESOURCE_GROUP \
    --name vm${i}-nic \
    --vnet-name lb-vnet \
    --subnet lb-subnet \
    --network-security-group lb-nsg \
    --lb-name prod-lb \
    --lb-address-pools backend-pool

  # Create VM using the NIC
  az vm create \
    --resource-group $RESOURCE_GROUP \
    --name web-vm-$i \
    --nics vm${i}-nic \
    --image Ubuntu2204 \
    --admin-username azureuser \
    --generate-ssh-keys \
    --no-wait
done
```

## Outbound NAT Rules (for backend VMs to reach internet)

```bash
# Create outbound public IP
az network public-ip create \
  --resource-group $RESOURCE_GROUP \
  --name outbound-pip \
  --sku Standard \
  --allocation-method Static

# Add outbound frontend IP
az network lb frontend-ip create \
  --resource-group $RESOURCE_GROUP \
  --lb-name prod-lb \
  --name outbound-frontend \
  --public-ip-address outbound-pip

# Create outbound rule
az network lb outbound-rule create \
  --resource-group $RESOURCE_GROUP \
  --lb-name prod-lb \
  --name outbound-rule \
  --frontend-ip-configs outbound-frontend \
  --protocol All \
  --address-pool backend-pool \
  --outbound-ports 10000
```

## Verifying the Load Balancer

```bash
# Get the frontend public IP
az network public-ip show \
  --resource-group $RESOURCE_GROUP \
  --name lb-pip \
  --query ipAddress \
  --output tsv

# Check backend pool membership
az network lb address-pool show \
  --resource-group $RESOURCE_GROUP \
  --lb-name prod-lb \
  --name backend-pool \
  --query 'backendIPConfigurations[].id'
```

## Conclusion

A Standard Load Balancer setup for inbound traffic needs a frontend IP (public or private), backend pool, health probe, and load balancing rules. Create VMs with NICs that reference the backend pool and a network security group that allows the load-balanced traffic. Add outbound rules to provide backend VMs with internet access via a separate public IP. Enable TCP reset for faster connection cleanup on idle timeouts.
