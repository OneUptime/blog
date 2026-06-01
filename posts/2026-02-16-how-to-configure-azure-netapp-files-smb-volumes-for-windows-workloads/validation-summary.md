# Validation Summary: How to Configure Azure NetApp Files SMB Volumes for Windows Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure NetApp Files
- SMB / CIFS
- Active Directory Domain Services
- Azure CLI
- Azure Virtual Network delegated subnets
- Windows PowerShell
- Azure Monitor metrics

## Sources Consulted
- Microsoft Learn: Create an SMB volume for Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-create-volumes-smb
- Microsoft Learn: Create a capacity pool for Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-set-up-capacity-pool
- Microsoft Learn: Service levels for Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-service-levels
- Microsoft Learn: Delegate a subnet to Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-delegate-subnet
- Microsoft Learn: Guidelines for Azure NetApp Files network planning - https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-network-topologies
- Microsoft Learn: Create and manage Active Directory connections for Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/create-active-directory-connections
- Microsoft Learn: Azure CLI az netappfiles account ad - https://learn.microsoft.com/en-us/cli/azure/netappfiles/account/ad
- Microsoft Learn: Azure CLI az netappfiles volume - https://learn.microsoft.com/en-us/cli/azure/netappfiles/volume
- Microsoft Learn: SMB FAQs for Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/faq-smb
- Microsoft Learn: SMB performance best practices for Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-smb-performance
- Microsoft Learn: Metrics for Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-metrics
- Microsoft Learn: Supported metrics for Microsoft.NetApp/netAppAccounts/capacityPools/volumes - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-netapp-netappaccounts-capacitypools-volumes-metrics
- Microsoft Learn: Manage SMB Multichannel - https://learn.microsoft.com/en-us/windows-server/storage/storage-spaces/manage-smb-multichannel

## Issues Found
- The Active Directory `--organizational-unit` example incorrectly included the domain DN components (`DC=corp,DC=contoso,DC=com`). Azure NetApp Files expects the OU path within the domain, such as `OU=NetApp,OU=Servers`, so the command and explanatory note were updated.
- The capacity pool minimum-size statement said the minimum is 4 TiB for all service levels. Current Azure NetApp Files documentation states the minimum is 1 TiB when all volumes use Standard network features and 4 TiB if any volume uses Basic network features, so the statement was corrected.
- The NTFS permissions PowerShell example said it removed inherited permissions, but the code only retrieved the current ACL and added a rule. The comment was corrected to match the code.
- The SMB Multichannel note said it is enabled by default on Windows Server 2022 and newer. Microsoft documentation states SMB Multichannel is enabled by default on supported Windows clients, and Azure NetApp Files SMB shares have it enabled by default, so the note was generalized.

## Review Notes
The Azure CLI executable was not installed in the local environment, so command validation was performed against Microsoft Learn Azure CLI reference pages instead of local `az --help` output. The reviewed metric names (`VolumeLogicalSize`, `ReadIops`, and `WriteIops`) match the Azure Monitor supported metrics reference for Azure NetApp Files volumes.
