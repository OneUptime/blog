# Validation Summary: How to Configure ProFTPD TLS Encryption on IPv4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ProFTPD
- ProFTPD `mod_tls`
- FTPS / TLS
- IPv4 networking
- OpenSSL
- `curl`
- `lftp`
- Debian/Ubuntu package-based configuration

## Sources Consulted
- ProFTPD `mod_tls` documentation: https://www.proftpd.org/docs/contrib/mod_tls.html
- ProFTPD `mod_core` documentation: https://www.proftpd.org/docs/modules/mod_core.html
- `curl` man page: https://curl.se/docs/manpage.html
- `lftp` manual: https://lftp.yar.ru/lftp-man.html
- OpenSSL `req` documentation: https://docs.openssl.org/3.6/man1/openssl-req/
- Ubuntu/Debian packaged ProFTPD sample templates for `proftpd-core` 1.3.8.b (`proftpd.conf`, `modules.conf`, `tls.conf`) extracted from the official package metadata available via `apt`

## Issues Found
- The certificate-generation example wrote files into `/etc/proftpd/ssl/` without creating that directory first. I added `install -d -m 700 /etc/proftpd/ssl` so the example works as written.
- The OpenSSL command used `-nodes`, which current OpenSSL marks as deprecated. I replaced it with `-noenc`.
- The private-key ownership example used `chown proftpd:proftpd`, which does not match the packaged Debian/Ubuntu ProFTPD defaults and weakens the guidance around key handling. I corrected it to `root:root`, consistent with the packaged TLS template’s guidance that the key should be readable only by root.
- The “Bind to IPv4” section did not actually disable IPv6. I added `UseIPv6 off` and updated the socket-check command to `ss -4 -tlnp` so the post now matches its IPv4-specific title.
- The `TLSLog` comment was technically incorrect because `TLSLog` takes a log-file path, not numeric verbosity levels. I corrected the explanation.
- The `TLSRequired on` comment incorrectly said `on` makes TLS optional. I corrected it to `off`, which is the actual optional setting.
- The `TLSOptions ... NoSessionReuseRequired` comment described the opposite of what that option does. I rewrote it to match the directive behavior documented by ProFTPD.
- The `TLSRenegotiate none` comment incorrectly described cleartext fallback behavior. I changed it to describe renegotiation accurately.
- The `curl` test command used the legacy `--ftp-ssl` name. Current curl documentation says that option name is a former name and may be removed; I replaced it with `--ssl-reqd`.
- The curl test comment called explicit FTPS on port 21 “STARTTLS”. In FTP, the relevant explicit TLS negotiation is `AUTH TLS`; I corrected that wording.
- The takeaway claiming `NoSessionReuseRequired` is mainly for Windows FTP clients was too specific. ProFTPD’s own docs explicitly call out compatibility issues with some clients such as `curl`, so I revised the claim accordingly.

## Review Notes
- `TLSRenegotiate none` is valid, but on ProFTPD 1.3.8rc2 and later the documented default behavior is already to avoid requesting renegotiation unless it is explicitly configured. Keeping the directive is harmless because it makes the intent explicit.
- On Debian/Ubuntu systems, administrators often enable `mod_tls` by uncommenting `LoadModule mod_tls.c` in `/etc/proftpd/modules.conf` rather than placing `LoadModule mod_tls.c` directly in `proftpd.conf`. The post’s directive is still valid, but package-managed layouts may prefer the module file.
- The test commands are correct for explicit FTPS. If the self-signed certificate from the post is used, the client must trust that certificate before certificate validation will succeed.
