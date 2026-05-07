# How to Configure Azure VM Extensions with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, VM Extension, Custom Scripts, Diagnostic, Monitoring, Infrastructure as Code

Description: Learn how to configure Azure VM extensions with OpenTofu to automate post-deployment configuration, monitoring, and management tasks on Linux and Windows VMs.

## Introduction

Azure VM extensions are small applications that run on VMs to provide post-deployment configuration, automation, and management. Common extensions include Custom Script Extension (run scripts), Azure Monitor Agent (collect metrics and logs), Microsoft Antimalware, Microsoft Entra login (use Microsoft Entra credentials), and Disk Encryption. Extensions run as privileged processes and are managed by the guest agent on the VM; Azure Marketplace images include this agent by default.

## Prerequisites

- OpenTofu v1.6+
- An existing Azure Linux or Windows VM
- Azure credentials with Virtual Machine Contributor permissions; the role assignment example also requires permission to create Azure RBAC role assignments (`Microsoft.Authorization/roleAssignments/write`)
- If you're using Azure Monitor Agent or Microsoft Entra SSH login, enable a system-assigned managed identity on the VM
- If you're using Azure Monitor Agent, have a Data Collection Rule available to associate with the VM

## Step 1: Custom Script Extension (Linux)

```hcl
resource "azurerm_virtual_machine_extension" "setup_script" {
  name                 = "setup-script"
  virtual_machine_id   = azurerm_linux_virtual_machine.main.id
  publisher            = "Microsoft.Azure.Extensions"
  type                 = "CustomScript"
  type_handler_version = "2.1"

  settings = jsonencode({
    script = base64encode(<<-EOT
      #!/bin/bash
      apt-get update -y
      apt-get install -y nginx
      systemctl enable nginx
      systemctl start nginx
      echo "Configured by VM Extension" > /var/www/html/index.html
    EOT
    )
  })

  tags = {
    Name = "${var.project_name}-setup"
  }
}
```

## Step 2: Azure Monitor Agent

```hcl
resource "azurerm_virtual_machine_extension" "ama" {
  name                       = "AzureMonitorLinuxAgent"
  virtual_machine_id         = azurerm_linux_virtual_machine.main.id
  publisher                  = "Microsoft.Azure.Monitor"
  type                       = "AzureMonitorLinuxAgent"
  type_handler_version       = "1.0"
  automatic_upgrade_enabled  = true
  auto_upgrade_minor_version = true
}

resource "azurerm_monitor_data_collection_rule_association" "ama_dcr" {
  name                    = "ama-dcr-association"
  target_resource_id      = azurerm_linux_virtual_machine.main.id
  data_collection_rule_id = var.data_collection_rule_id
}
```

## Step 3: Microsoft Entra SSH Login Extension

```hcl
# Allow Microsoft Entra users to SSH into Linux VMs

resource "azurerm_virtual_machine_extension" "aad_login" {
  name                 = "AADSSHLoginForLinux"
  virtual_machine_id   = azurerm_linux_virtual_machine.main.id
  publisher            = "Microsoft.Azure.ActiveDirectory"
  type                 = "AADSSHLoginForLinux"
  type_handler_version = "1.0"

  depends_on = [azurerm_linux_virtual_machine.main]
}

# Grant VM Login role to a user
resource "azurerm_role_assignment" "vm_login" {
  scope                = azurerm_linux_virtual_machine.main.id
  role_definition_name = "Virtual Machine User Login"
  principal_id         = var.user_principal_id
}
```

## Step 4: Disk Encryption Extension

```hcl
resource "azurerm_virtual_machine_extension" "disk_encryption" {
  name                 = "AzureDiskEncryptionForLinux"
  virtual_machine_id   = azurerm_linux_virtual_machine.main.id
  publisher            = "Microsoft.Azure.Security"
  type                 = "AzureDiskEncryptionForLinux"
  type_handler_version = "1.1"

  settings = jsonencode({
    EncryptionOperation = "EnableEncryption"
    KeyVaultURL         = var.key_vault_uri
    KeyVaultResourceId  = var.key_vault_id
    VolumeType          = "All"  # OS, Data, or All
  })
}
```

## Step 5: Windows Antimalware Extension

```hcl
resource "azurerm_virtual_machine_extension" "antimalware" {
  name                 = "IaaSAntimalware"
  virtual_machine_id   = azurerm_windows_virtual_machine.main.id
  publisher            = "Microsoft.Azure.Security"
  type                 = "IaaSAntimalware"
  type_handler_version = "1.3"

  settings = jsonencode({
    AntimalwareEnabled = true
    RealtimeProtectionEnabled = true
    ScheduledScanSettings = {
      isEnabled = true
      day       = 1       # Sunday
      time      = 120     # Minutes from midnight
      scanType  = "Quick"
    }
    Exclusions = {
      Extensions = ".log;.bak"
      Paths      = "D:\\Data"
      Processes  = "application.exe"
    }
  })
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check extension status
az vm extension show \
  --resource-group <rg> \
  --vm-name <vm-name> \
  --name setup-script

# View extension logs (Linux)
# /var/log/azure/custom-script/handler.log
```

## Conclusion

Order extension deployment carefully using `depends_on` when extensions have dependencies. Both Azure Monitor Agent and `AADSSHLoginForLinux` require a managed identity on the VM (`identity { type = "SystemAssigned" }`), and Azure Monitor Agent also needs a Data Collection Rule association before it starts collecting guest metrics and logs. Azure Disk Encryption is scheduled for retirement on September 15, 2028, so use Encryption at host for new VMs and reserve ADE for existing workloads that still require it. Use `automatic_upgrade_enabled = true` on monitoring extensions to stay current with agent updates. For Custom Script Extension, prefer referencing scripts from Azure Blob Storage over base64-encoded inline scripts to keep configurations readable and maintainable.
