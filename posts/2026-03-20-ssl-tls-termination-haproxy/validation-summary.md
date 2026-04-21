# Validation Summary: How to Set Up SSL/TLS Termination on HAProxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HAProxy
- TLS/SSL termination
- SNI certificate selection
- OpenSSL
- systemd
- socat and the HAProxy master CLI
- HTTP forwarding headers and health checks

## Sources Consulted
- HAProxy SSL/TLS basics documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/ssl-tls/basics-enable-tls/
- HAProxy Configuration Manual 2.9r1: https://www.haproxy.com/documentation/haproxy-configuration-manual/2-9r1/
- HAProxy Runtime API documentation: https://www.haproxy.com/documentation/haproxy-runtime-api/
- HAProxy Runtime API installation/access documentation: https://www.haproxy.com/documentation/haproxy-runtime-api/installation/
- HAProxy Management Guide 2.7, stopping and reloading / master CLI: https://docs.haproxy.org/2.7/management.html
- OpenSSL s_client manual: https://docs.openssl.org/3.1/man1/openssl-s_client/

## Issues Found
- The version check implied that HAProxy 2.4+ was the key requirement for TLS 1.3. Updated the command to `haproxy -vv` so readers verify HAProxy version and OpenSSL build details, because TLS 1.3 ciphersuite support depends on OpenSSL support.
- The certificate preparation commands wrote to `/etc/haproxy/certs` without root privileges and did not create the directory. Added `sudo mkdir -p`, a root-safe PEM creation command, and `sudo` for permission changes.
- The HTTPS frontend used repeated `bind *:443` lines and shell-style backslashes inside `haproxy.cfg`. HAProxy configuration statements are single-line, and separate listeners on the same address with different certificates do not provide reliable SNI selection. Replaced them with one `bind` line that loads multiple certificates using repeated `crt` arguments.
- The reload example sent `reload` to the Runtime API stats socket. Replaced it with a conditional HAProxy master CLI example using a configured master socket, while keeping `systemctl reload haproxy` as the primary graceful reload command.
- The SNI directory explanation overstated certificate selection. Clarified that HAProxy selects the certificate when the SNI hostname matches a certificate CN or SAN.
- The `openssl s_client` example could stay interactive. Added `echo |` so the command exits after printing handshake details.
- The stats `curl` example used an unquoted password containing `!`, which can be interpreted by interactive shells. Quoted the `-u` credential argument.
- The config validation command may need root access to read protected certificate files. Updated it to `sudo haproxy -c -f /etc/haproxy/haproxy.cfg`.

## Review Notes
Validated a representative corrected configuration with Ubuntu's HAProxy 2.8.16 package using `haproxy -c`; the configuration parsed successfully. Also started HAProxy with temporary certificates and confirmed SNI returned the expected certificate for `example.com` and `other-site.com`.

The HSTS `preload` directive is syntactically correct, but production domains should only submit to preload lists after confirming that all required subdomains support HTTPS. When loading certificates from a directory, HAProxy falls back to the first loaded certificate if no SNI value is present or no certificate matches, so deployments that need a specific default certificate should control load order.
