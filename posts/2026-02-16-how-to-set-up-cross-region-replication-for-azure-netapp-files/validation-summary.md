# Validation Summary: How to Set Up Cross-Region Replication for Azure NetApp Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure NetApp Files
- Azure NetApp Files cross-region replication
- Azure CLI
- Azure Monitor metrics alerts
- Mermaid diagrams

## Sources Consulted
- Microsoft Learn: Create volume replication for Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/cross-region-replication-create-peering
- Microsoft Learn: Understand Azure NetApp Files replication - https://learn.microsoft.com/en-us/azure/azure-netapp-files/replication
- Microsoft Learn: Requirements and considerations for Azure NetApp Files replication - https://learn.microsoft.com/en-us/azure/azure-netapp-files/cross-zone-replication-requirements-considerations
- Microsoft Learn: Manage disaster recovery using Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/cross-region-replication-manage-disaster-recovery
- Microsoft Learn: Azure CLI `az netappfiles volume` reference - https://learn.microsoft.com/en-us/cli/azure/netappfiles/volume
- Microsoft Learn: Azure CLI `az netappfiles volume replication` reference - https://learn.microsoft.com/en-us/cli/azure/netappfiles/volume/replication
- Microsoft Learn: Metrics for Azure NetApp Files - https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-metrics
- Microsoft Learn: Azure CLI `az netappfiles pool` reference - https://learn.microsoft.com/en-us/cli/azure/netappfiles/pool

## Issues Found
- The prerequisites implied that most region pairs support cross-region replication by default. Microsoft documents cross-region replication as available only for supported fixed regional and nonstandard pairs, so the prerequisite now says to use a supported source/destination region pair.
- The Mermaid subgraph declarations used unquoted labels with spaces and hyphens, which can fail in Mermaid parsers. They now use explicit subgraph IDs with quoted labels.
- The destination volume comment said the volume must be at least as large as the source. Microsoft documents that the destination quota should mirror the source and that smaller destination quotas are automatically resized to the source size, so the comment now says the quota should mirror the source.
- The failover command used `az netappfiles volume replication break`, which is not a current Azure CLI command. It now uses `az netappfiles volume replication suspend`, the documented CLI operation for suspending/breaking replication on a destination volume.
- The disaster-recovery resync section used `re-initialize` for reverse resync and `resync`, which does not match the current CLI. It now uses `az netappfiles volume replication resume` on the original source for reverse resync and on the destination for resuming the original direction.
- The monitoring section listed "Volume replication transfer rate", which is not one of the documented Azure NetApp Files replication metrics. It now references the documented last transfer duration and size metrics.
- The cost section double-counted the destination volume and destination capacity pool as separate cost components. It now describes destination storage capacity and replicated data charges as the two main cost components.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn Azure CLI reference pages rather than local `az --help` output.
