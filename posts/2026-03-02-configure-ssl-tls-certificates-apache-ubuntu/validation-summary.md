# Validation Summary: How to Configure SSL/TLS Certificates for Apache on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Apache HTTP Server 2.4
- Apache mod_ssl
- Apache mod_headers
- Apache mod_rewrite
- Apache mod_http2
- Certbot
- Let's Encrypt certificates
- OpenSSL
- UFW
- TLS 1.2 and TLS 1.3

## Sources Consulted
- Apache HTTP Server 2.4 mod_ssl documentation: https://httpd.apache.org/docs/2.4/mod/mod_ssl.html
- Apache HTTP Server 2.4 mod_http2 documentation: https://httpd.apache.org/docs/2.4/mod/mod_http2.html
- Apache HTTP Server 2.4 virtual host documentation: https://httpd.apache.org/docs/2.4/vhosts/
- Certbot user guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Ubuntu certbot manpage: https://manpages.ubuntu.com/manpages/noble/man7/certbot.7.html
- Mozilla SSL Configuration Generator: https://ssl-config.mozilla.org/

## Issues Found
- The HTTPS virtual host included `/etc/apache2/conf-available/ssl-params.conf` from inside `<VirtualHost>`, but that shared file contains directives such as `SSLSessionCache` and `SSLStaplingCache` that must be configured at server/global scope. I removed the in-vhost `Include` and clarified that the shared configuration is enabled globally with `a2enconf ssl-params`.
- The OCSP stapling guidance duplicated `SSLUseStapling` and `SSLStaplingCache` in `apache2.conf` even though the same server-scope directives were already in `ssl-params.conf`. I replaced the duplicate edit instructions with a note that `ssl-params.conf` provides those server-level directives once enabled.
- The commercial certificate example used `SSLCertificateChainFile` in the active configuration even though Apache 2.4.8 and later deprecate it in favor of placing the full chain in `SSLCertificateFile`. I changed the example to create and use a full-chain certificate file and left `SSLCertificateChainFile` only as a commented note for Apache versions older than 2.4.8.
- The OCSP stapling cache path used a relative `logs/` path. I changed it to `/run/apache2/ssl_stapling` to match Ubuntu-style runtime paths and avoid ambiguity.
- The cipher-suite comment implied that `SSLCipherSuite` covered all enabled TLS versions. I clarified that the listed cipher names configure TLS 1.2; TLS 1.3 cipher handling is separate in Apache/OpenSSL.

## Review Notes
The remaining commands and configuration examples are technically valid for current Ubuntu Apache 2.4 deployments. HTTP/2 support depends on Apache 2.4.17+ and the `mod_http2` module, as reflected in the official Apache documentation. The TLS cipher and protocol settings are reasonable for a modern baseline, though operators may still want to regenerate them from Mozilla's SSL Configuration Generator for their exact Apache and OpenSSL versions.
