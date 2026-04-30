# Validation Summary: How to Implement HAProxy SSL Termination on an IPv4 Frontend

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- SSL/TLS
- HTTPS
- OCSP stapling
- OpenSSL
- Nmap
- curl
- Linux socket inspection with `ss`

## Sources Consulted
- HAProxy Configuration Manual: https://www.haproxy.com/documentation/haproxy-configuration-manual/new/latest/
- HAProxy TLS basics: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/ssl-tls/client-side-encryption/
- HAProxy OCSP stapling: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/ssl-tls/ocsp-stapling/
- HAProxy HTTP redirects: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/custom-rules/http-redirects/
- HAProxy HTTP rewrites and header manipulation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/http-rewrites/
- HAProxy health checks: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- OpenSSL `openssl-ocsp`: https://docs.openssl.org/master/man1/openssl-ocsp/
- OpenSSL `openssl-s_client`: https://docs.openssl.org/master/man1/openssl-s_client/
- OpenSSL `openssl-x509`: https://docs.openssl.org/master/man1/openssl-x509/
- Nmap `ssl-enum-ciphers` script reference: https://nmap.org/nsedoc/scripts/ssl-enum-ciphers.html
- curl man page: https://curl.se/docs/manpage.html
- Local CLI help output: `openssl ocsp -help`, `openssl s_client -help`, `openssl x509 -help`, `curl --help all`, and `ss --help`

## Issues Found
- The certificate bundle example wrote `/etc/haproxy/certs/example.com.pem` before ensuring `/etc/haproxy/certs/` existed. I moved `mkdir -p /etc/haproxy/certs/` before the `cat` command so the example works as written.
- The SNI section comment said backend routing was based on SNI, but the ACLs used `hdr(host)`, which reads the HTTP `Host` header after TLS termination. I corrected the comment to match the actual configuration.
- The OCSP example referenced `/etc/haproxy/certs/chain.pem` and `/etc/haproxy/certs/cert.pem`, which were never created earlier in the post, and it wrote the response to `/etc/haproxy/ocsp/` while claiming HAProxy would auto-load it from the certificate directory. I updated the command to use the Let's Encrypt `chain.pem` and `cert.pem`, derive the responder URL from the certificate, and save `example.com.ocsp` alongside `example.com.pem`.
- The testing section used `curl` against the SSL Labs HTML report URL and described it as a direct SSL grade check. That command does not reliably provide a grade in terminal output. I replaced it with a concrete `curl --resolve` request against the configured HTTPS frontend and added `-status` to the `openssl s_client` example so the reader can verify stapled OCSP status directly.
- The conclusion said to build PEM bundles from the certificate chain, but HAProxy also needs the private key in the bundle. I corrected that sentence.

## Review Notes
- The HAProxy configuration shown is valid for current releases. If the post is later expanded to tune TLS 1.3 cipher selection explicitly, the matching directive is `ssl-default-bind-ciphersuites`; `ssl-default-bind-ciphers` applies to TLS 1.2 and earlier.
- HAProxy 2.8 and newer can also refresh OCSP responses automatically when configured with OCSP update support. The corrected post now documents the simpler startup preload path using a neighboring `.ocsp` file, which remains accurate and version-agnostic.
