# How to Configure Azure Private Endpoint for AKS API Server Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Kubernetes, AKS, Networking

Description: Set up Azure Private Endpoint for AKS to enable secure private connectivity to the Kubernetes API server without public internet exposure.

---

Azure Private Endpoint provides secure private connectivity to AKS API servers through Azure Private Link, eliminating the need for public endpoints while enabling access from on-premises networks through VPN or ExpressRoute.

This guide demonstrates how to configure private endpoints for AKS clusters and access them from private networks.

## Creating AKS with Private Cluster

Create a private AKS cluster:

```bash
az aks create \
  --resource-group myResourceGroup \
  --name private-aks \
  --network-plugin azure \
  --enable-private-cluster \
  --private-dns-zone system \
  --load-balancer-sku standard \
  --node-count 3 \
  --node-vm-size Standard_D2s_v3
```

The `--enable-private-cluster` flag configures a private API server endpoint.

For custom private DNS zone:

```bash
# Create private DNS zone first
az network private-dns zone create \
  --resource-group myResourceGroup \
  --name privatelink.eastus.azmk8s.io

# Get zone ID
ZONE_ID=$(az network private-dns zone show \
  --resource-group myResourceGroup \
  --name privatelink.eastus.azmk8s.io \
  --query id -o tsv)

# Create cluster with custom zone
az aks create \
  --resource-group myResourceGroup \
  --name private-aks \
  --enable-private-cluster \
  --private-dns-zone $ZONE_ID \
  --network-plugin azure
```

## Updating Existing Cluster to Private

Convert public cluster to private:

```bash
az aks update \
  --resource-group myResourceGroup \
  --name my-aks-cluster \
  --enable-private-cluster
```

Note: This operation requires cluster restart and causes brief downtime.

## Configuring Private Endpoint

The private endpoint is created automatically with private cluster. View it:

```bash
# Get private endpoint information
az aks show \
  --resource-group myResourceGroup \
  --name private-aks \
  --query '{privateFqdn:privateFqdn,fqdn:fqdn}'

# Get private endpoint details
az network private-endpoint list \
  --resource-group MC_myResourceGroup_private-aks_eastus \
  --query "[?contains(name, 'kube-apiserver')]"
```

## Accessing from VNet

Deploy a VM in the same VNet for access:

```bash
# Create VM in AKS VNet
az vm create \
  --resource-group myResourceGroup \
  --name jumpbox \
  --image UbuntuLTS \
  --vnet-name aks-vnet \
  --subnet default \
  --admin-username azureuser \
  --generate-ssh-keys

# SSH to jumpbox
ssh azureuser@JUMPBOX_PUBLIC_IP

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Get AKS credentials
az login
az aks get-credentials \
  --resource-group myResourceGroup \
  --name private-aks

# Access cluster
kubectl get nodes
```

## Setting Up VPN Gateway for On-Premises Access

Create VPN gateway:

```bash
# Create gateway subnet
az network vnet subnet create \
  --resource-group myResourceGroup \
  --vnet-name aks-vnet \
  --name GatewaySubnet \
  --address-prefixes 10.240.255.0/24

# Create public IP for VPN gateway
az network public-ip create \
  --resource-group myResourceGroup \
  --name vpn-gateway-ip \
  --allocation-method Dynamic

# Create VPN gateway (takes 30-45 minutes)
az network vnet-gateway create \
  --resource-group myResourceGroup \
  --name aks-vpn-gateway \
  --public-ip-address vpn-gateway-ip \
  --vnet aks-vnet \
  --gateway-type Vpn \
  --vpn-type RouteBased \
  --sku VpnGw1 \
  --no-wait
```

Create local network gateway for on-premises:

```bash
az network local-gateway create \
  --resource-group myResourceGroup \
  --name onprem-gateway \
  --gateway-ip-address 203.0.113.50 \
  --local-address-prefixes 10.0.0.0/8
```

Create VPN connection:

```bash
az network vpn-connection create \
  --resource-group myResourceGroup \
  --name onprem-to-azure \
  --vnet-gateway1 aks-vpn-gateway \
  --local-gateway2 onprem-gateway \
  --shared-key "SecretSharedKey"
```

## Using ExpressRoute

For dedicated connectivity:

```bash
# Create ExpressRoute circuit
az network express-route create \
  --resource-group myResourceGroup \
  --name aks-expressroute \
  --peering-location "Washington DC" \
  --bandwidth 200 \
  --provider "Equinix" \
  --sku-family MeteredData \
  --sku-tier Standard

# Create virtual network gateway
az network vnet-gateway create \
  --resource-group myResourceGroup \
  --name expressroute-gateway \
  --vnet aks-vnet \
  --gateway-type ExpressRoute \
  --sku Standard

# Connect circuit to gateway
az network vpn-connection create \
  --resource-group myResourceGroup \
  --name expressroute-connection \
  --vnet-gateway1 expressroute-gateway \
  --express-route-circuit2 aks-expressroute
```

