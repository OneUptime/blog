# Validation Summary: How to Configure Snapshot Policies for Azure NetApp Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure NetApp Files
- Azure CLI
- Azure Monitor metrics
- NFS and SMB snapshot restore workflows
- Snapshot policies and volume revert

## Sources Consulted
- Microsoft Learn: Azure CLI `az netappfiles snapshot policy` reference: https://learn.microsoft.com/en-us/cli/azure/netappfiles/snapshot/policy?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az netappfiles snapshot` reference: https://learn.microsoft.com/en-us/cli/azure/netappfiles/snapshot?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az netappfiles volume` reference: https://learn.microsoft.com/en-us/cli/azure/netappfiles/volume?view=azure-cli-latest
- Microsoft Learn: Understand Azure NetApp Files snapshot-based data protection: https://learn.microsoft.com/en-gb/azure/azure-netapp-files/snapshots-introduction
- Microsoft Learn: Manage snapshot policies in Azure NetApp Files: https://learn.microsoft.com/en-us/azure/azure-netapp-files/snapshots-manage-policy
- Microsoft Learn: Restore a file from a snapshot using a client with Azure NetApp Files: https://learn.microsoft.com/en-us/azure/azure-netapp-files/snapshots-restore-file-client
- Microsoft Learn: Revert a volume using snapshot revert with Azure NetApp Files: https://learn.microsoft.com/en-us/azure/azure-netapp-files/snapshots-revert-volume
- Microsoft Learn: Metrics for Azure NetApp Files: https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-metrics
- Microsoft Learn: Supported Azure Monitor metrics for Microsoft.NetApp/netAppAccounts/capacityPools/volumes: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-netapp-netappaccounts-capacitypools-volumes-metrics

## Issues Found
- The snapshot policy command used `--monthly-days-of-month`, which is not a current Azure CLI option. Changed it to `--monthly-days`, the documented alias for the monthly days setting.
- The post claimed snapshots take less than a second and that creation time is under a second for any volume size. Microsoft documentation describes Azure NetApp Files snapshots as near-instantaneous and taking only a few seconds, so the wording was corrected.
- The post described schedule times without a timezone. Azure CLI documents snapshot policy hour fields as UTC, so the daily, weekly, and monthly schedule descriptions now say UTC.
- The post described the NFS `.snapshot` path as always available through a hidden directory. Microsoft documentation says snapshot directory access is controlled by snapshot path visibility, so the wording now reflects that and mentions appropriate permissions.
- The SMB restore explanation only mentioned Previous Versions. Microsoft documentation also identifies `~snapshot` for SMB clients when the snapshot path is visible, so that caveat was added.
- The RTO guidance said full volume reverts take seconds. Microsoft documentation says volume revert is near-instantaneous and takes only a few seconds, so the wording was tightened.

## Review Notes
The Azure CLI examples could not be checked with local `az --help` because Azure CLI is not installed in this environment. Commands and flags were verified against current Microsoft Learn CLI reference pages instead. The `VolumeSnapshotSize` Azure Monitor metric name is valid for Azure NetApp Files volume resources.
