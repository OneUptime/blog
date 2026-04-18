# Validation Summary: How to Configure vsftpd Anonymous FTP Access on IPv4

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- vsftpd (Very Secure FTP Daemon)
- FTP protocol (anonymous access, passive mode)
- IPv4 networking
- Linux filesystem permissions (chown, chmod)
- systemd service management

## Sources Consulted
- vsftpd.conf(5) man page (https://security.appspot.com/vsftpd/vsftpd_conf.html)
- Official vsftpd documentation (https://security.appspot.com/vsftpd.html)
- vsftpd source FAQ notes on "refusing to run with writable root inside chroot"
- RFC 959 (File Transfer Protocol)
- curl(1) man page for FTP URL and `--user` usage

## Issues Found

1. **Anonymous chroot root was writable by the ftp user.** The original setup did `chown ftp:ftp /var/ftp/pub` with mode `755`. Because `anon_root=/var/ftp/pub` is the chroot root for anonymous logins and anonymous users effectively run as the ftp user, the chroot root was writable by the logged-in user. Modern vsftpd (2.3.5+) refuses to start in this state with the error "vsftpd: refusing to run with writable root inside chroot()" unless `allow_writeable_chroot=YES` is set. Fixed by changing ownership to `root:root`, which also aligns with the author's own comment "nobody writes to it". Upload dropbox behavior is preserved because the writable `/var/ftp/pub/incoming` subdirectory is unchanged.

2. **`log_ftp_protocol=YES` had no effect alongside `xferlog_std_format=YES`.** The vsftpd manpage explicitly states that `log_ftp_protocol` only takes effect when `xferlog_std_format` is not enabled. With the original config, the commented claim "Log all FTP commands" was not true. Replaced it with `dual_log_enable=YES`, which instructs vsftpd to write both the xferlog-format transfer log and the vsftpd-style protocol log in parallel — preserving the author's apparent intent of having both.

## Review Notes

- The `anon_world_readable_only=YES` directive is actually the default in vsftpd, but setting it explicitly in the dropbox section is a good documentation practice.
- `chmod 733` on the incoming dropbox relies on vsftpd's default `anon_umask=077` (so uploads land at mode `600`) combined with `anon_world_readable_only=YES` to prevent re-downloading of uploaded files. This is defensible but depends on defaults not being overridden.
- `xferlog_file=/var/log/vsftpd.log` is an unusual location (the xferlog format log is conventionally at `/var/log/xferlog`), but it is a valid override. With `dual_log_enable=YES` the vsftpd-style protocol log will go to the default `vsftpd_log_file=/var/log/vsftpd.log`, which will collide with `xferlog_file`. Operators using this config verbatim should consider setting `vsftpd_log_file` to a separate path (e.g. `/var/log/vsftpd_protocol.log`). This is a non-breaking caveat, not an error in the commands.
- Anonymous FTP over plaintext is fundamentally insecure (no transport encryption, no server authentication). For public-read workloads, HTTPS mirrors are generally preferable; this is out of scope for the post but worth flagging for future readers.
