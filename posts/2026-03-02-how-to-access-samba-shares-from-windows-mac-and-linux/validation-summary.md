# Validation Summary: How to Access Samba Shares from Windows, Mac, and Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Samba
- SMB/CIFS
- Windows File Explorer and `net use`
- macOS Finder and `mount_smbfs`
- Linux `smbclient`, `mount.cifs`, `/etc/fstab`, `pam_mount`
- Ubuntu `ufw`

## Sources Consulted
- Samba `smb.conf` official man page: https://www.samba.org/samba/docs/4.21/man-html/smb.conf.5.html
- Samba `smbclient` official man page: https://www.samba.org/samba/docs/current/man-html/smbclient.1.html
- Linux `mount.cifs` man page: https://man7.org/linux/man-pages/man8/mount.cifs.8.html
- Microsoft `net use` command documentation: https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/gg651155(v=ws.11)
- Microsoft SMBv1 default behavior documentation: https://learn.microsoft.com/en-us/windows-server/storage/file-server/troubleshoot/smbv1-not-installed-by-default-in-windows
- Apple macOS Login Items documentation: https://support.apple.com/en-euro/guide/mac-help/-mh15189/mac
- Apple/macOS `mount_smbfs` man page mirror from Xcode man pages: https://keith.github.io/xcode-man-pages/mount_smbfs.8.html
- Ubuntu Server `ufw` firewall documentation: https://ubuntu.com/server/docs/how-to/security/firewalls/
- systemd `systemd.mount` documentation for `_netdev`: https://www.freedesktop.org/software/systemd/man/253/systemd.mount.html

## Issues Found
- The introduction said SMB was available on macOS through additional packages. macOS supports SMB natively through Finder and `mount_smbfs`, so the wording was corrected to say Windows and macOS have native support while Linux uses additional packages.
- The Windows command block was labeled for `cmd` but used `#` comments, which are not valid comments in `cmd.exe`. The inline comments were removed from the command block.
- The macOS automatic reconnect path used the older System Preferences > Users & Groups > Login Items location. It was updated to the current System Settings > General > Login Items & Extensions path.

## Review Notes
The remaining commands and configuration snippets are consistent with the consulted documentation. The `min protocol = SMB2` example is valid because Samba documents `min protocol` as a synonym for `server min protocol`; current Samba defaults already use SMB2_02 or newer, but the explicit setting is still acceptable for clarity. The `server signing = auto` note is technically valid for relaxing mandatory signing, but SMB2 signing cannot be fully disabled by design.
