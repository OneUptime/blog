# Validation Summary: How to Configure mTLS Between Services on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSSL
- X.509 certificates and certificate authorities
- TLS and mutual TLS
- Nginx
- curl
- Python ssl and urllib.request
- Linux file permissions

## Sources Consulted
- OpenSSL req documentation: https://docs.openssl.org/3.1/man1/openssl-req/
- OpenSSL x509 documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- OpenSSL verify documentation: https://docs.openssl.org/3.1/man1/openssl-verify/
- OpenSSL X.509v3 extension configuration documentation: https://docs.openssl.org/3.0/man5/x509v3_config/
- Nginx ngx_http_ssl_module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Red Hat Enterprise Linux 9 NGINX documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-up-and-configuring-nginx_deploying-web-servers-and-reverse-proxies
- Python 3.12 ssl documentation: https://docs.python.org/3.12/library/ssl.html
- everything curl client certificate documentation: https://everything.curl.dev/usingcurl/tls/clientcert.html
- RFC 8446, The Transport Layer Security (TLS) Protocol Version 1.3: https://www.rfc-editor.org/rfc/rfc8446

## Issues Found
- The CA certificate command created a self-signed certificate but did not explicitly mark it as a CA certificate. OpenSSL's X.509v3 documentation states that a CA certificate must include `basicConstraints` with `CA:TRUE`. I updated the CA creation command to add `basicConstraints=critical,CA:TRUE`, `keyUsage=critical,keyCertSign,cRLSign`, and `subjectKeyIdentifier=hash` using OpenSSL's documented `-addext` option.

## Review Notes
- The OpenSSL certificate generation and verification flow was tested in a temporary workspace after the CA extension fix, and the generated server certificate verified successfully against the generated CA.
- The Python code blocks were parsed successfully with Python 3.12. The use of `ssl.PROTOCOL_TLS_SERVER` and `ssl.PROTOCOL_TLS_CLIENT` is current; `PROTOCOL_TLS_CLIENT` enables certificate validation and hostname checking by default.
- The Nginx mTLS directives and curl certificate options match the documented configuration and CLI behavior.
- In a production RHEL deployment, operators may also need to account for firewall rules, SELinux policy, service user ownership of private keys, certificate revocation, and the fact that the Nginx and Python examples both bind to port 8443 if run on the same host at the same time.
