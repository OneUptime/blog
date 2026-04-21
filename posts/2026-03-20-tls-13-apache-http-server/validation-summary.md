# Validation Summary: How to Configure TLS 1.3 on Apache HTTP Server

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Apache HTTP Server 2.4
- mod_ssl
- OpenSSL
- TLS 1.2 and TLS 1.3
- HTTPS redirects with mod_rewrite
- HSTS and security headers
- OCSP stapling
- testssl.sh

## Sources Consulted
- Apache HTTP Server 2.4 mod_ssl documentation: https://httpd.apache.org/docs/2.4/mod/mod_ssl.html
- Apache HTTP Server 2.4 change log: https://www.apache.org/dist/httpd/CHANGES_2.4
- Apache HTTP Server 2.4 mod_headers documentation: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Apache HTTP Server 2.4 mod_rewrite documentation: https://httpd.apache.org/docs/2.4/mod/mod_rewrite.html
- Apache HTTP Server rewrite/remapping guide: https://httpd.apache.org/docs/2.4/rewrite/remapping.html
- OpenSSL s_client documentation: https://docs.openssl.org/1.1.1/man1/s_client/
- OpenSSL dhparam documentation: https://docs.openssl.org/1.1.1/man1/dhparam/
- RFC 8446, The Transport Layer Security (TLS) Protocol Version 1.3: https://www.rfc-editor.org/rfc/rfc8446.html
- testssl.sh download URL verified: https://testssl.sh/testssl.sh

## Issues Found
- The post listed Apache 2.4.36+ as the TLS 1.3 requirement. Apache 2.4.36 was not a released Apache HTTP Server version, and TLS 1.3 support is available in released Apache 2.4.37+ builds linked with OpenSSL 1.1.1+. Updated the prerequisite, TLS 1.3 cipher-suite comment, and conclusion to Apache 2.4.37+.
- The virtual host used `SSLCACertificateFile` for the certificate chain. That directive configures CA certificates used for client certificate verification, not the server certificate chain. Updated the example to use a fullchain file in `SSLCertificateFile` and removed `SSLCACertificateFile`.
- `SSLSessionCache` and `SSLStaplingCache` were shown inside the `<VirtualHost>`, but Apache documents both directives as server-config context directives. Moved the session cache configuration to the global SSL settings and relied on the existing global OCSP stapling cache.
- The session ticket example used `SSLSessionTicketKeyFile /etc/apache2/ssl_ticket.key` without creating or rotating the required key file, and session tickets are enabled by default in Apache. Replaced it with a note that a rotated ticket key file should only be configured where needed, such as clustered setups.
- The `SSLHonorCipherOrder` comment described the directive as TLS 1.3-specific. Updated the comment to describe the client-preference behavior more generally.

## Review Notes
- The commands and paths are Debian/Ubuntu-style (`apache2`, `apache2ctl`, `a2enmod`, `a2ensite`, `/etc/apache2`). Other distributions use different service names and Apache paths.
- OpenSSL 1.1.1 is the minimum version for TLS 1.3, but it is upstream end-of-life. Production deployments should use a currently supported OpenSSL or vendor-supported distribution build.
- The HSTS `preload` token is syntactically valid, but a domain is not actually preloaded unless it is submitted to and accepted by the browser preload list. Confirm all subdomains are HTTPS-ready before using `includeSubDomains; preload`.
