# Validation Summary: How to Create Self-Signed SSL Certificates with OpenSSL on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSSL 3
- X.509 certificates and certificate extensions
- Self-signed TLS certificates
- Local certificate authorities
- Apache HTTP Server mod_ssl
- Nginx TLS configuration
- SELinux file contexts

## Sources Consulted
- OpenSSL `req` documentation: https://docs.openssl.org/3.6/man1/openssl-req/
- OpenSSL `x509` documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- OpenSSL X.509v3 extension configuration documentation: https://docs.openssl.org/3.0/man5/x509v3_config/
- Red Hat Enterprise Linux 9.0 Release Notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.0_release_notes/overview
- Red Hat Enterprise Linux 9 Using SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Apache HTTP Server 2.4 mod_ssl documentation: https://httpd.apache.org/docs/2.4/mod/mod_ssl.html
- NGINX SSL termination documentation: https://docs.nginx.com/nginx/admin-guide/security-controls/terminating-ssl-http/
- RFC 5280, Internet X.509 Public Key Infrastructure Certificate and CRL Profile: https://www.rfc-editor.org/rfc/rfc5280
- RFC 6125, Service Identity in TLS certificates: https://www.rfc-editor.org/rfc/rfc6125

## Issues Found
- Replaced `-nodes` with `-noenc` in OpenSSL `req` examples. `-nodes` still works, but OpenSSL 3 deprecates it in favor of `-noenc`, and RHEL 9 ships OpenSSL 3.
- Updated the explanation of unencrypted private key output from "no DES encryption" to the current, more accurate "no encryption".
- Added explicit X.509v3 extensions to server certificate examples: `basicConstraints=critical,CA:FALSE`, appropriate `keyUsage`, and `extendedKeyUsage=serverAuth`. This prevents OpenSSL configuration defaults from producing server certificates with CA-style constraints and makes the certificate purpose explicit.
- Added explicit CA extensions to the local CA example: `basicConstraints=critical,CA:TRUE` and `keyUsage=critical,keyCertSign,cRLSign`.
- Updated the RHEL/OpenSSL version wording around `-addext` to say it is available in OpenSSL 1.1.1+ and OpenSSL 3, which ships with RHEL 9.

## Review Notes
The Apache, Nginx, SELinux, inspection, SAN, CSR, CA signing, and verification examples are technically valid for the stated RHEL 9/OpenSSL context. The corrected OpenSSL certificate generation examples were smoke-tested locally with OpenSSL 3.0.13, including `openssl verify -CAfile ca.crt webapp.crt`.
