# Validation Summary: How to Enable SSL/TLS (FTPS) on vsftpd for IPv4

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- vsftpd (Very Secure FTP Daemon) 3.x
- FTPS (FTP over SSL/TLS) — explicit and implicit modes
- OpenSSL (certificate generation, s_client)
- Let's Encrypt / certbot
- lftp FTP client
- curl FTP client
- FileZilla
- ufw (firewall)

## Sources Consulted
- vsftpd.conf(5) man page: https://security.appspot.com/vsftpd/vsftpd_conf.html
- lftp man page: https://lftp.yar.ru/lftp-man.html
- OpenSSL s_client docs: https://docs.openssl.org/master/man1/openssl-s_client/
- curl manpage (--ssl-reqd): https://curl.se/docs/manpage.html#--ssl-reqd
- certbot user guide: https://eff-certbot.readthedocs.io/

## Issues Found

1. **Broken `sudo cat ... > file` redirect** (Let's Encrypt section). The shell opens the `>` redirect as the unprivileged user before `sudo` runs, so writing to `/etc/ssl/` would fail with permission denied. Fixed by wrapping in `sudo sh -c '...'` so the redirect runs under the elevated shell.

2. **Incorrect lftp URL scheme for explicit FTPS.** The example used `ftps://203.0.113.10` to test against a vsftpd server configured for explicit FTPS on port 21. In lftp, the `ftps://` scheme means **implicit FTPS** on port 990 — it attempts an immediate TLS handshake on 990, which would fail against this server. Changed the URL to `ftp://203.0.113.10` (with `set ftp:ssl-force yes` already present), which is the correct way to force AUTH TLS/explicit FTPS in lftp. Added a comment explaining the distinction.

## Review Notes

- The `ssl_tlsv1=YES` directive enables TLSv1.0, which is deprecated. vsftpd 3.x also supports `ssl_tlsv1_1=YES` and `ssl_tlsv1_2=YES`. For production use, enabling only `ssl_tlsv1_2=YES` (and `ssl_tlsv1_3` where available via newer OpenSSL) would be stronger. Left as-is since it matches the upstream default and is not technically incorrect.
- `ssl_sslv2=NO` / `ssl_sslv3=NO` are effectively no-ops on modern OpenSSL builds where SSLv2/SSLv3 are already disabled in the library itself, but they do no harm.
- `ssl_ciphers=HIGH` is valid but coarse; a modern recommendation would be something like `ECDHE-RSA-AES256-GCM-SHA384:...` or following Mozilla SSL Configuration Generator guidance. Not wrong, just conservative.
- `allow_writeable_chroot=YES` is required (and correctly included) since vsftpd 3.0.0 refuses a writable chroot by default.
- The combined bundle PEM is created but the sample `vsftpd.conf` still references the self-signed paths (`/etc/ssl/certs/vsftpd.pem` and `/etc/ssl/private/vsftpd.key`). Users choosing Let's Encrypt would need to swap these paths to `/etc/ssl/vsftpd-bundle.pem`. This is implicit but could be made more explicit in a future revision.
