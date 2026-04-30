# Validation Summary: How to Troubleshoot FTP Passive Mode Connection Issues on IPv4

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- FTP passive mode (`PASV`)
- vsftpd
- ProFTPD
- Linux `iptables` / netfilter connection tracking
- NAT / port forwarding
- `tcpdump`

## Sources Consulted
- RFC 959, File Transfer Protocol: https://www.rfc-editor.org/rfc/rfc959.html
- vsftpd configuration reference (`vsftpd.conf`): https://security.appspot.com/vsftpd/vsftpd_conf.html
- ProFTPD `mod_core` directive reference (`MasqueradeAddress`, `PassivePorts`): https://www.proftpd.org/docs/modules/mod_core.html
- Linux kernel `nf_conntrack` sysctl documentation: https://docs.kernel.org/5.17/networking/nf_conntrack-sysctl.html
- `iptables-extensions(8)` documentation for `CT` and `conntrack` matching: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Local `iptables -j CT --help`
- Local `pcap-filter(7)` man page

## Issues Found
- The post treated `nf_conntrack_ftp` as if it were generally required for passive FTP. I corrected that to explain that the FTP helper is only needed when the firewall or NAT relies on helper-assigned `RELATED` handling.
- The post recommended enabling `net.netfilter.nf_conntrack_helper=1` when helper auto-assignment was disabled. Current kernel documentation says the default is disabled and points readers to explicit helper assignment with the `CT` target, so I replaced the global sysctl advice with `iptables -t raw ... -j CT --helper ftp`.
- The NAT example only added `PREROUTING` DNAT rules. I added `FORWARD` rules, including an `ESTABLISHED,RELATED` conntrack rule, because DNAT alone does not permit forwarded traffic through a restrictive gateway policy.
- The packet-capture interpretation was too narrow. I clarified that missing SYNs can also mean the traffic never reached the server, and that missing SYN-ACKs can also mean the server is not listening on that passive port.
- The quick-fix example used the older `-m state --state ...` syntax. I updated it to `-m conntrack --ctstate ...` to align it with current iptables documentation.

## Review Notes
- The ProFTPD configuration path shown in the post is distro-specific; official ProFTPD documentation describes `/etc/proftpd.conf` or `/usr/local/etc/proftpd.conf` as common defaults, while Debian/Ubuntu packages often use `/etc/proftpd/proftpd.conf`.
- The commands remain valid with current `iptables` userspace, including `iptables-nft` backends, but systems managed directly with native `nftables` rules would need equivalent nft syntax.
