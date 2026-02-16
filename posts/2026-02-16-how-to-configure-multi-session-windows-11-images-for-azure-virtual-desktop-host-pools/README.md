# How to Configure Multi-Session Windows 11 Images for Azure Virtual Desktop Host Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Virtual Desktop, Windows 11, Multi-Session, Image Management, Host Pool, VDI

Description: Learn how to create and configure custom multi-session Windows 11 images for Azure Virtual Desktop host pools with optimized settings and pre-installed applications.

---

Windows 11 Enterprise multi-session is a unique Windows SKU that only exists for Azure Virtual Desktop. Unlike regular Windows 11, it allows multiple users to log in simultaneously to a single VM, just like Windows Server RDS but with the full Windows 11 desktop experience. Building a good base image is critical because every session host in your pool uses it. A well-configured image means faster logins, fewer support tickets, and consistent behavior across all session hosts.

This guide covers creating a custom Windows 11 multi-session image, optimizing it for AVD, and deploying it to your host pool.

## Why Custom Images Matter

The Azure Marketplace includes pre-built Windows 11 multi-session images with and without Microsoft 365 Apps. These work fine for basic deployments, but most organizations need customizations:

- Line-of-business applications pre-installed.
- Corporate branding and default settings.
- Security tools and agents deployed.
- Performance optimizations applied.
- Unnecessary features and apps removed.

Building a custom image once and using it across all session hosts is far more efficient than configuring each VM individually after deployment.

## Prerequisites

- An Azure subscription.
- An Azure Compute Gallery (formerly Shared Image Gallery) for storing and distributing images.
- A virtual network for the image builder VM.
- Azure VM Image Builder permissions (or a manual VM for building the image).

## Step 1: Create a Build VM

Start by deploying a Windows 11 multi-session VM that you will customize and capture as an image.

```bash
# Create a VM from the Windows 11 multi-session marketplace image
az vm create \
  --resource-group myImageRG \
  --name avd-image-builder \
  --image "MicrosoftWindowsDesktop:windows-11:win11-23h2-avd:latest" \
  --size Standard_D4s_v5 \
  --admin-username imagebuilder \
  --admin-password 'YourSecurePassword123!' \
  --vnet-name image-vnet \
  --subnet default \
  --public-ip-sku Standard
```

Connect to the VM via RDP to begin customization.

## Step 2: Install Applications

Install all applications that should be available on every session host.

```powershell
# Example: Silent install of commonly needed applications

# Install Google Chrome (enterprise MSI)
$chromePath = "C:\Temp\GoogleChromeStandaloneEnterprise64.msi"
Invoke-WebRequest -Uri "https://dl.google.com/dl/chrome/install/googlechromestandaloneenterprise64.msi" -OutFile $chromePath
Start-Process msiexec.exe -ArgumentList "/i $chromePath /quiet /norestart" -Wait

# Install 7-Zip
$sevenZipPath = "C:\Temp\7z2301-x64.msi"
Invoke-WebRequest -Uri "https://www.7-zip.org/a/7z2301-x64.msi" -OutFile $sevenZipPath
Start-Process msiexec.exe -ArgumentList "/i $sevenZipPath /quiet /norestart" -Wait

# Install Notepad++ (silent install)
$nppPath = "C:\Temp\npp.8.6.Installer.x64.exe"
Invoke-WebRequest -Uri "https://github.com/notepad-plus-plus/notepad-plus-plus/releases/download/v8.6/npp.8.6.Installer.x64.exe" -OutFile $nppPath
Start-Process $nppPath -ArgumentList "/S" -Wait

# Install Microsoft 365 Apps if not included in the base image
# Use the Office Deployment Tool with a custom configuration XML
```

For Microsoft 365 Apps, use the Office Deployment Tool with a configuration file optimized for shared environments.

