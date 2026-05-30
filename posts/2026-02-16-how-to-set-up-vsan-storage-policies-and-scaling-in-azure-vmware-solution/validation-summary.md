# Validation Summary: How to Set Up vSAN Storage Policies and Scaling in Azure VMware Solution

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Azure VMware Solution
- VMware vSAN
- vSAN storage policies
- VMware PowerCLI / VCF PowerCLI
- Azure CLI
- Azure NetApp Files

## Sources Consulted
- Microsoft Learn: Configure a VMware vSAN storage policy - https://learn.microsoft.com/en-us/azure/azure-vmware/configure-storage-policy
- Microsoft Learn: Configure VMware vSAN (OSA) - https://learn.microsoft.com/en-us/azure/azure-vmware/configure-vsan
- Microsoft Learn: Architecture for Private Clouds and Clusters - https://learn.microsoft.com/en-us/azure/azure-vmware/architecture-private-clouds
- Microsoft Learn: Attach Azure NetApp Files datastores to Azure VMware Solution hosts - https://learn.microsoft.com/en-us/azure/azure-vmware/attach-azure-netapp-files-to-azure-vmware-solution-hosts
- Microsoft Learn: az vmware private-cloud - https://learn.microsoft.com/en-us/cli/azure/vmware/private-cloud
- Microsoft Learn: az vmware cluster - https://learn.microsoft.com/en-us/cli/azure/vmware/cluster
- Microsoft Learn: az vmware script-package, script-cmdlet, and script-execution - https://learn.microsoft.com/en-us/cli/azure/vmware/script-package, https://learn.microsoft.com/en-us/cli/azure/vmware/script-cmdlet, https://learn.microsoft.com/en-us/cli/azure/vmware/script-execution
- Microsoft Learn: az netappfiles volume - https://learn.microsoft.com/en-us/cli/azure/netappfiles/volume
- Broadcom Developer: Get-VsanSpaceUsage PowerCLI reference - https://developer.broadcom.com/powercli/latest/vmware.vimautomation.storage/commands/get-vsanspaceusage/
- Broadcom Developer: Set-SpbmEntityConfiguration PowerCLI reference - https://developer.broadcom.com/powercli/latest/vmware.vimautomation.storage/commands/set-spbmentityconfiguration

## Issues Found
- The post described AV36 host capacity as raw NVMe capacity. Microsoft documents AV36 as using NVMe for the cache tier and SSD for the 15.2 TB capacity tier, so the wording and diagram labels were corrected to local storage devices / SSD capacity.
- The post said policy changes trigger a full data migration. This was narrowed to vSAN data resync, which is the more accurate behavior for policy changes.
- The custom storage policy automation sample used low-level SPBM PowerCLI capability names and values that were not aligned with AVS's documented management path. It was replaced with an Azure CLI Run Command example using `New-AVSStoragePolicy` and the documented `R5FTT1` policy value.
- The PowerCLI vSAN capacity example used an incorrect vSAN view object for space usage. It was replaced with the documented `Get-VsanSpaceUsage -Cluster` cmdlet.
- The scaling command used `az vmware cluster update` against `Cluster-1`, but Azure CLI documents cluster commands as excluding the default management cluster. The example was corrected to `az vmware private-cloud update --cluster-size` for scaling the default management cluster.
- The Azure NetApp Files datastore volume example did not enable the volume for AVS datastore usage or Standard network features. The volume creation command now includes `--avs-data-store Enabled` and `--network-features Standard`.
- The AVS datastore attach command used incorrect option names. It was corrected from `--cluster-name` and `--volume-id` to the documented `--cluster` and `--net-app-volume` options.
- The deduplication and compression section implied these features needed to be enabled manually and could not be configured separately. AVS OSA clusters enable deduplication and compression by default, and current AVS guidance supports compression-only mode. The section was corrected accordingly.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn CLI reference pages rather than local `az --help` output.
