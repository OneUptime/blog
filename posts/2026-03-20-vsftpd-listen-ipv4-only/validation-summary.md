# Validation Summary: How to Configure vsftpd to Listen on IPv4 Only

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- vsftpd (Very Secure FTP Daemon)
- FTP / FTPS protocol
- IPv4 networking
- systemd (`systemctl restart`)
- `ss` (socket statistics utility)
- `curl`, `ftp` CLI clients

## Sources Consulted
- vsftpd.conf(5) man page — https://manpages.debian.org/vsftpd.conf.5
- vsftpd upstream documentation — https://security.appspot.com/vsftpd.html
- iproute2 `ss` documentation — https://manpages.debian.org/ss.8

## Issues Found
No technical issues found. All vsftpd directives used in the post are valid per the vsftpd.conf(5) man page:

- `listen=YES` / `listen_ipv6=NO` — valid; post correctly enables only one (they are mutually exclusive).
- `listen_address` — valid; binds the IPv4 listener to a specific address.
- `anonymous_enable`, `local_enable`, `write_enable`, `local_umask` — all valid.
- `xferlog_enable`, `xferlog_std_format`, `log_ftp_protocol`, `vsftpd_log_file` — all valid.
- `ascii_upload_enable`, `ascii_download_enable` — valid.
- `chroot_local_user`, `allow_writeable_chroot` — valid.
- `pasv_enable`, `pasv_min_port`, `pasv_max_port`, `pasv_address` — all valid.
- `hide_ids`, `ls_recurse_enable`, `chmod_enable` — valid.

The verification commands (`ss -tlnp`, `systemctl restart vsftpd`, `ftp`, `curl -v ftp://...`) are correct and the expected output format for `ss` (`0.0.0.0:21` for IPv4 vs `[::]:21` for IPv6) is accurate.

## Review Notes
- `log_ftp_protocol=YES` is documented as incompatible with `xferlog_std_format=YES`. The two code snippets avoid combining them (the "Basic" config uses `xferlog_std_format=YES` without `log_ftp_protocol`; the "Complete Secure" config uses `log_ftp_protocol=YES` without `xferlog_std_format`), so the configurations remain internally consistent.
- `allow_writeable_chroot=YES` is required when `chroot_local_user=YES` and the user's home directory is writable — the post correctly pairs these.
- FTP is a cleartext protocol; readers deploying this in production should consider FTPS (`ssl_enable=YES`) or SFTP instead. This is outside the scope of the post but worth noting.
- The `203.0.113.0/24` range used in examples is the TEST-NET-3 documentation prefix (RFC 5737), which is the appropriate choice for examples.
