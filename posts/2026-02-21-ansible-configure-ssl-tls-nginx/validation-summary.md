# Validation Summary: How to Use Ansible to Configure SSL/TLS with Nginx

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Nginx
- SSL/TLS
- OpenSSL
- Ubuntu 22.04
- HTTP security headers

## Sources Consulted
- NGINX SSL termination documentation: https://docs.nginx.com/nginx/admin-guide/security-controls/terminating-ssl-http/
- NGINX HTTP SSL module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Ansible uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- OpenSSL req command documentation: https://docs.openssl.org/4.0/man1/openssl-req/
- RFC 9525, Service Identity in TLS: https://www.rfc-editor.org/rfc/rfc9525.html

## Issues Found
- The DH parameter generation command wrote to `files/dhparam.pem`, but the role expects the file under `roles/nginx_ssl/files/dhparam.pem`. Updated the command so Ansible can find the file with `copy: src: dhparam.pem`.
- The role used `ssl_cert_local_path`, `ssl_key_local_path`, and `ssl_chain_local_path`, but the variables section did not define them. Added those variables and listed the corresponding role files so the example can run as written.
- The Nginx example used `ssl_certificate` for the leaf certificate and `ssl_trusted_certificate` for the chain. Nginx documentation says the file configured with `ssl_certificate` should contain the server certificate followed by intermediate certificates when a complete chain must be sent to clients. Updated the certificate path and task wording to use a full-chain certificate for `ssl_certificate`.
- The self-signed certificate command only set the Common Name. Current TLS service identity guidance uses Subject Alternative Name for DNS identity, so the OpenSSL command now adds `subjectAltName=DNS:{{ server_name }}`.

## Review Notes
- The `listen 443 ssl http2;` syntax is valid for Ubuntu 22.04's packaged Nginx, but newer Nginx releases deprecate the `http2` listen parameter in favor of a separate `http2 on;` directive.
- The `X-XSS-Protection` header is a legacy browser header. It does not break the configuration, but a future refresh could replace it with a Content Security Policy example.