```xml
<!-- office-config.xml -->
<!-- Configuration for Microsoft 365 Apps on multi-session hosts -->
<Configuration>
  <Add OfficeClientEdition="64" Channel="MonthlyEnterprise">
    <Product ID="O365ProPlusRetail">
      <Language ID="en-us" />
      <ExcludeApp ID="Groove" />
      <ExcludeApp ID="Lync" />
    </Product>
  </Add>
  <Property Name="SharedComputerLicensing" Value="1" />
  <Property Name="FORCEAPPSHUTDOWN" Value="TRUE" />
  <Updates Enabled="FALSE" />
  <Display Level="None" AcceptEULA="TRUE" />
</Configuration>
```

The `SharedComputerLicensing` setting is essential for multi-session environments. Without it, Microsoft 365 activation fails when multiple users try to use the same installation.

## Step 3: Apply Windows Optimizations

The Virtual Desktop Optimization Tool from Microsoft applies settings that improve performance in multi-session scenarios.

```powershell
# Download the Virtual Desktop Optimization Tool
$vdotPath = "C:\Temp\VDOT"
New-Item -Path $vdotPath -ItemType Directory -Force

# Clone the optimization tool repository
Invoke-WebRequest -Uri "https://github.com/The-Virtual-Desktop-Team/Virtual-Desktop-Optimization-Tool/archive/refs/heads/main.zip" -OutFile "$vdotPath\vdot.zip"
Expand-Archive -Path "$vdotPath\vdot.zip" -DestinationPath $vdotPath

# Run the optimization tool
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
& "$vdotPath\Virtual-Desktop-Optimization-Tool-main\Windows_VDOT.ps1" -Optimizations All -AcceptEULA
```

The tool applies optimizations including:

- Disabling unnecessary scheduled tasks.
- Removing built-in apps (Candy Crush, Xbox, etc.).
- Configuring Windows Update for WSUS/WUfB compatibility.
- Optimizing visual effects and animations.
- Disabling services not needed in VDI environments.

You can also apply specific optimizations manually for more control.

```powershell
# Disable unnecessary Windows features for VDI
Disable-WindowsOptionalFeature -Online -FeatureName "WindowsMediaPlayer" -NoRestart
Disable-WindowsOptionalFeature -Online -FeatureName "Printing-XPSServices-Features" -NoRestart

# Remove built-in Store apps that users do not need
$appsToRemove = @(
    "Microsoft.BingWeather",
    "Microsoft.GetHelp",
    "Microsoft.Getstarted",
    "Microsoft.MicrosoftSolitaireCollection",
    "Microsoft.WindowsFeedbackHub",
    "Microsoft.Xbox.TCUI",
    "Microsoft.XboxGameOverlay",
    "Microsoft.XboxGamingOverlay",
    "Microsoft.ZuneMusic",
    "Microsoft.ZuneVideo"
)

foreach ($app in $appsToRemove) {
    # Remove for all users and prevent reinstallation
    Get-AppxPackage -AllUsers -Name $app | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue
    Get-AppxProvisionedPackage -Online | Where-Object DisplayName -eq $app | Remove-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue
}

# Configure visual effects for best performance in multi-session
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" -Name "VisualFXSetting" -Value 2

# Disable transparency effects
Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name "EnableTransparency" -Value 0
```

## Step 4: Configure Default User Profile

Settings applied to the default user profile affect all new users who log in.

```powershell
# Load the default user registry hive
reg load "HKU\DefaultUser" "C:\Users\Default\NTUSER.DAT"

# Set default desktop wallpaper
reg add "HKU\DefaultUser\Control Panel\Desktop" /v Wallpaper /t REG_SZ /d "C:\Windows\Web\Wallpaper\Corporate\company-wallpaper.jpg" /f

# Set default Start menu layout (if using a custom layout)
reg add "HKU\DefaultUser\SOFTWARE\Microsoft\Windows\CurrentVersion\CloudStore\Store\DefaultAccount" /v "LockedStartLayout" /t REG_DWORD /d 1 /f

# Disable first-run experience
reg add "HKU\DefaultUser\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" /v "SubscribedContent-338389Enabled" /t REG_DWORD /d 0 /f

# Unload the hive
[gc]::Collect()
reg unload "HKU\DefaultUser"
```

