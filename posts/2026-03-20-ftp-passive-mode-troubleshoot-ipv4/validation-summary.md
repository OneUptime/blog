# Validation Summary: How to Troubleshoot FTP Passive Mode Issues on IPv4

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- FTP
- PASV / EPSV
- IPv4
- NAT
- Linux firewalls
- vsftpd
- ProFTPD
- Pure-FTPd
- iptables
- nftables
- firewalld

## Sources Consulted
- RFC 959, "File Transfer Protocol": https://datatracker.ietf.org/doc/html/rfc0959
- RFC 2428, "FTP Extensions for IPv6 and NATs": https://www.rfc-editor.org/rfc/rfc2428
- RFC 4217, "Securing FTP with TLS": https://www.rfc-editor.org/rfc/rfc4217
- vsftpd configuration reference (`vsftpd.conf`): https://security.appspot.com/vsftpd/vsftpd_conf.html
- ProFTPD `mod_core` directives (`MasqueradeAddress`, `PassivePorts`): https://www.proftpd.org/docs/modules/mod_core.html
- Pure-FTPd upstream README and option reference (`--passiveportrange`, `--forcepassiveip`): https://github.com/jedisct1/pure-ftpd
- firewalld helper documentation: https://firewalld.org/documentation/helper/
- firewalld service documentation: https://firewalld.org/documentation/man-pages/firewalld.service.html
- firewalld service examples (`ftp` service): https://firewalld.org/documentation/service/examples.html
- Linux kernel conntrack sysctl documentation (`nf_conntrack_helper`): https://docs.kernel.org/5.17/networking/nf_conntrack-sysctl.html
- nftables man page (`ct helper` example): https://www.netfilter.org/projects/nftables/manpage.html
- Local man pages / help output consulted for command syntax: `curl(1)`, `ftp(1)`, `nft(8)`, `iptables-extensions(8)`

## Issues Found
- The `vsftpd` dynamic-IP note implied hostname resolution would keep tracking a changing public IP. The official `vsftpd.conf` documentation says `pasv_address` hostnames are resolved at startup, so I clarified that behavior and added the restart requirement.
- The NAT port-forwarding example only showed DNAT rules. On a Linux router with filtering enabled, forwarding also requires `FORWARD` chain acceptance, so I added the missing rules.
- The `nf_conntrack_ftp` section incorrectly claimed the helper automatically handles PASV port forwarding. Kernel and firewalld documentation show that automatic helper assignment is disabled by default on modern Linux, so I rewrote the section to describe the helper more accurately and to avoid implying it replaces correct PASV IP/port configuration.
- The passive-mode test command for `curl` used the default EPSV-first behavior even though the post is specifically about IPv4 PASV troubleshooting. I changed the example to `--disable-epsv` so it forces PASV for IPv4 testing.
- The `ftp -p` example used a deprecated tnftp option. I replaced it with the non-deprecated default-invocation example and qualified it as the BSD/tnftp client behavior.
- The best-practices section incorrectly grouped FTPS with SFTP as an alternative without passive-mode complexity. RFC 4217 still uses FTP data connections, including PASV/EPSV workflows, so I corrected that recommendation.

## Review Notes
- Pure-FTPd upstream documentation describes passive-mode settings as command-line options (`--passiveportrange` and `--forcepassiveip`). The post uses the common Debian/Ubuntu `/etc/pure-ftpd/conf/` layout, which is packaging-specific but maps to those upstream options.
- EPSV is the preferred passive mechanism when clients and servers support it, especially across NAT, because RFC 2428 avoids embedding an IPv4 address in the passive response.
