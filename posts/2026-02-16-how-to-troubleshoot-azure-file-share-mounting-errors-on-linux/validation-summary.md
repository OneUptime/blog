# Validation Summary: How to Troubleshoot Azure File Share Mounting Errors on Linux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Files
- Azure Storage accounts
- Linux CIFS/SMB mounts
- cifs-utils
- Azure CLI
- autofs
- Azure Private Endpoint
- Azure Files NFS

## Sources Consulted
- Microsoft Learn: Mount SMB Azure file shares on Linux clients, https://learn.microsoft.com/en-us/azure/storage/files/storage-how-to-use-files-linux
- Microsoft Learn: SMB file shares in Azure Files, https://learn.microsoft.com/en-us/azure/storage/files/files-smb-protocol
- Microsoft Learn: Networking considerations for Azure Files, https://learn.microsoft.com/en-us/azure/storage/files/storage-files-networking-overview
- Microsoft Learn: Troubleshoot Azure Files SMB connectivity and access issues, https://learn.microsoft.com/en-au/troubleshoot/azure/azure-storage/files/connectivity/files-troubleshoot-smb-connectivity
- Microsoft Learn: Troubleshoot Azure Files, https://learn.microsoft.com/en-us/troubleshoot/azure/azure-storage/files/connectivity/files-troubleshoot
- Microsoft Learn: Troubleshoot NFS file shares in Azure Files, https://learn.microsoft.com/en-us/troubleshoot/azure/azure-storage/files/security/files-troubleshoot-linux-nfs
- Microsoft Learn: Azure CLI az storage account network-rule, https://learn.microsoft.com/en-us/cli/azure/storage/account/network-rule
- Microsoft Learn: Configure Azure Files network endpoints, https://learn.microsoft.com/en-us/azure/storage/files/storage-files-networking-endpoints

## Issues Found
- The basic mount command used an unquoted angle-bracket placeholder for `password=<storage-account-key>`, which can be parsed by the shell as redirection if copied literally. Changed it to quote the placeholder consistently with later examples.
- The post described the encryption requirement only as "Secure transfer required" being enabled by default. Updated this to reflect the current Azure Files behavior: SMB encryption can be governed by the newer "Require Encryption in Transit for SMB" setting, while older or unconfigured accounts may still be governed by the storage account "Secure transfer required" setting.
- The `mount error(115)` section only attributed the error to blocked port 445. Microsoft documents this error for Linux clients missing SMB 3.x encryption support, while blocked port 445 is still a common connectivity issue. Updated the cause and troubleshooting language accordingly.
- The private endpoint and NFS workaround text implied they universally bypass port 445 problems. Clarified that a private endpoint requires access from a connected virtual network and that NFS requires premium FileStorage plus service endpoint or private endpoint network access.
- The `mount error(112)` section incorrectly described the error as an SMB version mismatch. Microsoft documents this error as a reconnection timeout, often involving older Linux kernel CIFS reconnection behavior. Replaced the SMB downgrade examples with a `hard` mount workaround and kernel upgrade guidance.
- The DNS troubleshooting section suggested overwriting `/etc/resolv.conf` with a public resolver. Replaced that with a direct `dig @8.8.8.8` test to avoid breaking managed resolver configurations.

## Review Notes
The remaining examples are broadly consistent with Microsoft guidance for Azure Files SMB mounts on Linux. The Azure CLI was not installed locally in this workspace, so CLI syntax was checked against Microsoft Learn rather than local `az --help` output.
