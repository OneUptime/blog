# Validation Summary: How to Configure Samba to Bind to a Specific IPv4 Address

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Samba
- smb.conf
- SMB/CIFS
- IPv4 interface binding
- Linux user and group management
- Linux socket inspection with ss

## Sources Consulted
- Samba smb.conf manual page: https://www.samba.org/samba/samba/docs/man/manpages/smb.conf.5.html
- SambaWiki, Configure Samba to Bind to Specific Interfaces: https://wiki.samba.org/index.php/Configure_Samba_to_Bind_to_Specific_Interfaces
- Samba testparm manual page: https://www.samba.org/samba/docs/current/man-html/testparm.1.html
- Samba smbpasswd manual page: https://www.samba.org/samba/docs/current/man-html/smbpasswd.8.html
- Samba smbclient manual page: https://www.samba.org/samba/docs/current/man-html/smbclient.1.html
- Samba nmblookup manual page: https://www.samba.org/samba/docs/4.19/man-html/nmblookup.1.html
- Samba smbstatus manual page: https://www.samba.org/samba/docs/current/man-html/smbstatus.1.html
- Linux useradd manual page: https://man7.org/linux/man-pages/man8/useradd.8.html
- Linux usermod manual page: https://man7.org/linux/man-pages/man8/usermod.8.html

## Issues Found
- The "Using Interface Names" example defined `interfaces` twice in the same `[global]` block. The second active setting would be the effective value, so the alternate mixed interface/IP example was changed to a commented example.
- The share example used `valid users = @sambausers` but did not add `sambauser` to the `sambausers` group. Added `sudo usermod -aG sambausers sambauser` so the created user can access the share.
- The `ss` verification comment said `0.0.0.0:445` could be expected. For `smbd` with `bind interfaces only = yes`, Samba should bind to the configured interface addresses, so the expected output was corrected to `10.0.0.5:445` and loopback when included.

## Review Notes
- Samba documentation distinguishes `smbd` file service binding from `nmbd` NetBIOS name service behavior. `nmbd` may still bind wildcard UDP sockets for broadcast handling, while `smbd` is restricted to the configured interface list when `bind interfaces only = yes`.
- Service names vary by distribution. `systemctl restart smbd nmbd` is common on Debian/Ubuntu-style packages; other distributions may use different unit names.
