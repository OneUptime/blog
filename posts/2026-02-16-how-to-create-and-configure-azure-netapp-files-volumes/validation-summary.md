# Validation Summary: How to Create and Configure Azure NetApp Files Volumes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure NetApp Files
- Azure CLI
- Azure Virtual Network delegated subnets
- NFSv3 and NFSv4.1
- SMB/CIFS
- Active Directory connections for Azure NetApp Files
- Azure NetApp Files capacity pools, volumes, export policies, snapshots, and metrics

## Sources Consulted
- Microsoft Learn: Register for NetApp Resource Provider - https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-register
- Microsoft Learn: What is Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-introduction
- Microsoft Learn: Create a capacity pool for Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-set-up-capacity-pool
- Microsoft Learn: Resource limits for Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-resource-limits
- Microsoft Learn: Service levels for Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-service-levels
- Microsoft Learn: Delegate a subnet to Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-delegate-subnet
- Microsoft Learn: Create an NFS volume for Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-create-volumes
- Microsoft Learn: Create and manage Active Directory connections for Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/create-active-directory-connections
- Microsoft Learn: Mount NFS volumes for virtual machines - https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-mount-unmount-volumes-for-virtual-machines
- Microsoft Learn: Linux NFS mount options best practices for Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/performance-linux-mount-options
- Microsoft Learn: Manage snapshot policies in Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/snapshots-edit-hide-path
- Microsoft Learn: Metrics for Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-metrics
- Azure CLI reference: az netappfiles account ad - https://learn.microsoft.com/en-us/cli/azure/netappfiles/account/ad
- Azure CLI reference: az netappfiles pool - https://learn.microsoft.com/en-us/cli/azure/netappfiles/pool
- Azure CLI reference: az netappfiles volume - https://learn.microsoft.com/en-us/cli/azure/netappfiles/volume
- Azure CLI reference: az netappfiles volume export-policy - https://learn.microsoft.com/en-us/cli/azure/netappfiles/volume/export-policy
- Azure CLI reference: az netappfiles snapshot policy - https://learn.microsoft.com/en-us/cli/azure/netappfiles/snapshot/policy

## Issues Found
- The post stated that the capacity pool minimum size is always 4 TiB. Microsoft documentation now lists 1 TiB as the minimum when all volumes use Standard network features, with 4 TiB still applying if any volume uses Basic network features. Updated both capacity-pool descriptions to reflect the current rule.
- The prerequisites said to register the provider and request capacity, but the shown commands only register and verify the Microsoft.NetApp resource provider. Updated the wording to avoid implying that the commands request quota or capacity.
- The NFSv4.1 mount and fstab examples omitted `sec=sys`, which appears in Microsoft's current NFSv4.1 mount guidance for non-Kerberos volumes. Added `sec=sys` to both examples.
- The snapshot policy command used non-current Azure CLI option names `--daily-snapshots-to-keep` and `--weekly-snapshots-to-keep`. Updated them to the documented Azure CLI flags `--daily-snapshots` and `--weekly-snapshots`.

## Review Notes
The local workspace does not have the Azure CLI installed, so CLI validation was performed against the current Microsoft Learn Azure CLI reference rather than local `az --help` output. The example still creates a 4 TiB pool, which remains valid and works for both Basic and Standard network feature scenarios.
