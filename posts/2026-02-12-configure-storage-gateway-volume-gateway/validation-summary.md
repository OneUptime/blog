# Validation Summary: How to Configure Storage Gateway Volume Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Storage Gateway Volume Gateway
- Cached volumes and stored volumes
- iSCSI
- AWS CLI
- Amazon EBS snapshots
- Amazon CloudWatch metrics and alarms
- Linux open-iscsi / iscsiadm
- Windows iSCSI Initiator PowerShell cmdlets
- CHAP authentication

## Sources Consulted
- AWS Storage Gateway Volume Gateway concepts: https://docs.aws.amazon.com/storagegateway/latest/vgw/StorageGatewayConcepts.html
- AWS Storage Gateway quotas: https://docs.aws.amazon.com/storagegateway/latest/vgw/resource-gateway-limits.html
- AWS Storage Gateway Volume Gateway requirements: https://docs.aws.amazon.com/storagegateway/latest/vgw/Requirements.html
- AWS CLI create-cached-iscsi-volume command reference: https://docs.aws.amazon.com/cli/latest/reference/storagegateway/create-cached-iscsi-volume.html
- AWS CLI create-stored-iscsi-volume command reference: https://docs.aws.amazon.com/cli/latest/reference/storagegateway/create-stored-iscsi-volume.html
- AWS CLI update-snapshot-schedule command reference: https://docs.aws.amazon.com/cli/latest/reference/storagegateway/update-snapshot-schedule.html
- AWS CLI create-snapshot command reference: https://docs.aws.amazon.com/cli/latest/reference/storagegateway/create-snapshot.html
- AWS CLI update-chap-credentials command reference: https://docs.aws.amazon.com/cli/latest/reference/storagegateway/update-chap-credentials.html
- AWS Storage Gateway CloudWatch gateway metrics: https://docs.aws.amazon.com/storagegateway/latest/tgw/MonitoringGateways-common.html
- AWS Storage Gateway volume client connection guide: https://docs.aws.amazon.com/storagegateway/latest/vgw/GettingStartedAccessVolumes.html
- AWS Storage Gateway Windows iSCSI connection guide: https://docs.aws.amazon.com/storagegateway/latest/vgw/ConfiguringiSCSIClient.html
- Microsoft New-IscsiTargetPortal documentation: https://learn.microsoft.com/powershell/module/iscsi/new-iscsitargetportal
- Microsoft Connect-IscsiTarget documentation: https://learn.microsoft.com/powershell/module/iscsi/connect-iscsitarget

## Issues Found
- Corrected the high-level storage wording so it no longer implies all Volume Gateway data is stored directly as EBS snapshots. AWS documents cached volume primary data as stored in S3, with snapshots stored as EBS snapshots.
- Corrected capacity units from PB/TB/GB to AWS-documented PiB/TiB/GiB where the post referred to Storage Gateway quotas and local disk recommendations.
- Corrected prerequisites for stored volume gateways. Stored mode requires upload buffer and stored volume data disks, not cache disks.
- Corrected cached-volume cache sizing guidance from "20% of total volume sizes" to AWS's guidance of roughly 20% of the existing file store size.
- Corrected the `create-stored-iscsi-volume` examples to use AWS CLI boolean switches `--no-preserve-existing-data` instead of passing `false` to `--preserve-existing-data`.
- Corrected the preserve-existing-data explanation to reference the AWS CLI flag form `--preserve-existing-data`.
- Clarified that EBS volume creation is from supported snapshots, because AWS notes cached volume snapshots larger than 16 TiB can be restored to Storage Gateway volumes but not to EBS volumes.
- Corrected CHAP secret length wording from characters to UTF-8 encoded bytes, matching AWS CLI documentation.

## Review Notes
The AWS CLI binary is not installed in this workspace, so command syntax was verified against official AWS CLI documentation rather than local `aws help` output. The Linux and Windows iSCSI examples match the documented workflow, but production deployments should also apply AWS's recommended iSCSI timeout customization and avoid connecting multiple unclustered hosts to the same volume.
