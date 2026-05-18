# Validation Summary: How to Set Up Samba with Guest Access on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Samba (smbd, nmbd, smbclient, smbpasswd, smbstatus, testparm)
- SMB/CIFS protocol
- Ubuntu / Debian (apt package management)
- systemd (systemctl)
- UFW (Uncomplicated Firewall)
- Linux user/group/file permissions (chown, chmod, chgrp, usermod, groupadd)
- Windows registry (LanmanWorkstation EnableInsecureGuestLogons)
- PowerShell (Set-ItemProperty)
- macOS Finder SMB client
- Linux CIFS mount

## Sources Consulted
- Samba official smb.conf manual page: https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html
- Samba smbclient(1): https://www.samba.org/samba/docs/current/man-html/smbclient.1.html
- Samba smbstatus(1): https://www.samba.org/samba/docs/current/man-html/smbstatus.1.html
- Samba smbpasswd(8): https://www.samba.org/samba/docs/current/man-html/smbpasswd.8.html
- Ubuntu Server Samba documentation: https://ubuntu.com/server/docs/service-samba
- Microsoft Learn — Guest access in SMB2 and SMB3 disabled by default: https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/guest-access-in-smb2-is-disabled-by-default
- Linux mount.cifs(8) man page (mount options for cifs)
- UFW application profiles (samba profile under /etc/ufw/applications.d)

## Issues Found
1. **Incorrect comment on the read-only directive** in the `[public]` share definition.
   - Before: `# Read-only - change to yes for writable` with `read only = yes`
   - After: `# Read-only - change to no for writable`
   - Why: `read only = yes` means the share IS read-only. To make it writable, the value must be changed to `no`, not `yes`. The original comment would have produced no effect (re-applying the existing value) and misled the reader.

## Review Notes
- The `map to guest = bad user` directive and `guest account = nobody` are correctly documented per smb.conf(5).
- `min protocol = SMB2` is the correct directive to avoid SMBv1 (deprecated and removed from many clients).
- Windows 10/11 registry key `EnableInsecureGuestLogons` under `HKLM\SYSTEM\CurrentControlSet\Services\LanmanWorkstation\Parameters` as a DWORD with value 1 is correct per Microsoft documentation. This setting reduces security and is appropriate only on trusted networks — the post correctly frames this caveat.
- `sudo ufw allow samba` works because Ubuntu's UFW ships a `samba` application profile that opens ports 137/udp, 138/udp, 139/tcp, and 445/tcp.
- The post references `smbgroup` (in the `[private]` share and chgrp/usermod commands) without explicitly creating it with `groupadd smbgroup`. A reader following step-by-step would need to create the group first (`sudo groupadd smbgroup`). This is a minor omission rather than a technical error and was left unchanged to preserve the author's structure.
- `force create mode`/`force directory mode` and `create mask`/`directory mask` are both used in different examples — both are valid Samba directives with slightly different semantics (force always sets the bits, mask masks the requested permissions). The usage in each example is appropriate.
- The post correctly uses `nogroup` as the default group for `nobody` on Ubuntu (some other distros use `nobody:nobody`).
- Security-considerations section is sound; enabling `EnableInsecureGuestLogons` on Windows is genuinely a security tradeoff and the post acknowledges this.
