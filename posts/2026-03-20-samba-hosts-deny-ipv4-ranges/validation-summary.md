# Validation Summary: How to Block IPv4 Ranges with Samba hosts deny

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Samba
- SMB/CIFS
- smb.conf
- IPv4 CIDR access control
- testparm
- smbcontrol
- smbclient
- systemd service management

## Sources Consulted
- Samba `smb.conf(5)` official documentation: https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html
- Samba `testparm(1)` official documentation: https://www.samba.org/samba/docs/current/man-html/testparm.1.html
- Samba `smbcontrol(1)` official documentation: https://www.samba.org/samba/docs/current/man-html/smbcontrol.1.html
- Samba `smbclient(1)` official documentation: https://www.samba.org/samba/docs/current/man-html/smbclient.1.html
- Samba official source for host access matching: https://gitlab.com/samba-team/samba/-/raw/master/lib/util/access.c

## Issues Found
- The post said Samba uses "most specific match wins" for `hosts allow` and `hosts deny`. Updated this to state that `hosts allow` takes precedence when both lists are present, matching the official `smb.conf(5)` documentation and Samba's access-matching implementation.
- The global evaluation comments incorrectly said clients matching neither list depend on specificity. Updated the comments to describe Samba's behavior when both lists are set: allowed clients are permitted first, denied clients are rejected next, and clients matching neither list are permitted.
- The blocked-subnet example used `hosts deny = 192.168.1.200/29` together with a broader `hosts allow = 192.168.0.0/16`. Because `hosts allow` takes precedence, that would not block the intended subrange. Replaced it with `hosts allow = ... EXCEPT 192.168.1.200/29` and kept `hosts deny = ALL` for all other traffic.
- The verification example used an `iptables` OUTPUT rule, which would simulate packet dropping rather than Samba host-access denial. Replaced it with `testparm /etc/samba/smb.conf hostname hostIP`, which the official `testparm(1)` documentation supports for checking `hosts allow` and `hosts deny` access decisions.

## Review Notes
- `systemctl restart smb nmb` is syntactically valid, but service unit names vary by distribution. Some systems use `smbd` and `nmbd` instead of `smb` and `nmb`.
