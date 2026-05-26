# Validation Summary: How to Store TLS Certificates in Ansible Vault

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Vault
- Ansible playbooks and modules
- TLS certificates and private keys
- Nginx TLS configuration
- Apache HTTP Server mod_ssl
- HAProxy certificate bundles
- OpenSSL CLI
- YAML and Jinja2 templating

## Sources Consulted
- Ansible Vault documentation: https://docs.ansible.com/ansible/latest/vault_guide/vault.html
- ansible-vault CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Ansible file encryption documentation: https://docs.ansible.com/ansible/latest/vault_guide/vault_encrypting_content.html
- ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.shell module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- ansible.builtin.dict2items filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dict2items_filter.html
- Ansible logging and no_log documentation: https://docs.ansible.com/projects/ansible/13/reference_appendices/logging.html
- NGINX SSL termination documentation: https://docs.nginx.com/nginx/admin-guide/security-controls/terminating-ssl-http/
- NGINX HTTP/2 directive change notice: https://mailman.nginx.org/pipermail/nginx-devel/2023-June/4AQ7ABVFMO4EV5IR6LHENRUNGZQPYMOI.html
- Apache mod_ssl documentation: https://httpd.apache.org/docs/2.4/mod/mod_ssl.html
- HAProxy configuration manual: https://docs.haproxy.org/2.8/configuration.html
- OpenSSL x509 command documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- OpenSSL pkey command documentation: https://docs.openssl.org/3.1/man1/openssl-pkey/

## Issues Found
- The introduction said a stolen TLS private key can decrypt traffic. This is too broad for modern TLS deployments that use forward secrecy, so it was changed to say the key enables server impersonation and may decrypt sessions that did not use forward secrecy.
- The Nginx example used `listen 443 ssl http2;`, which is deprecated in current Nginx. It was changed to `listen 443 ssl;` plus `http2 on;`.
- The Apache example deployed the server certificate and CA chain as separate files. For Apache 2.4.8 and later, intermediate CA certificates are loaded from the `SSLCertificateFile` server certificate file, so the example now deploys the certificate with the CA chain concatenated.
- The certificate/key validation task compared RSA moduli with `openssl rsa` and MD5 hashes. That only works for RSA keys and uses a weak digest. It was changed to compare SHA-256 digests of the certificate and private key public keys using `openssl x509 -pubkey` and `openssl pkey -pubout`, which also works for EC keys.

## Review Notes
The examples are generally correct for storing vaulted YAML variables and deploying them with Ansible. The post could later mention that Ansible Vault protects data at rest only, and that decrypted values can still appear in logs or on managed hosts if tasks are not written carefully.
