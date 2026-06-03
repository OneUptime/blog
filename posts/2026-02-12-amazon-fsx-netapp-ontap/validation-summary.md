# Validation Summary: How to Set Up Amazon FSx for NetApp ONTAP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon FSx for NetApp ONTAP
- AWS CLI
- NetApp ONTAP storage virtual machines, volumes, snapshots, SMB shares, and FlexClone
- NFS, SMB, and iSCSI
- Amazon CloudWatch metrics
- Terraform AWS provider

## Sources Consulted
- Amazon FSx for ONTAP: Creating file systems: https://docs.aws.amazon.com/fsx/latest/ONTAPGuide/creating-file-systems.html
- Amazon FSx for ONTAP: Creating storage virtual machines: https://docs.aws.amazon.com/fsx/latest/ONTAPGuide/creating-svms.html
- Amazon FSx for ONTAP: Creating volumes: https://docs.aws.amazon.com/fsx/latest/ONTAPGuide/creating-volumes.html
- AWS CLI `fsx create-volume` command reference: https://docs.aws.amazon.com/cli/latest/reference/fsx/create-volume.html
- Amazon FSx for ONTAP: Accessing your FSx for ONTAP data: https://docs.aws.amazon.com/fsx/latest/ONTAPGuide/access-environments.html
- Amazon FSx for ONTAP: Mounting volumes on Microsoft Windows clients: https://docs.aws.amazon.com/fsx/latest/ONTAPGuide/attach-windows-client.html
- Amazon FSx for ONTAP: File system access control with Amazon VPC: https://docs.aws.amazon.com/fsx/latest/ONTAPGuide/limit-access-security-groups.html
- Amazon FSx for ONTAP: File system metrics: https://docs.aws.amazon.com/fsx/latest/ONTAPGuide/file-system-metrics.html
- Terraform AWS provider `aws_fsx_ontap_file_system`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/fsx_ontap_file_system
- Terraform AWS provider `aws_fsx_ontap_volume`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/fsx_ontap_volume
- NetApp ONTAP: Create SMB shares: https://docs.netapp.com/us-en/ontap/smb-config/create-share-task.html
- NetApp ONTAP: Create a FlexClone volume: https://docs.netapp.com/us-en/ontap/volumes/create-flexclone-task.html

## Issues Found
- Corrected multi-protocol wording that implied NFS, SMB, and iSCSI all access the same data. FSx for ONTAP supports concurrent NFS and SMB access to the same volume, while iSCSI uses LUNs on the same storage platform.
- Corrected the SVM creation explanation. The AWS console can create a default SVM, but the AWS CLI file-system creation example does not create one automatically.
- Replaced AWS CLI ONTAP volume examples from `SizeInMegabytes` to `SizeInBytes`, because current AWS CLI documentation says to use `SizeInBytes` instead.
- Added SMB share creation before the Windows mount commands. Creating an ONTAP volume and junction path does not by itself create the SMB share that Windows clients mount.
- Added TCP 22 to the Terraform security group example because the corrected SMB share creation example uses ONTAP CLI access over SSH.
- Corrected the snapshot section wording to say AWS CLI or Amazon FSx API, matching the commands shown.
- Added `StorageTier` and `DataType` dimensions to the CloudWatch `StorageCapacityUtilization` example so it matches the detailed FSx for ONTAP metric dimensions.

## Review Notes
- The Terraform volume example still uses `size_in_megabytes`, which remains supported by the Terraform AWS provider for volumes under 2 PB.
- The security group example is scoped to the protocols demonstrated in the post. Broader ONTAP administration, NFSv3, SnapMirror, SNMP, Kerberos, or NetBIOS use cases may require additional AWS-documented ports.