## Configuring with Terraform

Define private AKS cluster:

```hcl
# private-aks.tf
resource "azurerm_kubernetes_cluster" "private" {
  name                = "private-aks"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "privateaks"

  private_cluster_enabled = true
  private_dns_zone_id    = azurerm_private_dns_zone.aks.id

  default_node_pool {
    name                = "default"
    node_count          = 3
    vm_size            = "Standard_D2s_v3"
    vnet_subnet_id     = azurerm_subnet.aks.id
    enable_auto_scaling = true
    min_count          = 1
    max_count          = 5
  }

  network_profile {
    network_plugin     = "azure"
    load_balancer_sku  = "standard"
    service_cidr       = "10.1.0.0/16"
    dns_service_ip     = "10.1.0.10"
  }

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_private_dns_zone" "aks" {
  name                = "privatelink.eastus.azmk8s.io"
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "aks" {
  name                  = "aks-dns-link"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.aks.name
  virtual_network_id    = azurerm_virtual_network.main.id
}
```

VPN gateway configuration:

```hcl
resource "azurerm_subnet" "gateway" {
  name                 = "GatewaySubnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.240.255.0/24"]
}

resource "azurerm_public_ip" "vpn" {
  name                = "vpn-gateway-ip"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Dynamic"
}

resource "azurerm_virtual_network_gateway" "vpn" {
  name                = "aks-vpn-gateway"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  type     = "Vpn"
  vpn_type = "RouteBased"
  sku      = "VpnGw1"

  ip_configuration {
    name                          = "vnetGatewayConfig"
    public_ip_address_id          = azurerm_public_ip.vpn.id
    private_ip_address_allocation = "Dynamic"
    subnet_id                     = azurerm_subnet.gateway.id
  }
}
```

## Configuring DNS Resolution

For on-premises DNS resolution:

```bash
# Get private DNS zone name
az aks show \
  --resource-group myResourceGroup \
  --name private-aks \
  --query privateFqdn

# Configure on-premises DNS to forward queries
# Example for BIND:
zone "privatelink.eastus.azmk8s.io" {
    type forward;
    forwarders { 10.240.0.4; 10.240.0.5; };
};
```

Or use Azure Private DNS:

```bash
# Link private DNS zone to on-premises VNet
az network private-dns link vnet create \
  --resource-group myResourceGroup \
  --zone-name privatelink.eastus.azmk8s.io \
  --name onprem-link \
  --virtual-network onprem-vnet \
  --registration-enabled false
```

## Testing Connectivity

From on-premises:

```bash
# Test DNS resolution
nslookup private-aks-XXXX.privatelink.eastus.azmk8s.io

# Test API server connectivity
curl -k https://private-aks-XXXX.privatelink.eastus.azmk8s.io:443

# Get kubeconfig
az aks get-credentials \
  --resource-group myResourceGroup \
  --name private-aks

# Verify access
kubectl get nodes
kubectl get pods --all-namespaces
```

## Monitoring Private Endpoint

Check private endpoint status:

```bash
# View private endpoint
az network private-endpoint show \
  --resource-group MC_myResourceGroup_private-aks_eastus \
  --name kube-apiserver-xxxxx

# Check DNS records
az network private-dns record-set list \
  --resource-group myResourceGroup \
  --zone-name privatelink.eastus.azmk8s.io
```

Monitor VPN connection:

```bash
az network vpn-connection show \
  --resource-group myResourceGroup \
  --name onprem-to-azure \
  --query connectionStatus
```

## Troubleshooting

If unable to resolve DNS:

```bash
# Verify private DNS zone link
az network private-dns link vnet list \
  --resource-group myResourceGroup \
  --zone-name privatelink.eastus.azmk8s.io

# Check DNS records
dig private-aks-XXXX.privatelink.eastus.azmk8s.io
```

If connection fails:

```bash
# Verify VPN status
az network vnet-gateway list-bgp-peer-status \
  --resource-group myResourceGroup \
  --name aks-vpn-gateway

# Check effective routes
az network nic show-effective-route-table \
  --resource-group myResourceGroup \
  --name jumpbox-nic
```

## Conclusion

Azure Private Endpoint for AKS provides secure private connectivity to Kubernetes API servers, eliminating public internet exposure while enabling access from on-premises networks. Combined with VPN Gateway or ExpressRoute, this architecture supports hybrid cloud scenarios where security and compliance require private connectivity.

Proper configuration of private DNS zones and network routes ensures seamless access for kubectl and automation tools from both Azure VNets and on-premises networks.
