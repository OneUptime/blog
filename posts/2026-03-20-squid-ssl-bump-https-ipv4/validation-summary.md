# Validation Summary: How to Configure Squid SSL Bump for HTTPS Interception on IPv4

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Squid proxy
- Squid SSL Bump
- TLS/HTTPS interception
- OpenSSL
- iptables NAT REDIRECT
- Linux CA trust stores

## Sources Consulted
- Squid current release information: https://www.squid-cache.org/Versions/
- Squid `http_port` configuration directive: https://www.squid-cache.org/Doc/config/http_port/
- Squid `https_port` configuration directive: https://www.squid-cache.org/Doc/config/https_port/
- Squid `ssl_bump` configuration directive: https://www.squid-cache.org/Doc/config/ssl_bump/
- Squid `acl` configuration directive, including `at_step` and `ssl::server_name`: https://www.squid-cache.org/Doc/config/acl/
- Squid `sslcrtd_program` configuration directive: https://www.squid-cache.org/Doc/config/sslcrtd_program/
- Squid `sslcrtd_children` configuration directive: https://www.squid-cache.org/Doc/config/sslcrtd_children/
- Squid SSL Bump explicit/intercept example and SSL DB ownership guidance: https://wiki.squid-cache.org/ConfigExamples/Intercept/SslBumpExplicit
- Squid dynamic SSL certificate generation feature notes: https://wiki.squid-cache.org/Features/DynamicSslCert
- OpenSSL `req` command documentation: https://docs.openssl.org/3.0/man1/openssl-req/
- curl `--proxy` / `-x` documentation: https://curl.se/docs/manpage.html
- iptables REDIRECT target documentation: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html

## Issues Found
- The OpenSSL command used the deprecated `-nodes` option and did not explicitly set CA signing extensions. Updated it to `-noenc` and added `basicConstraints=critical,CA:TRUE` and `keyUsage=critical,keyCertSign,cRLSign`.
- The certificate commands wrote under `/etc/squid/ssl` without creating the directory or using `sudo` for protected paths. Added `sudo mkdir -p`, `sudo openssl`, and `sudo sh -c` for the PEM bundle.
- The SSL certificate database was initialized but not made writable by Squid's runtime user. Added a `chown` step and noted that the runtime user varies by distribution.
- The Squid listener used older `cert=` and `key=` option names. Updated the configuration to current `tls-cert=` syntax and used the combined PEM bundle.
- The no-bump ACL used `dstdomain`, which is unreliable for SSL Bump decisions on intercepted TLS because the request URI may be an IP address. Changed it to `ssl::server_name`, which can use CONNECT host, SNI, and server certificate names.
- The `peek` comment said SNI was inspected at Step 1. Clarified that peeking at Step 1 lets Squid read the TLS ClientHello so SNI is available at Step 2.
- The transparent HTTPS example redirected traffic to port 3129 but showed an `http_port` SSL-Bump listener. Corrected it to `https_port 3129 intercept ssl-bump`.
- The iptables example used `--to-port`; while accepted as an abbreviation by the local tool, the documented REDIRECT option is `--to-ports`. Updated it to the documented form.
- The Linux CA installation command was Debian/Ubuntu-specific. Updated the comment to say Debian/Ubuntu clients.
- The monitoring command `squid -k rotate` rotates logs and does not check certificate cache usage. Replaced it with `du -sh /var/lib/squid/ssl_db`.
- The access-log comment implied `grep CONNECT` covers all HTTPS requests. Clarified that it shows explicit HTTPS CONNECT requests.

## Review Notes
- Squid 7.5 is the current stable series as of the review date. The reviewed SSL Bump directives are documented for Squid v7 but are not available in the Squid v8 documentation.
- SSL Bump requires Squid to be built with OpenSSL support and certificate generation helper support. Package paths and the Squid runtime user vary by distribution; this post uses Debian/Ubuntu-style paths and user defaults.
- The transparent interception example covers TCP/TLS HTTPS traffic. HTTP/3/QUIC over UDP/443 is outside the scope of the shown iptables rule and Squid SSL Bump flow.
