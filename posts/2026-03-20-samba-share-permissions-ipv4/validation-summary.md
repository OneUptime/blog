# Validation Summary: How to Configure Samba Share Permissions for IPv4 Clients

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Samba
- SMB/CIFS file sharing
- IPv4 host access controls
- Samba share configuration
- Linux filesystem permissions
- Linux user and group management
- systemd service reloads

## Sources Consulted
- Samba `smb.conf(5)` current man page: https://www.samba.org/samba/samba/docs/man/manpages/smb.conf.5.html
- SambaWiki, "Configure Samba to Bind to Specific Interfaces": https://wiki.samba.org/index.php/Configure_Samba_to_Bind_to_Specific_Interfaces
- Samba `smbpasswd(8)` current man page: https://www.samba.org/samba/docs/current/man-html/smbpasswd.8.html
- Samba `pdbedit(8)` current man page: https://www.samba.org/samba/docs/current/man-html/pdbedit.8.html
- Samba `testparm(1)` current man page: https://www.samba.org/samba/docs/current/man-html/testparm.1.html
- Samba `smbclient(1)` current man page: https://www.samba.org/samba/docs/current/man-html/smbclient.1.html
- GNU Coreutils `chmod` documentation: https://www.gnu.org/software/coreutils/manual/html_node/chmod-invocation.html
- GNU Coreutils `chown` documentation: https://www.gnu.org/software/coreutils/manual/html_node/chown-invocation.html
- Local `groupadd --help` and `usermod --help` output from the installed shadow-utils commands

## Issues Found
- The `[data]` share used `write list = @data-writers, admin`, but the setup commands did not create a `data-writers` group or add the test user to it. Changed the write list to `@samba, admin` so it matches the created `samba` group and the later `usermod -aG samba john` command.
- The comment above `create mask` and `directory mask` said these settings force exact creation permissions. Samba applies these masks with a bitwise AND and uses `force create mode` / `force directory mode` for bits that must always be set. Updated the comment to describe them as maximum permissions.
- The `[projects]` example included an empty `invalid users =` setting under a comment saying users outside the group are denied. An empty `invalid users` list does not perform that denial; `valid users = @devteam` does. Removed the misleading no-op setting.

## Review Notes
- The Samba utilities were not installed in this workspace, so `testparm` could not be run locally. Configuration options and command syntax were reviewed against current Samba documentation instead.
- `systemctl reload smb` is distribution-specific; many Debian/Ubuntu systems use `smbd` as the unit name, while Red Hat-family systems commonly use `smb`.
- `smbclient -U john%password` is supported syntax, but Samba documents that passing passwords on the command line has exposure risk. Prompted passwords or credential files are safer for real use.
