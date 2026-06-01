# Validation Summary: How to Diagnose Azure Storage Connectivity Issues from On-Premises Networks

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Storage
- Azure Blob Storage endpoints
- Azure Private Endpoint DNS
- Azure Storage firewall and network rules
- Azure CLI
- Azure Network Watcher
- DNS tools (`nslookup`, `dig`)
- TCP and packet diagnostic tools (`Test-NetConnection`, `nc`, `tcpdump`)
- PowerShell TLS diagnostics
- HTTP proxy diagnostics with `curl`

## Sources Consulted
- Microsoft Learn: Azure Private Endpoint private DNS zone values - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Azure Storage firewall rules - https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security
- Microsoft Learn: Enforce a minimum required version of Transport Layer Security (TLS) for Azure Storage - https://learn.microsoft.com/en-us/azure/storage/common/transport-layer-security-configure-minimum-version
- Microsoft Learn: Azure service tags overview - https://learn.microsoft.com/en-us/azure/virtual-network/service-tags-overview
- Microsoft Learn: Azure CLI `az storage account network-rule` reference - https://learn.microsoft.com/en-us/cli/azure/storage/account/network-rule
- Microsoft Learn: Azure CLI `az network watcher test-connectivity` reference - https://learn.microsoft.com/en-us/cli/azure/network/watcher
- Microsoft Learn: PowerShell `Invoke-WebRequest` reference - https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-webrequest
- Local command help for OpenBSD netcat and curl (`nc -h`, `curl --help all`)

## Issues Found
- The Linux/macOS `nc` command placed `-w 5` after the destination and port. OpenBSD-style `nc` documents options before the destination, so the command was changed to `nc -zv -w 5 mystorageaccount.blob.core.windows.net 443`.
- The PowerShell TLS test used `Invoke-WebRequest` against `?comp=list` with `HEAD`, which can fail because of HTTP method or authorization behavior even when TLS negotiation succeeds. It was replaced with an `SslStream` test that directly verifies TLS 1.2 negotiation and certificate validation.
- The `curl` proxy-bypass example left a URL containing `&` unquoted. In POSIX shells, `&` backgrounds the preceding command, so the URL is now quoted.

## Review Notes
Azure Network Watcher `test-connectivity` is currently documented as a preview Azure CLI command, but the command syntax used in the post matches the official reference. Azure Storage supports TLS 1.2 and 1.3; the post's TLS guidance remains accurate for current Azure Storage connectivity troubleshooting.
