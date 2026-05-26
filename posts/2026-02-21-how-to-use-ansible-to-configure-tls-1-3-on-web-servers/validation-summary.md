# Validation Summary: How to Use Ansible to Configure TLS 1.3 on Web Servers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- TLS 1.3
- Nginx
- Apache HTTP Server / mod_ssl
- OpenSSL
- OCSP stapling
- Diffie-Hellman parameters

## Sources Consulted
- RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3: https://datatracker.ietf.org/doc/html/rfc8446
- NGINX SSL termination documentation: https://docs.nginx.com/nginx/admin-guide/security-controls/terminating-ssl-http/
- NGINX technical specifications: https://docs.nginx.com/nginx/technical-specs/
- Apache HTTP Server mod_ssl documentation: https://httpd.apache.org/docs/2.4/mod/mod_ssl.html
- Apache HTTP Server project homepage/version guidance: https://httpd.apache.org/
- OpenSSL s_client manual: https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL SSL_CONF_cmd documentation: https://docs.openssl.org/3.0/man3/SSL_CONF_cmd/
- Ansible community.crypto openssl_dhparam module documentation: https://docs.ansible.com/ansible/latest/collections/community/crypto/openssl_dhparam_module.html
- Ansible service_facts module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html

## Issues Found
- The Nginx `ssl_ciphers` example mixed TLS 1.3 cipher-suite names with TLS 1.2 cipher names. `ssl_ciphers` is for TLS 1.2 and earlier in practical Nginx/OpenSSL configuration, while TLS 1.3 cipher suites are handled separately by OpenSSL defaults or explicit OpenSSL configuration. I removed the TLS 1.3 suites from the `ssl_ciphers` variable and clarified the template comments.
- The Nginx version check used `nginx -v`, which only prints the version. Since TLS 1.3 support depends on how Nginx was built and linked with OpenSSL, I changed it to `nginx -V` and adjusted the debug output.
- The Apache section stated that Apache supports TLS 1.3 with version 2.4.36+. Apache added OpenSSL 1.1.1/TLS 1.3 support there, but current Apache project guidance says 2.4.43 or newer is required to operate a TLS 1.3 web server with OpenSSL 1.1.1. I updated the wording to reflect both facts.
- The Apache `SSLCipherSuite` example mixed TLS 1.3 suite names into the generic cipher suite directive. Apache mod_ssl documents the optional protocol specifier for TLS 1.3. I split the configuration into `SSLCipherSuite SSL ...` for TLS 1.2 and earlier and `SSLCipherSuite TLSv1.3 ...` for TLS 1.3.
- The TLS 1.3 test checked for one exact OpenSSL output string. `s_client -brief` output varies across OpenSSL versions, and `-tls1_3` already forces a TLS 1.3 handshake. I changed the failure condition to check the command return code.
- The rollback task referenced `ansible_facts.services` without gathering service facts and used a condition that could fail or miss systemd service names. I added `ansible.builtin.service_facts` and checked both `nginx.service` and `nginx`.

## Review Notes
The tutorial remains Debian/Ubuntu oriented because it uses `a2enmod`, `a2enconf`, `/etc/apache2`, and `/etc/nginx/sites-available/default`. That is acceptable for the examples, but future revisions could call out distribution assumptions explicitly.
