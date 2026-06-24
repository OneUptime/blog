# How to Create Windows Virtual Machines with OpenTofu on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Window, Virtual Machine, Compute, RDP, Infrastructure as Code

Description: Learn how to create Windows Server virtual machines on Azure with OpenTofu, including WinRM configuration, managed disks, and PowerShell DSC extensions.

## Introduction

Azure Windows Virtual Machines support Windows Server 2019, 2022, and Windows 10/11 for desktop workloads. The `azurerm_windows_virtual_machine` resource manages the full VM lifecycle. Windows VMs typically require remote access via RDP on port 3389 (for interactive sessions) or WinRM (for automation), and support PowerShell scripts through the Custom Script Extension for post-deployment configuration.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials configured
- An Azure Resource Group and Virtual Network with subnet
- Strong admin password meeting Azure complexity requirements

## Step 1: Create the Windows VM

```hcl
resource "azurerm_windows_virtual_machine" "main" {
  name                = "${var.project_name}-win-vm"
  resource_group_name = var.resource_group_name
  location            = var.location
  size                = "Standard_D4s_v3"

  network_interface_ids = [azurerm_network_interface.main.id]

  admin_username = "azureuser"
  admin_password = var.admin_password  # Source from Key Vault or another secret manager; still stored in state

  # OS disk
  os_disk {
    name                 = "${var.project_name}-win-os-disk"
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 128
  }

  source_image_reference {
    publisher = "MicrosoftWindowsServer"
    offer     = "WindowsServer"
    sku       = "2022-datacenter-azure-edition"
    version   = "latest"
  }

  identity {
    type = "SystemAssigned"
  }

  # Enable auto-patching
  patch_mode      = "AutomaticByPlatform"
  hotpatching_enabled = false

  # Timezone
  timezone = "UTC"

  tags = {
    Name        = "${var.project_name}-win-vm"
    Environment = var.environment
  }
}
```

## Step 2: Network Interface and NSG

```hcl
resource "azurerm_network_interface" "main" {
  name                = "${var.project_name}-win-nic"
  location            = var.location
  resource_group_name = var.resource_group_name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = "Dynamic"
  }
}

resource "azurerm_network_security_group" "rdp" {
  name                = "${var.project_name}-win-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name

  security_rule {
    name                       = "allow-rdp"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "3389"
    source_address_prefixes    = var.allowed_rdp_source_cidrs  # Include your VPN/admin CIDR and AzureBastionSubnet CIDR as needed
    destination_address_prefix = "*"
    description                = "Allow RDP from approved private networks only"
  }
}

resource "azurerm_network_interface_security_group_association" "main" {
  network_interface_id      = azurerm_network_interface.main.id
  network_security_group_id = azurerm_network_security_group.rdp.id
}
```

## Step 3: PowerShell Custom Script Extension

```hcl
resource "azurerm_virtual_machine_extension" "custom_script" {
  name                 = "CustomScriptExtension"
  virtual_machine_id   = azurerm_windows_virtual_machine.main.id
  publisher            = "Microsoft.Compute"
  type                 = "CustomScriptExtension"
  type_handler_version = "1.10"

  settings = jsonencode({
    commandToExecute = "powershell -ExecutionPolicy Unrestricted -File setup.ps1"
    fileUris         = ["https://${var.storage_account_name}.blob.core.windows.net/scripts/setup.ps1"]
  })

  protected_settings = jsonencode({
    storageAccountName = var.storage_account_name
    storageAccountKey  = var.storage_account_key
  })
}
```

## Step 4: Data Disk for Application Storage

```hcl
resource "azurerm_managed_disk" "data" {
  name                 = "${var.project_name}-win-data-disk"
  location             = var.location
  resource_group_name  = var.resource_group_name
  storage_account_type = "Premium_LRS"
  create_option        = "Empty"
  disk_size_gb         = 512
}

resource "azurerm_virtual_machine_data_disk_attachment" "data" {
  managed_disk_id    = azurerm_managed_disk.data.id
  virtual_machine_id = azurerm_windows_virtual_machine.main.id
  lun                = 0
  caching            = "ReadWrite"
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Connect via Azure Bastion or private connectivity (avoid public RDP in production)

# Get the VM's IP addresses
az vm list-ip-addresses \
  --resource-group <rg> \
  --name <vm-name> \
  --output table

# Or, from a local Windows machine, use Azure CLI to start a Bastion RDP session
az network bastion rdp \
  --name <bastion-name> \
  --resource-group <rg> \
  --target-resource-id <vm-id>
```

## Conclusion

Never expose RDP (port 3389) directly to the public internet; use Azure Bastion for RDP access to avoid brute-force attacks. Store the `admin_password` in Azure Key Vault or another secret manager and retrieve it with a data source rather than hardcoding it, but secure your OpenTofu state because the password is still stored there. Set `patch_mode = "AutomaticByPlatform"` to enable Azure-managed patching. If you need custom maintenance windows, use Azure Update Manager. For domain-joined VMs, use the `JsonADDomainExtension` to automate joining Windows VMs to Active Directory.
