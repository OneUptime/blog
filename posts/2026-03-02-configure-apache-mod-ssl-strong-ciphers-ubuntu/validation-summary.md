# Validation Summary: How to Configure Apache mod_ssl with Strong Ciphers on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Apache HTTP Server 2.4
- Apache mod_ssl
- OpenSSL
- TLS 1.2 and TLS 1.3
- OCSP stapling
- Certbot and Let's Encrypt
- SSLyze
- testssl.sh

## Sources Consulted
- Apache HTTP Server 2.4 mod_ssl documentation: https://httpd.apache.org/docs/2.4/en/mod/mod_ssl.html
- Apache HTTP Server SSL/TLS Strong Encryption How-To: https://httpd.apache.org/docs/current/ssl/ssl_howto.html
- Ubuntu Server documentation for Apache modules: https://documentation.ubuntu.com/server/how-to/web-services/use-apache2-modules/
- Ubuntu manpage for a2enmod/a2dismod: https://manpages.ubuntu.com/manpages/jammy/man8/a2enmod.8.html
- Certbot user guide certificate file documentation: https://eff-certbot.readthedocs.io/en/stable/using.html
- OpenSSL 3.0 openssl-dhparam documentation: https://docs.openssl.org/3.0/man1/openssl-dhparam/
- OpenSSL 3.0 SSL_CONF_cmd documentation: https://docs.openssl.org/3.0/man3/SSL_CONF_cmd/
- OpenSSL 3.0 openssl-ciphers documentation: https://docs.openssl.org/3.0/man1/openssl-ciphers/
- PCI Security Standards Council TLS FAQ: https://www.pcisecuritystandards.org/faq/articles/Frequently_Asked_Question/does-pci-dss-define-which-versions-of-tls-must-be-used/
- SSLyze documentation: https://nabla-c0d3.github.io/sslyze/documentation/available-scan-commands.html
- testssl.sh project documentation: https://github.com/testssl/testssl.sh

## Issues Found
- The TLS 1.2 cipher list used `DHE-RSA-AES256-GCM-SHA256`, which is not the OpenSSL cipher-suite name. Changed it to `DHE-RSA-AES256-GCM-SHA384`.
- The text said the TLS configuration was "required for PCI DSS compliance as of 2024." PCI DSS does not define a single required TLS version list; it requires strong cryptography and excludes SSL/early TLS. Reworded the comment to avoid overstating the requirement.
- The cipher-suite comments implied the `SSLCipherSuite` line configures TLS 1.3. Apache documents TLS 1.3 cipher configuration separately, while the shown list is for TLS 1.2 and below. Updated the comment.
- The compression comment referred to "server-side compression"; `SSLCompression off` disables TLS compression. Updated the comment.
- The session-ticket comment said to enable session tickets, but the directive set `SSLSessionTickets off`. Updated the comment to match the directive and Apache's warning about forward secrecy without frequent key rotation.
- The OCSP stapling comment described `SSLStaplingResponseMaxAge` as a cache lifetime. Apache documents it as a freshness limit for stapled responses. Updated the comment.
- The virtual host used `SSLCertificateFile` with `cert.pem` plus deprecated `SSLCertificateChainFile`. For Apache 2.4.8 and later, Apache and Certbot documentation recommend `fullchain.pem` in `SSLCertificateFile`. Updated the certificate path and removed the deprecated chain directive.
- The later global `SSLCipherSuite HIGH:...` example allowed broad `HIGH` ciphers, including cipher families not aligned with the post's stated target of only ECDHE/DHE with GCM/CHACHA20. Replaced it with the same explicit strong cipher list used earlier.

## Review Notes
- The post is technically relevant and contains implementation details, so it was reviewed as a code/configuration tutorial.
- Apache was not installed in the local workspace container, so Apache syntax was verified against official Apache documentation rather than `apache2ctl configtest`.
- OpenSSL command flags for `req`, `dhparam`, and `s_client` were checked against the local OpenSSL 3.0 command help.
