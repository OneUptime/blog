# Validation Summary: Configure Multi-Session Windows 11 Images for Azure Virtual Desktop Host Pools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Desktop
- Windows 11 Enterprise multi-session
- Azure Compute Gallery
- Azure CLI
- PowerShell
- Microsoft 365 Apps deployment configuration
- Virtual Desktop Optimization Tool
- Azure Monitor Agent

## Sources Consulted
- Microsoft Learn: Prerequisites for Azure Virtual Desktop, https://learn.microsoft.com/en-us/azure/virtual-desktop/prerequisites
- Microsoft Learn: Custom image templates in Azure Virtual Desktop, https://learn.microsoft.com/en-us/azure/virtual-desktop/custom-image-templates
- Microsoft Learn: Prepare and customize a VHD image of Azure Virtual Desktop, https://learn.microsoft.com/en-us/azure/virtual-desktop/set-up-customize-master-image
- Microsoft Learn: Add session hosts to a host pool, https://learn.microsoft.com/en-us/azure/virtual-desktop/add-session-hosts-host-pool
- Microsoft Learn: Azure CLI `az vm`, https://learn.microsoft.com/en-us/cli/azure/vm
- Microsoft Learn: Azure CLI `az sig image-version`, https://learn.microsoft.com/en-us/cli/azure/sig/image-version
- Microsoft Learn: Create an image definition and image version, https://learn.microsoft.com/en-us/azure/virtual-machines/image-version
- Microsoft Learn: Overview of shared computer activation for Microsoft 365 Apps, https://learn.microsoft.com/en-us/deployoffice/overview-shared-computer-activation
- Microsoft Learn: Install Office on a custom VHD image, https://learn.microsoft.com/en-us/azure/virtual-desktop/install-office-on-wvd-master-image
- Microsoft Learn: Install and manage the Azure Monitor Agent, https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-manage
- Microsoft Learn: Customize the Windows 11 Start layout, https://learn.microsoft.com/en-us/windows-hardware/customize/desktop/customize-the-windows-11-start-menu
- GitHub: Virtual Desktop Optimization Tool, https://github.com/The-Virtual-Desktop-Team/Virtual-Desktop-Optimization-Tool
- Microsoft Learn: Update-AzWvdSessionHost, https://learn.microsoft.com/en-us/powershell/module/az.desktopvirtualization/update-azwvdsessionhost

## Issues Found
- The application installation snippet downloaded installers into `C:\Temp` without ensuring that the directory existed. Added creation of `C:\Temp` before the downloads.
- The Virtual Desktop Optimization Tool instructions expanded a downloaded ZIP without unblocking it and omitted the documented `-Verbose` usage. Added `Unblock-File` and `-Verbose`.
- The Windows 11 Start menu layout example used a registry path under CloudStore that is not the supported customization method for Windows 11 images. Replaced it with copying a `LayoutModification.json` file into the default profile shell folder.
- The transparency setting was applied only to the current user with `HKCU`, which would not affect new AVD user profiles. Added the setting to the loaded default user hive.
- The Azure Monitor Agent example installed the `Az.ConnectedMachine` PowerShell module, which does not install Azure Monitor Agent on Azure VMs. Replaced it with guidance to deploy Azure Monitor Agent as a VM extension after session host deployment.
- The Azure Compute Gallery image version command used `--managed-image` with a VM resource ID. Updated it to use `--virtual-machine`, matching Azure CLI examples for creating an image version directly from a VM.
- The multi-session-host deployment command combined `az vm create --count` with `--vnet-name` and `--subnet`, which Azure CLI disallows when `--count` is specified. Replaced it with a simple loop that creates three VMs individually.
- The session host registration note did not mention that VMs must first be joined to a supported identity provider. Added that prerequisite before Azure Virtual Desktop Agent registration.

## Review Notes
- The example application versions for 7-Zip and Notepad++ are older, but they are illustrative install examples rather than required platform versions. In a production image pipeline, pin to internally approved current installers or package sources.
- The sample VM commands still use placeholder passwords for readability. Production deployments should use Key Vault, SSH/RDP access controls, and organization-approved credential handling.
