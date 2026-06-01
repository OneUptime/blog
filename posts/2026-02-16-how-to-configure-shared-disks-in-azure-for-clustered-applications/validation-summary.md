# Validation Summary: How to Configure Shared Disks in Azure for Clustered Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Managed Disks
- Azure Shared Disks
- Azure CLI
- Azure PowerShell Az.Compute
- Windows Server Failover Clustering
- Linux Pacemaker / pcs
- SCSI Persistent Reservations

## Sources Consulted
- Microsoft Learn: Enable shared disks for Azure managed disks - https://learn.microsoft.com/en-us/azure/virtual-machines/disks-shared-enable
- Microsoft Learn: Share an Azure managed disk across VMs - https://learn.microsoft.com/en-us/azure/virtual-machines/disks-shared
- Microsoft Learn: Azure CLI `az disk` reference - https://learn.microsoft.com/en-us/cli/azure/disk
- Microsoft Learn: Azure CLI `az vm disk` reference - https://learn.microsoft.com/en-us/cli/azure/vm/disk
- Microsoft Learn: Az PowerShell `New-AzDiskConfig` reference - https://learn.microsoft.com/en-us/powershell/module/az.compute/new-azdiskconfig
- Red Hat Documentation: RHEL 8 high availability and clusters changes - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/considerations_in_adopting_rhel_8/high-availability-and-clusters_considerations-in-adopting-rhel-8
- Microsoft Learn: Set up Pacemaker on Red Hat Enterprise Linux in Azure - https://learn.microsoft.com/en-us/azure/sap/workloads/high-availability-guide-rhel-pacemaker
- Microsoft Learn: Failover cluster quorum witness - https://learn.microsoft.com/en-us/windows-server/failover-clustering/what-is-quorum-witness

## Issues Found
- The supported Premium SSD and Standard SSD size ranges were too narrow. Microsoft documentation lists Premium SSD shared disk support from P1 and Standard SSD support from E1, so the supported disk type list was updated.
- The max-shares diagram had outdated limits for P/E lower sizes and Ultra Disk. It now reflects current documented limits: P1-P20 and E1-E20 support up to 3 shares, Ultra Disk supports up to 15, and Premium SSD v2 was added with up to 15.
- The availability zone guidance incorrectly stated that all shared disks must be in the same zone and that cross-zone shared disks are not supported. The text now distinguishes Ultra/Premium SSD v2 limitations from Premium SSD and Standard SSD ZRS cross-zone support.
- The Pacemaker example used older `pcs cluster auth` and `pcs cluster setup --name` syntax. The RHEL example now uses `dnf`, `pcs host auth`, and the current RHEL 8/9 cluster setup form.
- The fencing section incorrectly implied Azure provides fencing agents for WSFC. The text now separates WSFC SCSI PR/quorum behavior from Pacemaker's `fence_azure_arm` agent and uses the correct Cloud Witness terminology.

## Review Notes
The Azure CLI and Az PowerShell disk creation examples match current Microsoft documentation. The Linux filesystem resource example is intentionally minimal; production Pacemaker deployments should also include full STONITH/fencing configuration, stable device identifiers, ordering/colocation constraints as needed, and distribution-specific support guidance.
