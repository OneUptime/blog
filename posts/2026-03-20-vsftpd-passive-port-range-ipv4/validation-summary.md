# Validation Summary: How to Configure vsftpd Passive Port Range for IPv4

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- vsftpd (Very Secure FTP Daemon)
- FTP protocol (RFC 959), PASV mode
- UFW, iptables, firewalld
- Linux netfilter / `nf_conntrack_ftp` helper
- `ss`, `systemctl`, `curl`

## Sources Consulted
- vsftpd.conf(5) man page (pasv_enable, pasv_min_port, pasv_max_port, pasv_address, listen, listen_ipv6)
- RFC 959 (File Transfer Protocol), Section 4.1.2 — PASV 227 response format
- ufw(8) man page — port range syntax with colon
- iptables-extensions(8) — `--dport` port-range syntax
- firewall-cmd(1) — `--add-port` range syntax with hyphen
- curl(1) man page — `--ftp-pasv` flag
- netfilter.org documentation on `nf_conntrack_ftp` helper

## Issues Found

1. **Port count inconsistency in config comment (line 23).** The comment `# Define passive port range (100 ports for up to ~100 concurrent transfers)` was inconsistent with the actual range `pasv_min_port=30000` / `pasv_max_port=31000`, which is 1001 ports (31000 − 30000 + 1). The rest of the post (table entry, firewall rules, curl verification step) all correctly treat the range as 1001 ports. Fixed the comment to say "1001 ports for up to ~1000 concurrent transfers" so it matches the configured values.

2. **Reversed explanation of `nf_conntrack_ftp` role (line 67).** The original text claimed the helper is not strictly required for passive mode and mainly helps with active mode. This is backwards from the server's perspective: on a server with a stateful firewall, the helper's main value is for **passive** mode — it parses the 227 PASV response and creates conntrack expectations so the incoming data connection can be permitted without opening the full passive port range. Rewrote the paragraph to describe the helper's actual role (parsing control-channel PASV/EPSV/PORT commands to create expectations) and to note that when the passive range is already explicitly opened in the firewall, the helper is optional on the server side.

## Review Notes
- `listen=YES` together with `listen_ipv6=NO` is correct for IPv4-only; vsftpd only forbids both being YES simultaneously, not this combination.
- The port-count math in the "Choosing the Right Range Size" table is correct (100, 500, 1001, 5001 inclusive).
- UFW (`30000:31000/tcp`), iptables (`--dport 30000:31000`), and firewalld (`--add-port=30000-31000/tcp`) syntax all match their respective documentation — note the deliberate difference between colon (UFW/iptables) and hyphen (firewalld).
- vsftpd's actual 425 error string is `"425 Failed to establish connection."` — matches what the post tells readers to grep for.
- `grep -E "21|30000"` used in the verification commands will also match substrings (e.g., port 8021, 2130000). This is not technically wrong but could be tightened with word anchors; left as-is because it still serves the sanity-check purpose the author intended.
- `/var/log/vsftpd.log` is a common default (RHEL/CentOS), but on some distros (e.g., Ubuntu with `xferlog_enable=YES` and `xferlog_std_format=YES`) the default is `/var/log/xferlog` or `vsftpd.log` only for the main log. Readers on other distros may need to adjust the path.
