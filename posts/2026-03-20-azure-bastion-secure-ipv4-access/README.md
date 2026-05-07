# How to Configure Azure Bastion for Secure IPv4 Access to VMs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Bastion, Security, IPv4, SSH, RDP, Networking

Description: Deploy Azure Bastion to provide secure browser-based RDP and SSH access to VMs using private IPv4 addresses without exposing them to the public internet.

## Introduction

Azure Bastion is a fully managed PaaS service that provides secure, seamless RDP and SSH connectivity to virtual machines directly from the Azure portal over TLS. VMs do not need public IP addresses or open inbound ports - eliminating common attack vectors.

## Benefits of Azure Bastion

- No public IP required on VMs
- No need to manage jump servers or VPNs
- RDP/SSH over port 443 (passes most corporate firewalls)
- Supports Microsoft Entra ID authentication for supported RDP/SSH scenarios
- Protects against port scanning and brute-force attacks

## Prerequisites

- An Azure VNet with a dedicated subnet named exactly `AzureBastionSubnet` (minimum /26)
- Create the subnet without route tables or delegations; if you attach an NSG to `AzureBastionSubnet`, configure the required Bastion rules

## Deploying Azure Bastion

```bash
# Step 1: Create the required AzureBastionSubnet (name is mandatory)

az network vnet subnet create \
  --resource-group rg-prod \
  --vnet-name prod-vnet \
  --name AzureBastionSubnet \
  --address-prefix 10.0.255.0/26    # Must be at least /26

# Step 2: Create a Standard public IP for Bastion
az network public-ip create \
  --resource-group rg-prod \
  --name bastion-pip \
  --sku Standard \
  --allocation-method Static \
  --location eastus

# Step 3: Deploy Azure Bastion
az network bastion create \
  --resource-group rg-prod \
  --name prod-bastion \
  --public-ip-address bastion-pip \
  --vnet-name prod-vnet \
  --location eastus \
  --sku Standard \
  --enable-tunneling true     # Required for az network bastion ssh/rdp native-client commands
```

Deployment takes 5–10 minutes as Azure provisions the managed infrastructure.

## Connecting to a VM via Bastion

From the Azure Portal:
1. Navigate to your VM
2. Click **Connect > Bastion**
3. Enter credentials and click **Connect**

Using Azure CLI with native client (requires Bastion tunneling enabled; `az network bastion rdp` uses a local Windows client):

```bash
# Connect to a Linux VM via SSH through Bastion
az network bastion ssh \
  --name prod-bastion \
  --resource-group rg-prod \
  --target-resource-id /subscriptions/SUB_ID/resourceGroups/rg-prod/providers/Microsoft.Compute/virtualMachines/my-vm \
  --auth-type ssh-key \
  --username azureuser \
  --ssh-key ~/.ssh/id_rsa

# Connect to a Windows VM via RDP through Bastion
az network bastion rdp \
  --name prod-bastion \
  --resource-group rg-prod \
  --target-resource-id /subscriptions/SUB_ID/resourceGroups/rg-prod/providers/Microsoft.Compute/virtualMachines/my-win-vm
```

## Removing Public IPs from VMs

If Bastion is your only management path, VMs no longer need public IPs:

```bash
# Disassociate and delete the public IP from a VM NIC
az network nic ip-config update \
  --resource-group rg-prod \
  --nic-name my-vm-nic \
  --name ipconfig1 \
  --public-ip-address null

az network public-ip delete \
  --resource-group rg-prod \
  --name my-vm-pip
```

## NSG Configuration for Target VMs

Allow inbound traffic from the AzureBastionSubnet to your VM subnets:

```bash
az network nsg rule create \
  --resource-group rg-prod \
  --nsg-name vm-nsg \
  --name allow-bastion \
  --priority 100 \
  --direction Inbound \
  --protocol Tcp \
  --source-address-prefixes 10.0.255.0/26 \
  --destination-port-ranges 22 3389 \
  --access Allow
```

## Terraform Configuration

```hcl
resource "azurerm_bastion_host" "main" {
  name                = "prod-bastion"
  location            = azurerm_resource_group.prod.location
  resource_group_name = azurerm_resource_group.prod.name
  sku                 = "Standard"
  tunneling_enabled   = true

  ip_configuration {
    name                 = "configuration"
    subnet_id            = azurerm_subnet.bastion.id
    public_ip_address_id = azurerm_public_ip.bastion.id
  }
}
```

## Conclusion

Azure Bastion eliminates the need for public IPs and open management ports on VMs. It is the recommended access method for all Azure VMs in production environments, drastically reducing the attack surface while maintaining convenient access through the Azure portal.
