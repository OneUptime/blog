# Validation Summary: How to Mount an Azure File Share on Linux Using NFS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Files
- Azure Storage accounts
- NFSv4.1
- Azure CLI
- Azure Private Endpoint
- Azure Virtual Network service endpoints
- Linux NFS client mounts
- `/etc/fstab`
- Linux udev read-ahead tuning

## Sources Consulted
- Microsoft Learn: Mount NFS Azure file shares on Linux - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-how-to-mount-nfs-shares
- Microsoft Learn: NFS Azure file shares - https://learn.microsoft.com/en-us/azure/storage/files/files-nfs-protocol
- Microsoft Learn: Encryption in transit for NFS Azure file shares - https://learn.microsoft.com/en-us/azure/storage/files/encryption-in-transit-for-nfs-shares
- Microsoft Learn: Improve performance for NFS Azure file shares - https://learn.microsoft.com/en-us/azure/storage/files/nfs-performance
- Microsoft Learn: Networking considerations for Azure Files - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-networking-overview
- Microsoft Learn: Scalability and performance targets for Azure Files - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-scale-targets
- Microsoft Learn: Understand Azure Files billing - https://learn.microsoft.com/en-ie/azure/storage/files/understanding-billing
- Microsoft Learn: Azure CLI `az storage account` reference - https://learn.microsoft.com/en-us/cli/azure/storage/account?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az storage share-rm` reference - https://learn.microsoft.com/en-us/cli/azure/storage/share-rm?view=azure-cli-latest

## Issues Found
- The post said NFS shares have no public endpoint access. Azure documentation says NFS shares can use the storage account public endpoint only when access is restricted to specific virtual networks through service endpoints. Updated the limitation to say there is no unrestricted public internet access.
- The post said Azure Files NFS has no encryption in transit. Current Azure Files supports NFS encryption in transit through the AZNFS mount helper and TLS. Updated the wording to clarify that native NFS mounts are not encrypted, while AZNFS encrypted mounts are supported.
- The post listed Linux kernel 4.18 or later as a prerequisite, but its mount examples use `nconnect`. Microsoft documents kernel 5.3 or later as the requirement for `nconnect` on older Linux distributions. Updated the prerequisite to match the examples.
- The native `/etc/fstab` example omitted Azure's recommended `_netdev` and `nofail` options. Added them to the persistent mount example.
- The performance tuning section recommended `nconnect=8` for maximum throughput and said returns diminish beyond 8. Microsoft recommends `nconnect=4` for Azure Files and notes there are currently no gains beyond four channels. Updated the command and explanation.
- The read-ahead tuning command used an ad hoc `/sys/class/bdi/0:*/read_ahead_kb` write with a 16 MiB value. Microsoft recommends persistently setting NFS read-ahead to 15 MiB on Linux kernel 5.4 or later through a udev rule. Replaced the snippet with the documented persistent udev approach.
- The provisioned performance table had incorrect values for 1 TiB and 5 TiB premium provisioned v1 shares. Updated them to 4,024 IOPS / 203 MiB/s for 1 TiB and 8,120 IOPS / 613 MiB/s for 5 TiB based on Microsoft formulas.

## Review Notes
Azure CLI is not installed in this workspace, so command validation was performed against the official Azure CLI reference rather than local `az --help` output. The post uses the classic `Microsoft.Storage`/`FileStorage` path with native NFS mounts; future updates could add an AZNFS-specific path for encrypted mounts, but that would be an expansion rather than a correctness fix.
