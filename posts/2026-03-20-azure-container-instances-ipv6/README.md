# How to Configure IPv6 for Azure Container Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, IPv6, Container Instances, ACI, Container, VNet Integration

Description: Configure Azure Container Instances with IPv6 connectivity through VNet integration, enabling containers to communicate over IPv6 and receive IPv6 addresses.

## Introduction

Azure Container Instances (ACI) can be deployed into a delegated subnet in an Azure Virtual Network, but ACI doesn't currently support IPv6 addresses. Even if the virtual network uses dual-stack IPv4/IPv6 address space, ACI container groups receive only private IPv4 addresses. Public ACI deployments and VNet-integrated deployments are both IPv4-only today.

## Deploy Container Instance in VNet

```bash
RG="rg-aci-vnet"
LOCATION="eastus"

# Create resource group
az group create --name "$RG" --location "$LOCATION"

# Create VNet
az network vnet create \
    --resource-group "$RG" \
    --name vnet-aci \
    --address-prefixes "10.0.0.0/16"

# Create subnet for ACI (must be delegated)
az network vnet subnet create \
    --resource-group "$RG" \
    --vnet-name vnet-aci \
    --name subnet-aci \
    --address-prefixes "10.0.1.0/24" \
    --delegations "Microsoft.ContainerInstance/containerGroups"

# Deploy container group in VNet subnet
az container create \
    --resource-group "$RG" \
    --name aci-web \
    --image nginx:latest \
    --cpu 1 \
    --memory 1.5 \
    --ip-address Private \
    --vnet vnet-aci \
    --subnet subnet-aci \
    --ports 80

# Get container private IPv4 address
az container show \
    --resource-group "$RG" \
    --name aci-web \
    --query "ipAddress.ip" --output tsv
```

## Terraform ACI in VNet

```hcl
# aci_vnet.tf

resource "azurerm_container_group" "web" {
  name                = "aci-web"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  ip_address_type     = "Private"  # Required for VNet integration
  os_type             = "Linux"

  # VNet integration gives the container group a private IPv4 address.
  subnet_ids = [azurerm_subnet.aci.id]

  container {
    name   = "nginx"
    image  = "nginx:latest"
    cpu    = "0.5"
    memory = "1.5"

    ports {
      port     = 80
      protocol = "TCP"
    }
  }

  tags = { Name = "aci-web" }
}

# Subnet with ACI delegation
resource "azurerm_subnet" "aci" {
  name                 = "subnet-aci"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name

  address_prefixes = [
    "10.0.1.0/24",
  ]

  delegation {
    name = "aci-delegation"
    service_delegation {
      name    = "Microsoft.ContainerInstance/containerGroups"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
        "Microsoft.Network/virtualNetworks/subnets/prepareNetworkPolicies/action",
      ]
    }
  }
}
```

## Verify Networking Inside ACI Container

```bash
# Get the container group's private IPv4 address
az container show \
    --resource-group "$RG" \
    --name aci-web \
    --query "ipAddress.ip" --output tsv

# Execute into the container
az container exec \
    --resource-group "$RG" \
    --name aci-web \
    --exec-command "/bin/sh"

# Inside container:
cat /etc/hosts
# The container hostname is mapped to the private IPv4 address assigned from the delegated subnet.
# ACI doesn't currently assign IPv6 addresses.
```

## Multi-Container Group in VNet

```yaml
# aci-group.yaml - Multi-container group in a VNet
apiVersion: '2021-10-01'
location: eastus
name: aci-multi-container
properties:
  containers:
  - name: web
    properties:
      image: mcr.microsoft.com/azuredocs/aci-helloworld:latest
      ports:
      - port: 80
        protocol: TCP
      resources:
        requests:
          cpu: 0.5
          memoryInGB: 0.5
  - name: sidecar
    properties:
      image: mcr.microsoft.com/azuredocs/aci-tutorial-sidecar
      resources:
        requests:
          cpu: 0.5
          memoryInGB: 0.5
  ipAddress:
    type: Private
    ports:
    - protocol: TCP
      port: 80
  subnetIds:
  - id: /subscriptions/xxx/resourceGroups/rg-aci-vnet/providers/Microsoft.Network/virtualNetworks/vnet-aci/subnets/subnet-aci
    name: subnet-aci
  osType: Linux
  restartPolicy: Always
type: Microsoft.ContainerInstance/containerGroups
```

## Conclusion

Azure Container Instances don't currently support IPv6 addresses, including VNet-integrated deployments. Use a delegated subnet and `Private` IP configuration to give a container group private IPv4 connectivity inside an Azure Virtual Network. If the container group needs outbound internet access from the VNet, attach a NAT gateway. For public ingress to a VNet-integrated container group, place Azure Application Gateway or Azure Standard Load Balancer in front of it.
