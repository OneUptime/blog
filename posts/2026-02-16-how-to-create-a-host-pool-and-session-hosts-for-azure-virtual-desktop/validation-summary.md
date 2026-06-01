# Validation Summary: How to Create a Host Pool and Session Hosts for Azure Virtual Desktop

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Desktop
- Azure Desktop Virtualization Azure CLI extension
- Azure Resource Manager templates
- Azure Virtual Machines and network interfaces
- Microsoft Entra ID and Microsoft Entra Domain Services
- Azure RBAC role assignments
- PowerShell and msiexec

## Sources Consulted
- Microsoft Learn: az desktopvirtualization hostpool CLI reference - https://learn.microsoft.com/en-us/cli/azure/desktopvirtualization/hostpool
- Microsoft Learn: az desktopvirtualization applicationgroup CLI reference - https://learn.microsoft.com/en-us/cli/azure/desktopvirtualization/applicationgroup
- Microsoft Learn: az desktopvirtualization workspace CLI reference - https://learn.microsoft.com/en-us/cli/azure/desktopvirtualization/workspace
- Microsoft Learn: Deploy Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/deploy-azure-virtual-desktop
- Microsoft Learn: Add session hosts to a host pool - https://learn.microsoft.com/en-us/azure/virtual-desktop/add-session-hosts-host-pool
- Microsoft Learn: Configure host pool load balancing - https://learn.microsoft.com/en-us/azure/virtual-desktop/configure-host-pool-load-balancing
- Microsoft Learn: Virtual machines in an Azure Resource Manager template - https://learn.microsoft.com/en-us/azure/virtual-machines/windows/template-description
- Microsoft Learn: Troubleshoot Azure Virtual Desktop Agent issues - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-desktop/troubleshoot-agent
- Microsoft Learn: Connect to Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/connect-azure-virtual-desktop
- Microsoft Learn: Use the Remote Desktop client to connect to Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/users/connect-remote-desktop-client
- Microsoft Learn: az role assignment CLI reference - https://learn.microsoft.com/en-us/cli/azure/role/assignment

## Issues Found
- The post used the outdated Azure AD and Azure AD DS names in prerequisites and portal steps. Updated these to Microsoft Entra ID and Microsoft Entra Domain Services.
- The preferred app group type text said "RemoteApp", but the host pool preferred app group type value is Desktop, RailApplications, or None. Updated the text to "RailApplications for published RemoteApps."
- The host pool registration examples used a hard-coded expiration date of 2026-02-17, which is expired as of this review date. Replaced it with a dynamic 24-hour UTC expiration and noted the 27-day maximum.
- The ARM template referenced an undefined adminPassword parameter, an undefined NIC resource, and an unused hostPoolToken parameter. Added admin credentials, VNet/subnet parameters, NIC resources, and VM dependencies, and clarified that VM join and AVD registration still happen in the next section when deploying outside the portal workflow.
- The AVD agent and bootloader download URLs used older direct CMS binary links. Updated them to the current Microsoft fwlink URLs documented for the AVD Agent and Agent Boot Loader.
- The group assignment wording used Azure AD terminology. Updated it to Microsoft Entra group.
- The client list referred only to the Windows Desktop client. Updated it to Windows App or Remote Desktop client to match current Microsoft client guidance.
- The verification command comment said hostpool show lists session hosts and status. Corrected the comment because sessionhost list is the command that lists session hosts.
- The tag list used "Window" instead of "Windows." Corrected the tag.

## Review Notes
The local workspace does not have the Azure CLI installed, so CLI validation was performed against Microsoft Learn's official Azure CLI reference rather than local --help output. The ARM template snippet is now syntactically valid JSON and includes the VM/NIC resources it references, but a production AVD deployment still needs identity join, security, monitoring, profile, and operational settings tailored to the environment.
