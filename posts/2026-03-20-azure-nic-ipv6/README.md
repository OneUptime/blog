# How to Configure IPv6 on Azure Network Interface Cards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, IPv6, NIC, Network Interfaces, VM, Dual-Stack

Description: Add IPv6 IP configurations to Azure VM network interfaces, assign private and public IPv6 addresses, and configure VMs for dual-stack network operation.

## Introduction

Azure VMs get IPv6 addresses through their Network Interface Cards (NICs). Azure VMs aren't supported as IPv6-only, so you keep a primary IPv4 configuration and add IPv6 on a secondary IP configuration for dual-stack operation. Each NIC can have at most one private IPv6 address, and you can optionally associate a public IPv6 address with that IPv6 IP configuration.

## Add IPv6 to Existing VM NIC

```bash
RG="rg-ipv6"
VM_NAME="vm-web-01"

# Get the NIC name attached to the VM

NIC_NAME=$(az vm show \
    --resource-group "$RG" \
    --name "$VM_NAME" \
    --query "networkProfile.networkInterfaces[0].id" \
    --output tsv | xargs -I{} az network nic show --ids {} --query name --output tsv)

echo "NIC: $NIC_NAME"

# Add IPv6 IP configuration (private only)
az network nic ip-config create \
    --resource-group "$RG" \
    --nic-name "$NIC_NAME" \
    --name "ipv6-config" \
    --private-ip-address-version IPv6 \
    --subnet subnet-web \
    --vnet-name vnet-dualstack

# Add IPv6 IP configuration with public IPv6
# First create an IPv6 public IP
az network public-ip create \
    --resource-group "$RG" \
    --name "pip-${VM_NAME}-ipv6" \
    --version IPv6 \
    --sku Standard \
    --allocation-method Static

# Add IP config with public IPv6
az network nic ip-config create \
    --resource-group "$RG" \
    --nic-name "$NIC_NAME" \
    --name "ipv6-public-config" \
    --private-ip-address-version IPv6 \
    --subnet subnet-web \
    --vnet-name vnet-dualstack \
    --public-ip-address "pip-${VM_NAME}-ipv6"

# Verify NIC configuration
az network nic show \
    --resource-group "$RG" \
    --name "$NIC_NAME" \
    --query "ipConfigurations[*].{name:name, version:privateIPAddressVersion, privateIP:privateIPAddress, publicIP:publicIPAddress.id}"
```

## Terraform VM NIC with Dual-Stack

```hcl
# vm_nic_ipv6.tf

# IPv6 public IP for VM
resource "azurerm_public_ip" "vm_ipv6" {
  name                = "pip-vm-ipv6"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
  ip_version          = "IPv6"
}

# NIC with dual-stack configuration
resource "azurerm_network_interface" "main" {
  name                = "nic-web-01"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  # Primary IPv4 configuration
  ip_configuration {
    name                          = "ipv4-config"
    subnet_id                     = azurerm_subnet.web.id
    private_ip_address_allocation = "Dynamic"
    private_ip_address_version    = "IPv4"
    primary                       = true
  }

  # Secondary IPv6 configuration
  ip_configuration {
    name                          = "ipv6-config"
    subnet_id                     = azurerm_subnet.web.id
    private_ip_address_allocation = "Dynamic"
    private_ip_address_version    = "IPv6"
    public_ip_address_id          = azurerm_public_ip.vm_ipv6.id
    primary                       = false
  }

  tags = { Name = "web-01-nic" }
}

resource "azurerm_linux_virtual_machine" "web" {
  name                = "vm-web-01"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  size                = "Standard_B2s"

  admin_username = "azureuser"

  # Attach dual-stack NIC
  network_interface_ids = [azurerm_network_interface.main.id]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  admin_ssh_key {
    username   = "azureuser"
    public_key = file(pathexpand("~/.ssh/id_rsa.pub"))
  }
}

output "vm_private_ipv4" {
  value = azurerm_network_interface.main.private_ip_address
}

output "vm_public_ipv6" {
  value = azurerm_public_ip.vm_ipv6.ip_address
}
```

## Configure IPv6 Inside the VM

```bash
# After VM provisioning, guest OS behavior depends on the image.
# Supported Debian images in Azure are preconfigured for DHCPv6.
# Ubuntu images may require enabling DHCPv6.

# Verify inside the VM
ip -6 addr show

# If the IPv6 address is not showing on Ubuntu 17.10+:
sudo grep -qxF 'timeout 10;' /etc/dhcp/dhclient.conf || echo 'timeout 10;' | sudo tee -a /etc/dhcp/dhclient.conf

sudo tee /etc/cloud/cloud.cfg.d/91-azure-network.cfg >/dev/null <<'EOF'
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
      dhcp6: true
      match:
        driver: hv_netvsc
      set-name: eth0
EOF

sudo reboot

# After reconnecting, verify IPv6 again
ip -6 addr show

# Test IPv6 from inside VM
curl -6 https://ipv6.icanhazip.com
```

## Multiple VMs to Load Balancer Backend Pool

```bash
# Add NIC IPv6 config to load balancer backend pool
az network nic ip-config address-pool add \
    --resource-group "$RG" \
    --nic-name "$NIC_NAME" \
    --ip-config-name "ipv6-config" \
    --lb-name lb-dualstack \
    --address-pool backendpool-dualstack
```

## Conclusion

Azure VM IPv6 requires keeping a primary IPv4 configuration and adding a secondary NIC IP configuration with `private_ip_address_version = "IPv6"` on a subnet that has an IPv6 prefix from the VNet's IPv6 address space. Each NIC can have at most one private IPv6 address. Public IPv6 access requires a Standard SKU public IP with `ip_version = "IPv6"`. Guest OS configuration varies by image: supported Debian images in Azure are preconfigured for DHCPv6, while Ubuntu and some other Linux images may require enabling DHCPv6 inside the VM.
