# Validation Summary: How to Set Up SMB Multi-Channel for Ceph Performance

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- SMB 3.0 / SMB 3.1.1 (Multi-Channel)
- Samba (server-side SMB implementation)
- Ceph / CephFS (underlying storage)
- Rook (Ceph orchestration on Kubernetes)
- Linux CIFS client (cifs-utils, kernel module)
- Windows SMB client (PowerShell SMB cmdlets)
- ethtool (NIC configuration)
- RSS (Receive Side Scaling)

## Sources Consulted
- Samba official documentation for `server multi channel support`, `max protocol`, and related parameters: https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html
- Microsoft SMB Multi-Channel documentation: https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-multichannel
- Microsoft PowerShell `Get-SmbMultichannelConnection` and `Get-SmbMultichannelConstraint` cmdlet documentation: https://learn.microsoft.com/en-us/powershell/module/smbshare/
- Linux kernel CIFS multichannel support (kernel 5.3+): https://wiki.samba.org/index.php/LinuxCIFS_utils
- ethtool RSS configuration documentation

## Issues Found

### Issue 1: Incorrect `max protocol` value
- **What was wrong:** The `max protocol` was set to `SMB3`, which in Samba maps to SMB 3.0.0 only. However, the Linux mount command later in the post uses `vers=3.1.1`, which would fail against a server limited to SMB 3.0.0.
- **What was changed:** Changed `max protocol = SMB3` to `max protocol = SMB3_11` to correctly allow SMB 3.1.1 connections.
- **Why:** Samba uses specific version aliases: `SMB3` = 3.0.0, `SMB3_02` = 3.0.2, `SMB3_11` = 3.1.1. The config and client mount options must be consistent.

### Issue 2: Misleading description for `Get-SmbMultichannelConstraint`
- **What was wrong:** The text described `Get-SmbMultichannelConstraint` as showing "bandwidth distribution," but this cmdlet shows configured interface constraints (which interfaces are allowed/restricted for multichannel), not bandwidth metrics.
- **What was changed:** Changed the description from "View bandwidth distribution:" to "View configured interface constraints for Multi-Channel:".
- **Why:** The cmdlet returns constraint objects that define which server interfaces should or shouldn't be used for multichannel, not bandwidth data.

## Review Notes
- The `systemctl restart smb` command is distribution-specific (Red Hat/CentOS). On Debian/Ubuntu systems, the service name is `smbd`. The post could note this but it is not incorrect as-is.
- The requirement "Linux with kernel 5.x" for client multichannel is approximate. CIFS multichannel support was introduced around kernel 5.3. This is acceptable as a general statement.
- The `ForEach-Object -Parallel` PowerShell syntax requires PowerShell 7+. This is not mentioned in the post but is a minor omission since PowerShell 7 is widely available.
- Modern Samba versions default `max protocol` to the highest supported value, so explicitly setting it is only necessary if you need to restrict it. The explicit setting is fine for a tutorial since it makes the configuration clear.
