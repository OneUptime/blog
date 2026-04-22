# Validation Summary: How to Configure SAMBA/SMB with IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Samba SMB/CIFS server
- SMB2 and SMB3 protocol configuration
- Linux CIFS client and `mount.cifs`
- Windows UNC paths and IPv6 literal names
- IPv6 firewalling with `ip6tables`
- Linux networking tools: `ss`, `tcpdump`

## Sources Consulted
- Samba 3.6 release announcement, IPv6 support statement: https://www.samba.org/samba/news/releases/3.6.0.html
- Samba `smb.conf(5)` manual, including `interfaces`, `bind interfaces only`, protocol, and security parameters: https://www.samba.org/samba/samba/docs/man/manpages/smb.conf.5.html
- Samba `smbclient(1)` manual, service names, `-L`, `-U`, and `-N` options: https://www.samba.org/samba/docs/current/man-html/smbclient.1.html
- Samba `smbstatus(1)` manual, `--processes` behavior: https://www.samba.org/samba/docs/current/man-html/smbstatus.1.html
- Linux `mount.cifs(8)` manual, `//server/share` service syntax and `ip=arg|addr=arg` option: https://man7.org/linux/man-pages/man8/mount.cifs.8.html
- Linux kernel CIFS client usage documentation, SMB dialect defaults and mount options: https://docs.kernel.org/admin-guide/cifs/usage.html
- Microsoft [MS-DTYP] UNC specification, IPv6 `.ipv6-literal.net` host-name format: https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-dtyp/62e862f4-2a51-452e-8eeb-dc4ff5ee33cc
- Microsoft Direct-hosted SMB over TCP/IP documentation, SMB/NetBIOS port usage: https://learn.microsoft.com/en-US/troubleshoot/windows-server/networking/direct-hosting-of-smb-over-tcpip
- Local command help for `ss` and `ip6tables`; local `ip6tables-restore --test` parsing for firewall rule syntax.

## Issues Found
- The `smb.conf` example wrapped an IPv6 address in square brackets. Brackets are used in URI/UNC contexts, not in Samba's `interfaces` directive. I changed `interfaces = lo eth0 [2001:db8::10]` to `interfaces = lo eth0 2001:db8::10`.
- Linux `smbclient` and CIFS mount examples used bracketed IPv6 literals. The documented Samba/mount.cifs service form is `//server/share`; I changed the Linux examples to unbracketed IPv6 literals and kept `addr=2001:db8::10` for the CIFS mount.
- The post described NetBIOS and SMB ports as IPv6 firewall requirements and expected `[::]:139`. Modern IPv6 SMB access should use direct-hosted SMB over TCP/445; NetBIOS name service ports are legacy NetBIOS over TCP/IP behavior and are not normally used for IPv6 SMB access. I corrected the explanation, verification comment, firewall rules, and conclusion.
- The firewall examples used `2001:db8:clients::/48`, which is not a valid IPv6 prefix. Local `ip6tables-restore --test` rejected it. I replaced it with the valid documentation prefix `2001:db8:100::/48`.
- The firewall section opened TCP/445 without the trusted-source restriction after first showing source-restricted rules. I removed the broad allow rule so the example remains scoped to trusted IPv6 clients.
- The persistence path `/etc/ip6tables/rules.v6` is not the common iptables-persistent path. I changed the example to `/etc/iptables/rules.v6` and labeled it as Debian/Ubuntu iptables-persistent behavior.
- `smbstatus --processes` was described as checking network bindings, but the Samba manual says it prints active `smbd` processes. I corrected the comment.
- The verification command combined `-U sambauser` with `-N`, which suppresses password prompting and is misleading for a password-protected user share. I removed `-N` and changed the comment to say the command prompts for the Samba password.

## Review Notes
- Samba client/server binaries such as `testparm`, `smbclient`, and `mount.cifs` were not installed in the local environment, so those examples were verified against official manuals rather than executed locally.
- `systemctl restart smbd nmbd` service names vary by distribution; some systems use `smb`/`nmb` or a different Samba service layout.
- Many current distributions front `ip6tables` with nftables or use firewalld/nftables directly. The `ip6tables` examples are still syntactically valid, but a future update could add distro-specific firewall examples.
- The mount examples keep inline passwords to match the original tutorial style. A production-focused version should prefer a protected credentials file.
