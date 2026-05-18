# Validation Summary: How to Set Up Samba Multi-Channel for High Performance on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Samba (SMB3 file server)
- SMB3 Multi-Channel protocol feature
- Ubuntu 20.04+ (Netplan, systemd)
- ethtool (RSS / NIC channel configuration)
- PowerShell SMB cmdlets (`Get-SmbMultichannelConnection`, `Get-SmbClientConfiguration`)
- sysstat (`sar`) and `nload` for monitoring

## Sources Consulted
- Official Samba `smb.conf` manual: https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html
- Samba wiki on SMB3 Multi-Channel: https://wiki.samba.org/index.php/SMB3-Multi-Channel
- Microsoft Learn — SMB Multichannel: https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-direct
- Microsoft PowerShell docs — Get-SmbMultichannelConnection: https://learn.microsoft.com/en-us/powershell/module/smbshare/get-smbmultichannelconnection
- Microsoft PowerShell docs — Get-SmbClientConfiguration: https://learn.microsoft.com/en-us/powershell/module/smbshare/get-smbclientconfiguration
- Netplan reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- ethtool(8) man page
- Ubuntu package archive (confirmed Samba 4.11.x in Ubuntu 20.04 LTS)

## Issues Found

1. **Incorrect claim that Windows 10 Home does not support SMB Multi-Channel.**
   - Original: "Windows 10 Home edition does NOT support SMB Multi-Channel - you need Pro, Enterprise, or a Windows Server edition."
   - Fix: SMB Multi-Channel is supported on all editions of Windows 10/11 (including Home) and Windows Server 2012 R2+, and is enabled by default. Updated the troubleshooting bullet to reflect this and to note that activation requires the client to have a usable route via more than one interface.

2. **Incorrect reference to a `NumChannels` field in `Get-SmbMultichannelConnection` output.**
   - Original: "look for NumChannels > 1" / "If `NumChannels` is 1, Multi-Channel did not activate."
   - Fix: `Get-SmbMultichannelConnection` returns one row per active channel and does not expose a `NumChannels` property. Reworded to "one row per channel — multiple rows means Multi-Channel is active." (`NumChannels` is not a property of `Get-SmbConnection` either; that cmdlet exposes `NumOpens`.)

3. **Deprecated/SMB1-only Samba parameters in the performance-tuning block.**
   - Original block included `read raw = yes`, `write raw = yes`, and `max xmit = 65535`.
   - Fix: Removed these. They only apply to the legacy NT1 (SMB1) protocol and have no effect when `server min protocol = SMB2` is set (which is required for Multi-Channel). Modern Samba treats them as ignored/deprecated. Also trimmed `socket options` to `TCP_NODELAY IPTOS_LOWDELAY`, removing the explicit `SO_RCVBUF=131072 SO_SNDBUF=131072` overrides — Samba's own guidance is to avoid setting these because they disable the kernel's TCP buffer auto-tuning, which on high-throughput links is exactly what you want.

## Review Notes
- `gateway4` in Netplan is deprecated starting with Netplan 0.103 (Ubuntu 22.04+) in favor of the `routes:` stanza. It still works with a warning on 22.04 and is fully supported on 20.04 (the minimum target stated in the post), so it was left as-is.
- `server multi channel support` defaulted to `no` in Samba versions through ~4.14 and to `yes` from Samba 4.15 onward. Setting it explicitly to `yes` (as the post does) is correct and version-portable.
- The two-IPs-on-the-same-subnet topology shown will work, but in production, separate subnets per NIC are generally recommended to avoid asymmetric routing. The post's note about omitting the gateway on the secondary interface is a reasonable mitigation for the single-subnet case.
- The quoted throughput of 150–180 MB/s on dual 1GbE links is realistic; sustained ~110–117 MB/s per 1GbE link is achievable with Multi-Channel and RSS, depending on disk and CPU.
- The post's broader caveats (Multi-Channel requires SMB2/3, signing or encryption on the connection, RSS-capable NICs for best results) align with the Samba wiki and Microsoft documentation.
