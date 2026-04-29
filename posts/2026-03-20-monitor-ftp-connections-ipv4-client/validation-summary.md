# Validation Summary: How to Monitor FTP Server Connections by IPv4 Client Address

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- vsftpd (Very Secure FTP Daemon)
- pure-ftpd / pure-ftpwho
- xferlog (wu-ftpd standard transfer log format)
- ss (iproute2 socket statistics utility)
- syslog
- fail2ban
- awk / grep / sort (shell text processing)
- FTP protocol (RFC 959), passive mode, IPv4

## Sources Consulted
- xferlog(5) man page — https://linux.die.net/man/5/xferlog
- vsftpd.conf(5) man page — http://vsftpd.beasts.org/vsftpd_conf.html
- ss(8) man page (iproute2)
- fail2ban filter and jail documentation — https://github.com/fail2ban/fail2ban/blob/master/config/jail.conf
- pure-ftpd documentation — https://www.pureftpd.org/project/pure-ftpd/doc/README/
- RFC 959 (File Transfer Protocol)

## Issues Found

1. **Incorrect awk field index for client IP in xferlog parsing.** The standard xferlog format begins with a `ctime()`-formatted date (e.g., `Thu Mar 19 12:00:00 2026`) which is 5 whitespace-separated tokens. When followed by `transfer-time`, `remote-host`, `file-size`, this puts the client IP at `$7` and the byte count at `$8`. The post had these swapped:
   - `awk '{print $8}'` was changed to `awk '{print $7}'` for printing client IPs.
   - `awk '{sum[$8]+=$7} ...'` was changed to `awk '{sum[$7]+=$8} ...'` so bytes (sum) are aggregated by client IP (key).

2. **Incorrect statement in Key Takeaways.** The bullet "the 8th field is the client IP" was inaccurate for awk's default whitespace splitting. Updated to clarify that the date occupies `$1`–`$5`, the client IP is at `$7`, and the byte count is at `$8`.

## Review Notes

- The `ss -tnp | grep ":4[0-9][0-9][0-9][0-9]"` example assumes a passive port range of 40000-49999 (configured via `pasv_min_port`/`pasv_max_port` in vsftpd.conf). Default vsftpd does not restrict the passive range to that block, so this command is illustrative — readers should match their own configured `pasv_*_port` range.
- `syslog_enable=YES` only redirects vsftpd's connection/login log output; it does not redirect xferlog entries, which continue to be written to `xferlog_file` if `xferlog_enable=YES` is set. The inline comment is reasonably accurate but readers should be aware xferlog still goes to its dedicated file.
- The fail2ban variable `%(vsftpd_log)s` is defined in fail2ban's default `jail.conf` and resolves to the vsftpd log path on the host (typically `/var/log/vsftpd.log` or auto-detected via `JOURNAL`). On systems where vsftpd uses systemd journal exclusively, the `vsftpd_backend` may need adjustment.
- FTP transmits credentials in plaintext over IPv4. While not a technical correctness issue, security-conscious readers should consider FTPS (TLS) or SFTP (SSH) instead of plain FTP for production use.
