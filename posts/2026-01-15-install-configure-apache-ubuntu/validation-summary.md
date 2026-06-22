# Validation Summary: How to Install and Configure Apache Web Server on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Apache HTTP Server (apache2) on Ubuntu (20.04, 22.04, 24.04)
- systemd service management (systemctl)
- Apache helper tools (a2enmod, a2ensite, a2enconf, a2dissite, apache2ctl/apachectl)
- Virtual hosts and the Debian/Ubuntu sites-available/sites-enabled layout
- SSL/TLS configuration (mod_ssl) and Let's Encrypt via Certbot
- Apache modules: rewrite, ssl, headers, deflate, expires, proxy
- Security hardening (ServerTokens, security headers, FilesMatch restrictions)
- Performance tuning (mod_deflate, mod_expires, MPM event)
- UFW firewall, log management, troubleshooting

## Sources Consulted
- Apache HTTP Server 2.4 Documentation — https://httpd.apache.org/docs/2.4/
- Apache mod_ssl reference — https://httpd.apache.org/docs/2.4/mod/mod_ssl.html
- Apache MPM event documentation — https://httpd.apache.org/docs/2.4/mod/event.html
- Apache mod_deflate / mod_expires / mod_headers references — https://httpd.apache.org/docs/2.4/mod/
- Ubuntu Server documentation: Apache — https://ubuntu.com/server/docs/web-servers-apache
- Debian apache2 packaging (a2enmod/a2ensite man pages) — https://manpages.debian.org/
- Certbot documentation (Apache on Ubuntu) — https://eff-certbot.readthedocs.io/
- Mozilla SSL Configuration Generator (modern profile) — https://ssl-config.mozilla.org/

## Issues Found
No technical issues found.

All commands, package names, config directives, module names, and file paths were verified against official documentation and are correct and current for the Ubuntu/Apache 2.4 versions discussed. The configuration snippets (virtual hosts, SSL, deflate, expires, MPM event) are syntactically valid, and the MPM values are internally consistent (MaxRequestWorkers 400 = ThreadsPerChild 25 × 16 servers).

## Review Notes
The following items are technically correct and functional but could be modernized in a future revision:

- **`SSLCertificateChainFile`** (line 282): This directive is deprecated as of Apache 2.4.8 — the intermediate chain can be appended to the file referenced by `SSLCertificateFile` instead. It still works and is honored by Apache, so this is not an error, just a legacy approach.
- **`X-XSS-Protection` header** (line 354): This header is considered legacy/deprecated by modern browsers (most have removed the XSS auditor), with a strong Content-Security-Policy being the preferred protection. Including it is harmless and still common in hardening guides.
- **`netstat -tlpn`** (line 534): `netstat` is deprecated on modern Ubuntu in favor of `ss -tlpn` (the `net-tools` package may not be installed by default). The command still works where `net-tools` is present, so it is not incorrect.
- **`SSLCipherSuite`** lists only AES128-GCM suites; this is valid but a fuller modern cipher list (or relying on Mozilla's intermediate profile) would be more robust. Not a correctness issue.

None of the above affect functionality; the post works as written.
