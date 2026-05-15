# Validation Summary: How to Configure Multi-Channel Samba for Higher Throughput on RHEL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Samba / SMB3
- SMB Multichannel
- Linux CIFS mounts
- Windows SMB PowerShell cmdlets
- Linux networking commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Using Samba as a server: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/assembly_using-samba-as-a-server_configuring-and-using-network-file-services
- Red Hat Enterprise Linux 9 documentation: Mounting an SMB share: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Samba smb.conf(5) manual page: https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html
- Samba smbstatus(1) manual page: https://www.samba.org/samba/docs/current/man-html/smbstatus.1.html
- Linux mount.cifs(8) manual page: https://www.man7.org/linux/man-pages/man8/mount.cifs.8.html
- Microsoft Learn: Manage SMB Multichannel: https://learn.microsoft.com/en-us/windows-server/storage/storage-spaces/manage-smb-multichannel
- Microsoft Learn: Get-SmbMultichannelConnection: https://learn.microsoft.com/en-us/powershell/module/smbshare/get-smbmultichannelconnection

## Issues Found
- The prerequisites stated that SMB 3.0 or later is the default on RHEL. RHEL documentation states that Samba on RHEL 8.2 and later supports SMB2 and newer by default, while SMB3 is negotiated when supported. Updated the wording to require SMB 3.0 or later support on the client and server.
- The prerequisites implied both interfaces must be on the same network or directly connected. SMB Multichannel requires reachable network paths, which can be same-subnet, routed, or direct. Updated the wording to say reachable network paths.
- The `interfaces` example used `bind interfaces only = yes` without loopback. Samba documentation notes that omitting `127.0.0.1`/loopback can break local tools such as `smbpasswd`. Added `lo` and clarified that binding is for restricting Samba to specific interfaces.
- The Linux client section was labeled as `smbclient`, but the example uses a kernel CIFS mount. Renamed it to kernel CIFS mount and added `vers=3.0` plus a note that the client must support the `multichannel` option.
- The diagram described multiple "sessions". SMB Multichannel creates multiple transport connections/channels for a single authenticated session. Renamed the diagram labels to channels and adjusted the explanation.
- The server verification used `smbstatus -b` as if it showed active channels. The Samba `smbstatus` manual documents brief connection output and JSON session details, but not a reliable selected-channel listing. Updated the server-side check to confirm active SMB3.x session dialects and left Windows `Get-SmbMultichannelConnection` as the channel-specific verification.
- The performance claim promised roughly 2x throughput with two NICs. Updated it to "up to roughly 2x" in ideal conditions because actual results depend on NIC speed, client/server capability, storage, routing, and selected channels.

## Review Notes
The post is technically relevant and valid after the corrections. Future improvements could add a RHEL-specific note to run `testparm` before restarting Samba and to ensure the `samba` firewall service is open on every relevant firewall zone.
