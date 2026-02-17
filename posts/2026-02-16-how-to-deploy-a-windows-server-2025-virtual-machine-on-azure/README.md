# How to Deploy a Windows Server 2025 Virtual Machine on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Windows Server 2025, Virtual Machine, Azure CLI, Deployment, IaaS, Cloud Computing

Description: A step-by-step guide to deploying a Windows Server 2025 virtual machine on Azure, including configuration, security, and post-deployment setup.

---

Windows Server 2025 is the latest long-term servicing channel (LTSC) release from Microsoft, bringing improvements in security, hybrid cloud integration, and container support. If you are running Windows workloads on Azure - whether it is Active Directory, SQL Server, IIS, or .NET applications - deploying a Windows Server 2025 VM is the way forward.

In this guide, I will walk through deploying a Windows Server 2025 VM on Azure, covering image selection, sizing, security configuration, and post-deployment setup.

## Choosing the Right Image

Azure marketplace offers several editions of Windows Server 2025:

- **Windows Server 2025 Datacenter**: Full desktop experience with all features. Best for general-purpose servers with GUI management.
- **Windows Server 2025 Datacenter - Server Core**: Minimal installation without a desktop UI. Smaller footprint, fewer patches, better security posture. Best for headless servers managed remotely.
- **Windows Server 2025 Datacenter: Azure Edition**: Includes Azure-specific features like hotpatching (applying updates without reboots) and SMB over QUIC.

For Azure deployments, the Azure Edition is usually the best choice because of hotpatching support, which significantly reduces reboot-related downtime.

List available Windows Server 2025 images:

```bash
# Search for Windows Server 2025 images in the marketplace
az vm image list \
  --publisher MicrosoftWindowsServer \
  --offer WindowsServer \
  --sku 2025 \
  --all \
  --output table
```

This returns images with different SKU names. Look for:
- `2025-datacenter-g2` - Datacenter with desktop experience, Gen2
- `2025-datacenter-core-g2` - Server Core, Gen2
- `2025-datacenter-azure-edition` - Azure Edition with hotpatching

## Choosing the VM Size

Windows Server workloads generally need more resources than Linux due to the OS overhead. Here are some common sizing recommendations:

- **General purpose (web/app server)**: Standard_D4s_v5 (4 vCPUs, 16 GB RAM) or Standard_D8s_v5 (8 vCPUs, 32 GB RAM)
- **SQL Server**: Standard_E8s_v5 (8 vCPUs, 64 GB RAM) or larger from the memory-optimized E-series
- **Active Directory DC**: Standard_D2s_v5 (2 vCPUs, 8 GB RAM) is usually sufficient for small to medium environments
- **File server**: Standard_L8s_v3 (storage optimized) for heavy I/O

Check available sizes and pricing:

```bash
# List VM sizes available in your region
az vm list-sizes --location eastus --output table
```

## Deploying the VM

Here is the full deployment command:

```bash
# Deploy a Windows Server 2025 Datacenter Azure Edition VM
az vm create \
  --resource-group myResourceGroup \
  --name winServer2025 \
  --image MicrosoftWindowsServer:WindowsServer:2025-datacenter-azure-edition:latest \
  --size Standard_D4s_v5 \
  --admin-username azureadmin \
  --admin-password 'YourSecurePassword123!@#' \
  --location eastus \
  --public-ip-sku Standard \
  --nsg-rule RDP \
  --os-disk-size-gb 128 \
  --boot-diagnostics-storage ""
```

Breaking down the parameters:
- `--image`: The fully qualified image URN for Windows Server 2025 Azure Edition.
- `--admin-username`: The local administrator account name. Cannot be "administrator" or "admin."
- `--admin-password`: Must meet complexity requirements (12+ characters, mixed case, numbers, special characters).
- `--nsg-rule RDP`: Creates an NSG rule allowing RDP from the internet. You should restrict this later.
- `--os-disk-size-gb 128`: Override the default OS disk size. Windows Server images default to 127 GB.
- `--boot-diagnostics-storage ""`: Enable boot diagnostics with managed storage.

## Connecting via RDP

After deployment, get the public IP and connect:

```bash
# Get the public IP address of the VM
az vm show \
  --resource-group myResourceGroup \
  --name winServer2025 \
  --show-details \
  --query publicIps \
  --output tsv
```

Open your RDP client (Remote Desktop Connection on Windows, Microsoft Remote Desktop on macOS) and connect to the IP address with the credentials you specified during creation.

For a more secure connection, use Azure Bastion instead of a public IP:

```bash
# Connect via Bastion (if deployed)
az network bastion rdp \
  --resource-group myResourceGroup \
  --name myBastion \
  --target-resource-id "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Compute/virtualMachines/winServer2025"
```

## Post-Deployment Configuration

After connecting to the VM, there are several things to configure:

### Windows Update

Run Windows Update immediately to get the latest security patches:

```powershell
# Check for and install available updates
Install-Module -Name PSWindowsUpdate -Force
Get-WindowsUpdate -Install -AcceptAll -AutoReboot
```

