# Validation Summary: How to Set Up FTP Access Control by IPv4 Address in vsftpd

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- vsftpd (Very Secure FTP Daemon)
- TCP wrappers (libwrap, /etc/hosts.allow, /etc/hosts.deny)
- iptables / nftables (Linux firewall)
- PAM (pam_access.so, /etc/security/access.conf)
- systemd (systemctl)

## Sources Consulted
- vsftpd.conf(5) man page — http://vsftpd.beasts.org/vsftpd_conf.html
- hosts_access(5) man page — https://linux.die.net/man/5/hosts_access
- hosts.allow(5) man page — https://linux.die.net/man/5/hosts.allow
- access.conf(5) man page — https://linux.die.net/man/5/access.conf
- pam_access(8) man page — https://man7.org/linux/man-pages/man8/pam_access.8.html
- iptables(8) man page
- Fedora TCP Wrappers deprecation notice — https://fedoraproject.org/wiki/Changes/Deprecate_TCP_wrappers

## Issues Found

1. **Incorrect default for `tcp_wrappers` directive** — The original comment read `# Enable TCP wrappers (usually default YES)`. Per the official vsftpd.conf(5) man page the default is `NO`; distributions such as RHEL override it to `YES`, but that is distro-specific, not the upstream default. Updated the comment to `# Enable TCP wrappers (vsftpd default is NO; many distros override)` so readers don't rely on an assumption that may not hold.

2. **CIDR notation in `/etc/hosts.allow`** — The original example used `vsftpd: 192.168.1.0/24`. Per hosts_access(5), the `/prefixlen` form is officially supported only for IPv6 addresses; for IPv4 the documented, portable form is `network/netmask` (e.g. `192.168.1.0/255.255.255.0`). Replaced the IPv4 CIDR form with the netmask form and added a brief inline comment explaining why. The single-host entry (`203.0.113.5`) was already valid and was left alone.

## Review Notes
- TCP wrappers (libwrap) is deprecated in newer distributions (Fedora 28+ removed it from the base install). The post already positions iptables/nftables as more reliable, which is consistent with current best practice. A future revision could explicitly note that TCP wrappers is legacy and may be unavailable on newer systems.
- FTP itself is a cleartext protocol; even with IPv4 access control, credentials and data travel unencrypted. The post is about access control scope so this is out of scope, but readers should be steered to FTPS/SFTP for production use.
- The iptables rules are correct but stateless. For production use, a `-m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT` rule is typically required earlier in the chain so responses to permitted connections are not dropped.
- The `ftp` client used in the "Testing Access Control" section may not be installed by default on modern distributions; `lftp` or `curl` are common alternatives.
- The `/var/log/vsftpd.log` path assumes `xferlog_std_format=NO` with `vsftpd_log_file` at its default; the log location is configuration-dependent.
