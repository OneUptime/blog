# Validation Summary: How to Set Up Amazon FSx for Windows File Server

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon FSx for Windows File Server
- AWS CLI
- AWS Managed Microsoft AD / Active Directory
- SMB
- FSx Remote PowerShell administration
- Shadow copies
- Data deduplication
- CloudWatch metrics and alarms
- Terraform AWS provider

## Sources Consulted
- AWS CLI `create-file-system` command reference: https://docs.aws.amazon.com/cli/latest/reference/fsx/create-file-system.html
- AWS CLI `create-file-system-from-backup` command reference: https://docs.aws.amazon.com/cli/latest/reference/fsx/create-file-system-from-backup.html
- AWS CLI `create-microsoft-ad` command reference: https://docs.aws.amazon.com/cli/latest/reference/ds/create-microsoft-ad.html
- Amazon FSx for Windows File Server overview: https://docs.aws.amazon.com/fsx/latest/WindowsGuide/what-is.html
- Amazon FSx Single-AZ and Multi-AZ availability documentation: https://docs.aws.amazon.com/fsx/latest/WindowsGuide/high-availability-multiAZ.html
- Amazon FSx VPC security group and port requirements: https://docs.aws.amazon.com/fsx/latest/WindowsGuide/limit-access-security-groups.html
- Amazon FSx Remote PowerShell administration documentation: https://docs.aws.amazon.com/fsx/latest/WindowsGuide/administering-file-systems.html
- Amazon FSx file share management documentation: https://docs.aws.amazon.com/fsx/latest/WindowsGuide/managing-file-shares.html
- Amazon FSx shadow copy documentation: https://docs.aws.amazon.com/fsx/latest/WindowsGuide/shadow-copies-fsxW.html
- Amazon FSx shadow copy storage documentation: https://docs.aws.amazon.com/fsx/latest/WindowsGuide/shadow-copy-storage.html
- Amazon FSx custom shadow copy schedule documentation: https://docs.aws.amazon.com/fsx/latest/WindowsGuide/shadow-schedules.html
- Amazon FSx data deduplication documentation: https://docs.aws.amazon.com/fsx/latest/WindowsGuide/managing-data-dedup.html
- Terraform AWS provider `aws_fsx_windows_file_system` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/fsx_windows_file_system

## Issues Found
- The post stated that DFS namespaces and replication are generally supported. AWS documents DFS replication support only for Single-AZ 1, while DFS namespaces are supported across deployment types. Updated the feature bullet to make that limitation explicit.
- The post described Multi-AZ as required for production workloads and DNS failover as transparent to all clients. AWS recommends Multi-AZ for most production workloads, and Linux clients do not support automatic DNS-based failover. Updated the wording to "recommended for most production workloads" and "transparent to Windows clients."
- The `ThroughputCapacity` explanation said it determines IOPS. AWS documents SSD IOPS as a separate configuration, with automatic provisioning at 3 IOPS per GiB by default and provisioned IOPS constrained by throughput capacity. Updated the explanation.
- The security group example omitted several documented AD/FSx ports, including UDP Kerberos/LDAP, password change, NTP, RPC endpoint mapper, Global Catalog, AD DS Web Services/PowerShell, and RPC ephemeral ports. Added the missing rules and the note about mirroring rules on domain controller, client, administrator, and DNS firewalls.
- The FSx Remote PowerShell examples used the file system DNS name. AWS documents `RemoteAdministrationEndpoint` as the endpoint for FSx Remote PowerShell, especially for Multi-AZ. Updated the examples to use `$FSxRemoteEndpoint`.
- The shadow copy schedule example used unsupported `Set-FSxShadowCopySchedule -Type Custom -SchedulePattern` syntax. Replaced it with documented `New-ScheduledTaskTrigger` objects passed through `-ScheduledTaskTriggers`.
- The shadow storage example used `Set-FSxShadowStorage -MaxSize "10%"` while describing the default 10 percent setting. Replaced it with the documented `Set-FSxShadowStorage -Default` command.
- The Terraform security group example omitted outbound traffic. Added an egress rule for VPC traffic so FSx can reach clients, DNS, and Active Directory services.

## Review Notes
The two internal OneUptime links referenced in the post returned HTTP 200 during validation. The Terraform security group snippet is still intentionally compact; in production it should mirror the full AD and remote administration traffic requirements called out in the preceding AWS CLI security group section.
