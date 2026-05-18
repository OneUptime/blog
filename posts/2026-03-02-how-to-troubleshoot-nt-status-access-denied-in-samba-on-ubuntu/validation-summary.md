# Validation Summary: How to Troubleshoot 'NT_STATUS_ACCESS_DENIED' in Samba on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Samba (smbd, smbclient, smbpasswd, smbcontrol, pdbedit, testparm)
- Ubuntu Linux
- SMB/CIFS protocol
- AppArmor (Mandatory Access Control)
- POSIX ACLs (getfacl, setfacl)
- Unix filesystem permissions
- systemd (systemctl)

## Sources Consulted
- Samba official documentation: https://www.samba.org/samba/docs/
- smbclient(1) man page: https://www.samba.org/samba/docs/current/man-html/smbclient.1.html
- smb.conf(5) man page: https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html
- smbcontrol(1) man page: https://www.samba.org/samba/docs/current/man-html/smbcontrol.1.html
- pdbedit(8) man page: https://www.samba.org/samba/docs/current/man-html/pdbedit.8.html
- smbpasswd(8) man page: https://www.samba.org/samba/docs/current/man-html/smbpasswd.8.html
- testparm(1) man page: https://www.samba.org/samba/docs/current/man-html/testparm.1.html
- Ubuntu AppArmor documentation: https://ubuntu.com/server/docs/apparmor
- Ubuntu Samba guide: https://ubuntu.com/server/docs/samba-introduction
- acl(5) man page (POSIX ACLs)
- namei(1) man page
- AppArmor profile locations on Ubuntu (/etc/apparmor.d/, /etc/apparmor.d/local/)

## Issues Found
No technical issues found. All commands, flags, file paths, and configuration syntax verified against official documentation:

- `smbclient //host/share -U username` syntax is correct.
- `pdbedit -L -v` correctly lists users with verbose output.
- `smbpasswd -a` (add user) and `smbpasswd -e` (enable account) are correct flags.
- `namei -l` correctly displays permissions along the path.
- `testparm -s` correctly suppresses the "Press enter" prompt.
- Samba share parameters (`valid users`, `read only`, `write list`, `browseable`) are correctly described.
- `valid users = user @group` syntax with `@` for Unix groups is correct.
- `smbcontrol smbd reload-config` is the correct mechanism for reloading without dropping connections.
- AppArmor profile paths (`/etc/apparmor.d/usr.sbin.smbd` and `/etc/apparmor.d/local/usr.sbin.smbd`) are standard on Ubuntu's Samba packages.
- `apparmor_parser -r` correctly reloads a profile.
- `aa-complain` / `aa-enforce` commands and their semantics are correct.
- ACL syntax with `setfacl -m u:user:rwx` and `setfacl -d -m` (default ACL for new files) is correct.
- Samba log file naming (`log.smbd`, `log.<client>`) matches Samba behavior.
- `smbcontrol smbd debuglevel` accepts 0-10 (5 is a valid verbose level).
- The behavioral claim that AppArmor's `EACCES` translates to `NT_STATUS_ACCESS_DENIED` is accurate.
- Distinction between `NT_STATUS_ACCESS_DENIED` (authorization) and `NT_STATUS_LOGON_FAILURE` (authentication) is correct.

## Review Notes
- The post's description mentions "SELinux/AppArmor" but only AppArmor is covered in the body. This is acceptable since Ubuntu defaults to AppArmor (not SELinux), and the body correctly focuses on AppArmor; the description is a minor framing choice rather than a technical error.
- On more recent Ubuntu releases that use journald, `journalctl -k | grep apparmor` may be preferable to `dmesg | grep apparmor` for persisted boot logs, but `dmesg` still works and `/var/log/syslog` is still populated by rsyslog when installed (it is installed by default on Ubuntu server).
- The default Samba `log level` is typically 0, so resetting to 1 (as shown) is a reasonable low/normal level — not strictly the original, but harmless.
- The `chmod 755` example for guest access via `nobody` user is correct, but in modern Samba configurations using `force user` or `guest ok = yes`, additional `map to guest` smb.conf settings may also be needed; this is outside the scope of this troubleshooting guide.
