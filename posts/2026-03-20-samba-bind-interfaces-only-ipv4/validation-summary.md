# Validation Summary: How to Use bind interfaces only in Samba for IPv4-Only Listening

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Samba
- SMB/CIFS
- smbd
- nmbd / NetBIOS over TCP/IP
- smb.conf
- Linux systemd service management
- Linux socket inspection with ss

## Sources Consulted
- Samba current `smb.conf(5)` manual: https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html
- Samba current `testparm(1)` manual: https://www.samba.org/samba/docs/current/man-html/testparm.1.html
- Samba current `smbclient(1)` manual: https://www.samba.org/samba/docs/current/man-html/smbclient.1.html
- SambaWiki, "Configure Samba to Bind to Specific Interfaces": https://wiki.samba.org/index.php/Configure_Samba_to_Bind_to_Specific_Interfaces
- Local `ss --help` output for `-t`, `-u`, `-l`, `-n`, and `-p` option validation.
- Local `systemctl --help` output for `restart` and `status` command validation.

## Issues Found
- The post stated that `bind interfaces only = yes` makes both `smbd` and `nmbd` only create sockets on listed interfaces. Samba documents different behavior for `nmbd`: it binds listed interfaces but also opens wildcard UDP sockets for NetBIOS broadcasts and filters packets by source address. Updated the explanation and verification notes to reflect this.
- The example used interface names such as `lo` and `eth0` while describing strict IPv4-only listening. Interface names can include IPv6 addresses on that interface, so the examples now use explicit IPv4 addresses: `127.0.0.1` and `10.0.0.5`.
- The snippet claimed `dns proxy = no` disables IPv6. Samba documents `dns proxy` as an `nmbd` WINS-to-DNS lookup behavior, not an IPv6 control. Removed that setting from the IPv4 binding example.
- The verification section expected only TCP port 445. Samba's default SMB transports include normal SMB over TCP and NetBIOS session service, so `smbd` can listen on both 445 and 139 unless configured otherwise. Updated the expected `ss` output comments.
- The verification commands used `smbclient -L //host`. The current Samba manual documents `smbclient -L host`, so the examples now use that form.
- The service-management section recommended reloads for interface-binding changes. Binding changes require listening sockets to be recreated, and SambaWiki instructs restarting Samba services after configuring specific interfaces. Updated the section to use `systemctl restart smbd nmbd`.

## Review Notes
The local environment did not have Samba client/server tools installed, so `testparm` and `smbclient` command behavior was validated against Samba's current official man pages rather than local binaries. Service names can vary by Linux distribution, but `smbd` and `nmbd` are valid common unit names and match the post's existing scope.
