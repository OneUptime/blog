# Validation Summary: How to Configure ProFTPD Passive Mode for IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- ProFTPD
- FTP passive mode (`PASV`/`EPSV`)
- IPv4 NAT and port forwarding
- Linux firewalling with `ufw` and `iptables`
- Linux connection tracking with `nf_conntrack_ftp`
- FTP client testing with `lftp`, `curl`, and `ftp`
- Socket inspection with `ss`

## Sources Consulted
- ProFTPD `mod_core` directive reference: https://www.proftpd.org/docs/modules/mod_core.html
- ProFTPD DNS howto: https://www.proftpd.org/docs/howto/DNS.html
- ProFTPD FXP howto: https://www.proftpd.org/docs/howto/FXP.html
- ProFTPD `mod_sftp` documentation: https://www.proftpd.org/docs/contrib/mod_sftp.html
- ProFTPD Logging howto: https://www.proftpd.org/docs/howto/Logging.html
- RFC 959: File Transfer Protocol: https://www.rfc-editor.org/rfc/rfc959
- curl man page: https://curl.se/docs/manpage.html?force_isolation=true
- libcurl FTP passive-mode defaults: https://curl.se/libcurl/c/CURLOPT_FTPPORT.html and https://curl.se/libcurl/c/CURLOPT_FTP_USE_EPSV.html
- lftp manual: https://lftp.yar.ru/lftp-man.html
- `ss(8)` man page: https://man7.org/linux/man-pages/man8/ss.8.html

## Issues Found
- The introduction implied the problem was clients being behind NAT. I corrected this to the server-behind-NAT case, which is what `MasqueradeAddress` addresses in `PASV`/`EPSV` responses.
- The config example used `ServerAddress 203.0.113.10`. I replaced it with `DefaultAddress 10.0.0.5` because current ProFTPD documentation uses `DefaultAddress` for the main server bind address, and the NAT example later in the post clearly uses `10.0.0.5` as the server's private address.
- The dynamic DNS note said to "use a script to update if IP changes" without stating that ProFTPD resolves DNS names at startup. I changed it to say the DNS record must be updated and ProFTPD restarted when the IP changes.
- The NAT gateway example forwarded only the passive data range. I added the missing DNAT rule for TCP port 21 and clarified that the gateway must forward both the control port and the passive range.
- The connection-tracking section said `nf_conntrack_ftp` also helps with FTPS. I corrected that guidance to describe the helper as relevant only when the firewall relies on RELATED FTP data connections, which is common with active mode; FTPS control traffic is encrypted, so helpers cannot parse it the same way.
- The troubleshooting section paired `proftpd --configtest` with a filesystem permission problem. I relabeled that item so the command is used for configuration validation, which is what it actually checks.
- The final troubleshooting command read `/proc/.../net/tcp6`, which is not an appropriate IPv4-focused check here. I replaced it with an IPv4-specific `ss` command that shows control and passive-port socket state directly.

## Review Notes
- `PassivePorts 30000 31000` is valid, but ProFTPD recommends using a sufficiently large passive range to reduce the chance of port exhaustion under concurrent transfers.
- `curl` uses passive FTP by default and may try `EPSV` before falling back to `PASV`; the article's `curl` test remains valid for checking passive-mode behavior.
- Persisting `nf_conntrack_ftp` via `/etc/modules` is Debian/Ubuntu-style configuration and may differ on other Linux distributions.
