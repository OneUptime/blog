# Validation Summary: Configure GPU-Enabled Session Hosts for Azure Virtual Desktop Graphics Workloads

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Azure Virtual Desktop
- Azure GPU-optimized virtual machines
- Azure CLI
- NVIDIA GPU Driver Extension for Azure Windows VMs
- Remote Desktop Protocol settings
- Windows registry / PowerShell
- Azure Monitor Agent
- Chocolatey

## Sources Consulted
- Microsoft Learn: Enable GPU acceleration for Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/graphics-enable-gpu-acceleration
- Microsoft Learn: Supported RDP properties - https://learn.microsoft.com/en-us/azure/virtual-desktop/rdp-properties
- Microsoft Learn: Set custom RDP properties on a host pool in Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/customize-rdp-properties
- Microsoft Learn: Add session hosts to a host pool - https://learn.microsoft.com/en-us/azure/virtual-desktop/add-session-hosts-host-pool
- Microsoft Learn: NVIDIA GPU Driver Extension for Azure Windows VMs - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/hpccompute-gpu-windows
- Microsoft Learn: NVadsA10_v5 sizes series - https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nvadsa10v5-series
- Microsoft Learn: NVv3 sizes series - https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nvv3-series
- Microsoft Learn: NCasT4_v3 sizes series - https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/ncast4v3-series
- Microsoft Learn: NVv4 sizes series - https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nvv4-series
- Microsoft Learn: Azure CLI az vm documentation - https://learn.microsoft.com/en-us/cli/azure/vm
- Microsoft Learn: Azure CLI az vm extension documentation - https://learn.microsoft.com/en-us/cli/azure/vm/extension
- Microsoft Learn: Azure Monitor Agent overview - https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-overview
- Microsoft Learn: Collect performance counters with Azure Monitor Agent - https://learn.microsoft.com/en-us/azure/azure-monitor/agents/data-collection-performance
- Microsoft Learn: Set-ItemProperty - https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-itemproperty

## Issues Found
- The opening list included the older "NV" series as an AVD GPU acceleration option. Updated the wording to the GPU-optimized VM families currently listed by Microsoft for Azure Virtual Desktop GPU acceleration.
- The VM table had incorrect or incomplete VRAM ranges. Updated NVv3, NVadsA10 v5, NCasT4_v3, and NVv4 values to match current Azure VM size documentation.
- NVv3 and NVv4 retirement was not mentioned. Added a short note that both are scheduled for retirement on September 30, 2026.
- Step 2 created a VM but did not explain that an Azure VM is not an AVD session host until it is joined to Microsoft Entra ID or Active Directory and registered with the host pool. Added registration-token commands and a note about installing the AVD Agent and Agent Boot Loader.
- The NVIDIA GPU Driver Extension example used type handler version 1.9. Updated it to 1.10, which is the current Microsoft Learn example.
- The driver section implied the NVIDIA extension handles all NVIDIA visualization series the same way. Added a caveat that NCasT4_v3 needs manually installed Azure-supported GRID drivers for graphics workloads because the extension installs CUDA drivers on that series.
- The GPU/RDP section referred to RemoteFX vGPU, which is not the current AVD configuration model. Updated the heading and comments to refer to remote display GPU acceleration instead.
- The registry policy key could be missing before `Set-ItemProperty` runs. Added a `Test-Path` / `New-Item` guard.
- The automated registry example was described as a Custom Script Extension but used Azure VM Run Command. Corrected the wording.
- The host pool RDP sample included `gfxrenderingmode`, which is not listed in the current supported AVD RDP properties. Removed it and updated the related bullet.
- The Azure Monitor Agent line implied that installing AMA alone collects GPU metrics. Clarified that AMA is for VM monitoring/log ingestion and that GPU log ingestion requires a data collection rule.
- The GPU metrics script appended to `C:\Logs\gpu-metrics.csv` without ensuring the directory existed. Added directory creation before writing the log.

## Review Notes
Azure CLI was not installed in the local environment, so CLI syntax was verified against Microsoft Learn rather than local `az --help` output. The article still intentionally leaves environment-specific steps such as domain join, agent installation method, and Log Analytics data collection rule details at a high level.
