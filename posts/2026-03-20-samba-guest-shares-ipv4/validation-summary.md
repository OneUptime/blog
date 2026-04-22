# Validation Summary: How to Set Up Samba Guest Shares Accessible Over IPv4

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Samba / SMB
- Samba `smb.conf`
- Guest SMB shares
- IPv4 host and interface restrictions
- Linux user and directory permissions
- `smbclient`
- Linux CIFS mounts
- systemd service management

## Sources Consulted
- Samba `smb.conf(5)` manual: https://www.samba.org/samba/samba/docs/man/manpages/smb.conf.5.html
- Samba `smbclient(1)` manual: https://www.samba.org/samba/samba/docs/man/manpages/smbclient.1.html
- Samba `testparm(1)` manual: https://www.samba.org/samba/samba/docs/man/manpages/testparm.1.html
- Samba configuration file syntax documentation: https://www.samba.org/samba/docs/using_samba/ch06.html
- SambaWiki interface binding guidance: https://wiki.samba.org/index.php/Configure_Samba_to_Bind_to_Specific_Interfaces
- Linux kernel CIFS client usage documentation: https://docs.kernel.org/admin-guide/cifs/usage.html
- Local command help for `useradd`, `chmod`, `getent`, and `systemctl`

## Issues Found
- Fixed an invalid inline `smb.conf` comment on `write list`. Samba comments must be on their own line; otherwise the comment text can become part of the parameter value.
- Corrected the drop-box wording and permissions. The original text claimed guests could not read or delete other users' files, but anonymous guests forced to one Unix account do not get per-client ownership isolation. The directory is now owned by `root:samba-guest` with mode `1730` so the forced group can create/traverse without listing the directory.
- Clarified that `map to guest = bad user` maps unknown usernames to the guest account; it does not map bad passwords for existing users.
- Made the `smbclient` anonymous test explicit with `-N`, and added an empty username/password variant using `-U%`.
- Added a note that Samba systemd service names vary by distribution; `smb nmb` is common on RHEL-like systems, while Debian/Ubuntu commonly use `smbd nmbd`.

## Review Notes
Samba client/server tools were not installed in this local environment, so `testparm` and `smbclient` were verified against official Samba manuals rather than executed locally. The article is now technically accurate for a general Samba file-server setup, but a production guest share should still be paired with firewall controls and audited against the target distribution's Samba package defaults.
