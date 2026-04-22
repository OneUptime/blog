# Validation Summary: How to Restrict Samba Access by IPv4 Subnet Using hosts allow

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Samba SMB/CIFS server
- Samba `smb.conf` host-based access controls
- IPv4 addresses, subnets, and netmasks
- Samba command-line tools: `smbclient`, `smbstatus`, `smbcontrol`
- Linux `iptables`

## Sources Consulted
- Samba `smb.conf(5)` manual, including `hosts allow`, `hosts deny`, global versus service parameters, `EXCEPT`, and whitelist behavior: https://www.samba.org/samba/samba/docs/man/manpages/smb.conf.5.html
- Samba security release note with official `hosts allow` CIDR examples and SMB port list: https://www.samba.org/samba/history/samba-2.2.12.html
- Samba `smbclient(1)` manual, including `-L` and `-U` syntax: https://www.samba.org/samba/docs/current/man-html/smbclient.1.html
- Samba `smbstatus(1)` manual, current connection reporting behavior: https://www.samba.org/samba/docs/current/man-html/smbstatus.1.html
- Samba `smbcontrol(1)` manual, `smbd` destination and `reload-config` message: https://www.samba.org/samba/docs/current/man-html/smbcontrol.1.html
- Local `iptables --help` output for `-A`, `-p`, `--dport`, `-s`, and `-j` rule syntax.

## Issues Found
- The introduction and conclusion described all `hosts allow` / `hosts deny` use as connection-level access control before authentication. Samba documents these as service parameters that can be set globally or per share, so I clarified that global rules act at the connection level while per-share rules are checked when the share is accessed.
- The `smbclient -L` example used `//10.0.0.5` as the list target. The Samba manual documents `-L` as taking a host argument, so I changed it to `smbclient -L 10.0.0.5 -U username`.
- The blocked-client test comment suggested source routing and listed overly specific expected errors. I changed it to recommend testing from another host or network namespace and noted that the exact error varies by client and firewall behavior.
- The conclusion called the combined approach a "complete" defense-in-depth security model. I changed this to "stronger" because host controls and firewalling are only part of a complete Samba security posture.

## Review Notes
- Samba client/server binaries such as `testparm`, `smbclient`, `smbstatus`, and `smbcontrol` were not installed in the local environment, so those examples were verified against official Samba manuals rather than executed locally.
- The upstream `smb.conf(5)` manual says that where `hosts allow` and `hosts deny` conflict, the allow list takes precedence, and it explicitly documents using `hosts deny = ALL` with explicit allow entries as a deny-by-default pattern.
- The `iptables` examples are syntactically valid for IPv4, but many current distributions front iptables with nftables or prefer firewalld/nftables rules for persistent firewall management.
