# Validation Summary: How to Troubleshoot Samba Connection and Permission Issues on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Samba server services and utilities
- firewalld
- SELinux
- Windows SMB client commands
- PowerShell network diagnostics

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Using Samba as a server": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/assembly_using-samba-as-a-server_configuring-and-using-network-file-services
- Red Hat Enterprise Linux 9 documentation, "Using SELinux": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Samba `pdbedit(8)` manual: https://www.samba.org/samba/docs/current/man-html/pdbedit.8.html
- Samba `smbpasswd(8)` manual: https://www.samba.org/samba/docs/current/man-html/smbpasswd.8.html
- Samba `smbclient(1)` manual: https://www.samba.org/samba/docs/current/man-html/smbclient.1.html
- Samba `testparm(1)` manual: https://www.samba.org/samba/docs/current/man-html/testparm.1.html
- Samba `smbstatus(1)` manual: https://www.samba.org/samba/docs/current/man-html/smbstatus.1.html
- Microsoft Learn, `Test-NetConnection`: https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection
- Microsoft Learn, `net use`: https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/gg651155(v=ws.11)

## Issues Found
- The filesystem permission test used `smbuser` while the rest of the post used `username`. Changed it to `sudo -u username ...` so the example consistently tests the operating-system account that backs the Samba user.
- The Windows troubleshooting block was marked as `cmd` and used `REM` comments, but it included `Test-NetConnection`, which is a PowerShell cmdlet. Changed the block to `powershell` and replaced `REM` with PowerShell comments.
- The `pdbedit` examples for checking one user's details were not using the documented `-u username` filter. Updated them to `sudo pdbedit -L -v -u username ...`.
- The firewall quick fix added the permanent Samba service but did not reload firewalld, so it would not take effect immediately. Added `sudo firewall-cmd --reload`.
- The SELinux quick fix recommended the broad `samba_export_all_rw` boolean. Replaced it with the RHEL-documented `samba_share_t` file-context mapping plus `restorecon` for a normal share path.
- The wrong-file-context quick fix omitted `sudo`. Added it because relabeling share paths usually requires root privileges.

## Review Notes
The remaining commands and configuration examples are consistent with RHEL 9 Samba guidance and current Samba utility manuals. Some examples are necessarily environment-dependent, such as the exact share name, path, firewall zone, and whether `nmb` is needed for NetBIOS name service in a DNS-based SMB network.