### Enable Hotpatching (Azure Edition)

If you deployed the Azure Edition, hotpatching should be enabled by default. Verify:

```powershell
# Check hotpatching status
Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 10
```

Hotpatching applies certain security updates without requiring a reboot, which is a significant benefit for production servers.

### Configure Windows Firewall

The Windows Firewall is enabled by default. Add rules for your application:

```powershell
# Allow HTTP and HTTPS through the firewall
New-NetFirewallRule -DisplayName "Allow HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "Allow HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# Allow a custom application port
New-NetFirewallRule -DisplayName "Allow MyApp" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
```

### Install IIS (Web Server)

If you are deploying a web server:

```powershell
# Install IIS with management tools
Install-WindowsFeature -Name Web-Server -IncludeManagementTools

# Install ASP.NET Core hosting bundle for .NET applications
# Download and install from Microsoft's website or use winget
winget install Microsoft.DotNet.HostingBundle.8
```

### Join Active Directory Domain

If your environment uses Active Directory:

```powershell
# Join the VM to an Active Directory domain
Add-Computer -DomainName "corp.example.com" -Credential (Get-Credential) -Restart
```

Make sure the VM can reach the domain controller. If the DC is also in Azure, ensure the VMs are in the same virtual network or have network peering configured.

## Securing the VM

### Restrict RDP Access

The default NSG rule allows RDP from anywhere. Restrict it immediately:

```bash
# Update the RDP NSG rule to only allow your IP
az network nsg rule update \
  --resource-group myResourceGroup \
  --nsg-name winServer2025NSG \
  --name rdp \
  --source-address-prefixes '203.0.113.50/32'
```

Better yet, remove the public IP and use Azure Bastion:

```bash
# Remove the public IP from the VM
NIC_NAME=$(az vm show --resource-group myResourceGroup --name winServer2025 \
  --query networkProfile.networkInterfaces[0].id --output tsv | xargs basename)

az network nic ip-config update \
  --resource-group myResourceGroup \
  --nic-name $NIC_NAME \
  --name ipconfig1 \
  --remove publicIpAddress
```

### Enable Azure Disk Encryption

Encrypt the OS and data disks:

```bash
# Create a Key Vault for encryption keys
az keyvault create \
  --resource-group myResourceGroup \
  --name myEncryptionKV \
  --location eastus \
  --enabled-for-disk-encryption

# Enable disk encryption on the VM
az vm encryption enable \
  --resource-group myResourceGroup \
  --name winServer2025 \
  --disk-encryption-keyvault myEncryptionKV \
  --volume-type All
```

### Enable Microsoft Defender for Endpoint

Windows Server 2025 can onboard to Microsoft Defender for Endpoint for advanced threat protection:

```powershell
# Check if Defender is running
Get-Service -Name WinDefend

# Run a quick scan
Start-MpScan -ScanType QuickScan
```

## Azure Hybrid Benefit

If you have Windows Server licenses with Software Assurance, you can use Azure Hybrid Benefit to save on the Windows licensing cost:

```bash
# Apply Azure Hybrid Benefit to an existing VM
az vm update \
  --resource-group myResourceGroup \
  --name winServer2025 \
  --license-type Windows_Server
```

This can save up to 40% on the VM cost by eliminating the Windows Server license charge.

For new deployments, add the flag during creation:

```bash
# Create a VM with Azure Hybrid Benefit
az vm create \
  --resource-group myResourceGroup \
  --name winServer2025 \
  --image MicrosoftWindowsServer:WindowsServer:2025-datacenter-azure-edition:latest \
  --size Standard_D4s_v5 \
  --admin-username azureadmin \
  --admin-password 'YourSecurePassword123!@#' \
  --license-type Windows_Server
```

## Monitoring and Management

### Enable Azure Monitor Agent

```bash
# Install the Azure Monitor Agent extension
az vm extension set \
  --resource-group myResourceGroup \
  --vm-name winServer2025 \
  --name AzureMonitorWindowsAgent \
  --publisher Microsoft.Azure.Monitor \
  --version 1.0
```

### Configure Antimalware

```bash
# Install the Microsoft Antimalware extension
az vm extension set \
  --resource-group myResourceGroup \
  --vm-name winServer2025 \
  --name IaaSAntimalware \
  --publisher Microsoft.Azure.Security \
  --version 1.5 \
  --settings '{"AntimalwareEnabled": true, "RealtimeProtectionEnabled": true, "ScheduledScanSettings": {"isEnabled": true, "day": "7", "time": "120", "scanType": "Quick"}}'
```

## Wrapping Up

Deploying Windows Server 2025 on Azure is straightforward with the Azure CLI. The key decisions are choosing the right edition (Azure Edition for hotpatching), sizing the VM appropriately for your workload, and securing the deployment from day one. Remove public IPs, use Bastion for management access, enable disk encryption, and keep the system updated. With these practices in place, your Windows Server 2025 VM will be production-ready and secure.
