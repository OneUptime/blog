# How to Assign Static IPv4 Addresses to Azure VMs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Static IP, IPv4, Virtual Machine, NIC, Networking

Description: Assign static private and public IPv4 addresses to Azure virtual machines using the Azure CLI by configuring the VM's network interface IP configuration.

## Introduction

By default, Azure assigns dynamic private IP addresses to VM NICs. In Azure Resource Manager, the private IP remains assigned unless the NIC is deleted, moved to a different subnet, or the allocation method is changed. Static private IP addresses let you choose a specific address and are commonly used for DNS servers, domain controllers, firewalls, and other infrastructure VMs.

## Assigning a Static Private IPv4 Address

### Method 1: At VM Creation Time

```bash
RESOURCE_GROUP="my-network-rg"

# Create a NIC with a static private IP

az network nic create \
  --resource-group $RESOURCE_GROUP \
  --name vm-nic \
  --vnet-name prod-vnet \
  --subnet app-subnet \
  --private-ip-address 10.100.2.10

# Create the VM using this NIC
az vm create \
  --resource-group $RESOURCE_GROUP \
  --name app-vm-01 \
  --nics vm-nic \
  --image Ubuntu2204 \
  --admin-username azureuser \
  --generate-ssh-keys
```

### Method 2: Change Existing NIC from Dynamic to Static

```bash
# Find the current IP configuration of a NIC
az network nic ip-config show \
  --resource-group $RESOURCE_GROUP \
  --nic-name vm-nic \
  --name ipconfig1 \
  --query '{ipAddress:privateIPAddress, allocation:privateIPAllocationMethod}'

# Update to static
az network nic ip-config update \
  --resource-group $RESOURCE_GROUP \
  --nic-name vm-nic \
  --name ipconfig1 \
  --private-ip-address 10.100.2.10
```

The CLI automatically changes the allocation method to Static when you specify an address.

## Assigning a Static Public IPv4 Address

```bash
# Create a Standard SKU static public IP
az network public-ip create \
  --resource-group $RESOURCE_GROUP \
  --name app-vm-pip \
  --sku Standard \
  --allocation-method Static

# Associate with the NIC's IP configuration
az network nic ip-config update \
  --resource-group $RESOURCE_GROUP \
  --nic-name vm-nic \
  --name ipconfig1 \
  --public-ip-address app-vm-pip
```

## Adding a Secondary IP Configuration

A NIC can have multiple IP configurations:

```bash
# Add a second private IP to the same NIC
az network nic ip-config create \
  --resource-group $RESOURCE_GROUP \
  --nic-name vm-nic \
  --name ipconfig2 \
  --private-ip-address 10.100.2.11 \
  --subnet app-subnet \
  --vnet-name prod-vnet
```

For a quick test, configure this secondary IP temporarily on the OS:

```bash
# Inside the VM (Ubuntu), add the secondary IP until the next reboot
sudo ip addr add 10.100.2.11/24 dev eth0
```

## Verifying the IP Assignment

```bash
# Show all IP configs for a NIC
az network nic ip-config list \
  --resource-group $RESOURCE_GROUP \
  --nic-name vm-nic \
  --query '[].{Name:name, PrivateIP:privateIPAddress, Method:privateIPAllocationMethod, PublicIP:publicIPAddress.id}' \
  --output table

# Get the public IP address value
az network public-ip show \
  --resource-group $RESOURCE_GROUP \
  --name app-vm-pip \
  --query ipAddress \
  --output tsv
```

## Reverting to Dynamic Assignment

```bash
az network nic ip-config update \
  --resource-group $RESOURCE_GROUP \
  --nic-name vm-nic \
  --name ipconfig1 \
  --private-ip-address ""
```

## Conclusion

Assign static private IPv4 addresses to Azure VMs by creating a NIC with `--private-ip-address` at creation time, or by updating the NIC's IP configuration with `az network nic ip-config update`. For static public IPs, create a Standard SKU public IP with `--allocation-method Static` and attach it to the NIC.