## Step 5: Install Security and Management Agents

Install any agents required by your organization.

```powershell
# Install the Azure Monitor Agent for monitoring
Install-PackageProvider -Name NuGet -Force
Install-Module -Name Az.ConnectedMachine -Force

# Install Microsoft Defender for Endpoint (if not included)
# Download from your Microsoft 365 security portal

# Install your EDR solution
# Example: CrowdStrike Falcon sensor
# Start-Process "C:\Temp\WindowsSensor.exe" -ArgumentList "/install /quiet /noreboot CID=your-customer-id" -Wait
```

## Step 6: Generalize and Capture the Image

After all customizations are complete, generalize the VM with Sysprep and capture it as an image.

```powershell
# Run Sysprep to generalize the image
# This removes machine-specific information so the image can be used on multiple VMs
& "C:\Windows\System32\Sysprep\sysprep.exe" /generalize /oobe /shutdown /mode:vm
```

Wait for the VM to shut down. Then capture it in Azure.

```bash
# Deallocate the VM
az vm deallocate --resource-group myImageRG --name avd-image-builder

# Generalize the VM in Azure
az vm generalize --resource-group myImageRG --name avd-image-builder

# Create an Azure Compute Gallery if you do not have one
az sig create \
  --resource-group myImageRG \
  --gallery-name avdImageGallery

# Create an image definition
az sig image-definition create \
  --resource-group myImageRG \
  --gallery-name avdImageGallery \
  --gallery-image-definition win11-avd-custom \
  --publisher MyCompany \
  --offer Windows11AVD \
  --sku win11-23h2-avd-custom \
  --os-type Windows \
  --os-state Generalized \
  --hyper-v-generation V2

# Create an image version from the VM
az sig image-version create \
  --resource-group myImageRG \
  --gallery-name avdImageGallery \
  --gallery-image-definition win11-avd-custom \
  --gallery-image-version 1.0.0 \
  --target-regions "eastus=1" \
  --managed-image "/subscriptions/<sub-id>/resourceGroups/myImageRG/providers/Microsoft.Compute/virtualMachines/avd-image-builder"
```

## Step 7: Deploy Session Hosts from the Custom Image

Use the custom image when creating new session hosts for your host pool.

```bash
# Create session hosts using the custom image from the gallery
az vm create \
  --resource-group myResourceGroup \
  --name avd-host \
  --count 3 \
  --image "/subscriptions/<sub-id>/resourceGroups/myImageRG/providers/Microsoft.Compute/galleries/avdImageGallery/images/win11-avd-custom/versions/1.0.0" \
  --size Standard_D4s_v5 \
  --vnet-name avd-vnet \
  --subnet session-hosts \
  --admin-username avdadmin \
  --admin-password 'YourSecurePassword123!'
```

After deploying, register the VMs with the host pool using the AVD agent and registration token, as described in the host pool setup process.

## Image Update Strategy

Plan how you will update the image over time. A common approach:

1. **Monthly**: Create a new image version with Windows updates and application patches.
2. **As needed**: Create a new version when applications need to be added or upgraded.
3. **Deploy**: Replace session hosts by draining users from old hosts and deploying new ones from the updated image.

```bash
# Drain a session host before replacing it
az desktopvirtualization sessionhost update \
  --resource-group myResourceGroup \
  --host-pool-name avd-pooled-hp \
  --name "avd-host-0.corp.example.com" \
  --allow-new-session false
```

Wait for active sessions to end, then delete the old VM and deploy a new one from the updated image.

## Summary

Building a custom Windows 11 multi-session image for Azure Virtual Desktop involves starting from the marketplace image, installing applications, applying performance optimizations, configuring the default user profile, and capturing the result in an Azure Compute Gallery. The key decisions are which applications to bake into the image versus delivering through MSIX app attach, and how frequently to update the image. A well-built image reduces login times, eliminates per-VM configuration drift, and gives users a consistent experience regardless of which session host they connect to.
