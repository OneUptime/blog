# Validation Summary: How to Set Up Azure AD Connect Cloud Sync for Hybrid Identity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Entra ID
- Microsoft Entra Cloud Sync / Azure AD Connect Cloud Sync
- Microsoft Entra Connect Sync / Azure AD Connect Sync
- Active Directory Domain Services
- Password hash synchronization
- Microsoft Graph PowerShell
- PowerShell

## Sources Consulted
- Microsoft Learn: Prerequisites for Microsoft Entra Cloud Sync - https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-prerequisites
- Microsoft Learn: Install the Microsoft Entra provisioning agent - https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-install
- Microsoft Learn: Install the Microsoft Entra provisioning agent by using a CLI and PowerShell - https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-install-pshell
- Microsoft Learn: Provision Active Directory to Microsoft Entra ID - Configuration - https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-configure
- Microsoft Learn: What is Microsoft Entra Cloud Sync? - https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/what-is-cloud-sync
- Microsoft Learn: Migrate from Microsoft Entra Connect to Cloud Sync: Decision Guide - https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/connect-to-cloud-sync-decision-guide
- Microsoft Learn: Attribute mapping - Active Directory to Microsoft Entra ID - https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-attribute-mapping
- Microsoft Learn: What is password hash synchronization with Microsoft Entra ID? - https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-phs
- Microsoft Learn: List provisioningObjectSummary - https://learn.microsoft.com/en-us/graph/api/provisioningobjectsummary-list
- Microsoft Learn: Get-MgAuditLogProvisioning - https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.reports/get-mgauditlogprovisioning
- Microsoft Learn: Manage custom domain names in Microsoft Entra ID - https://learn.microsoft.com/en-us/entra/identity/users/domains-manage

## Issues Found
- The prerequisites incorrectly implied that Microsoft Entra ID P1/P2 is required for basic AD-to-Entra Cloud Sync. Updated the prerequisite to distinguish a Microsoft Entra tenant from premium features that can require P1/P2.
- The Windows Server prerequisite used "Windows Server 2016+", which could imply Windows Server 2025 support. Updated it to list Windows Server 2022, 2019, and 2016, and noted that Microsoft recommends Windows Server 2022 while Windows Server 2025 is not currently supported.
- The Entra admin center navigation paths used older or inaccurate labels. Updated them to current Microsoft Learn paths such as Entra ID > Entra Connect > Cloud sync and Entra ID > Domain names.
- The Cloud Sync and Connect Sync comparison overstated Connect Sync support as "all synchronization scenarios" and listed group writeback in a way that could mislead readers. Updated the comparison to reflect advanced Connect Sync features and added Cloud Sync cloud-to-AD group provisioning.
- The Mermaid diagram duplicated the AD-to-Entra edge and did not actually route traffic through the two Cloud Sync agents. Updated the diagram so AD connects to the two agents, and the agents connect to Microsoft Entra ID.
- The installation section said the wizard could use a custom service account if gMSA was unsupported. Updated this to custom gMSA, matching Microsoft guidance.
- The silent install snippet presented package installation as enough to complete setup. Updated it to use the documented quiet install pattern, import the Cloud Sync PowerShell module, and state that the agent still needs registration/configuration through the wizard or Cloud Sync PowerShell cmdlets.
- The high availability section recommended only a second agent. Updated it to note that two agents provide failover and Microsoft recommends three active agents.
- The portal configuration and password hash sync steps separated PHS from the configuration creation flow. Updated the steps to show that password hash sync is selected when creating the AD to Microsoft Entra ID sync configuration, or by editing the configuration before enabling it.
- The scoping filter section claimed attribute-based filtering as a portal scoping option. Updated it to the documented options: all users, selected security groups, or selected OUs.
- The attribute mapping section implied sourceAnchor should be manually configured as a common customization. Updated it to describe the default Cloud Sync source anchor behavior: ms-DS-ConsistencyGuid with fallback to objectGUID.
- The Microsoft Graph provisioning log example used only AuditLog.Read.All. Updated the connection scope to include Directory.Read.All, matching the Graph API permissions for provisioning logs.

## Review Notes
The post still uses the older "Azure AD Connect" naming in the title and tags, but the body consistently references Microsoft Entra ID and the legacy naming is recognizable for search/discovery. Future revisions could consider renaming the title to Microsoft Entra Cloud Sync, but that is editorial rather than a correctness blocker.
