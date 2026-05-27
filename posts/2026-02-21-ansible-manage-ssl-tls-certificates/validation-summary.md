# Validation Summary: How to Use Ansible to Manage SSL/TLS Certificates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks, roles, modules, handlers, and tags
- Certbot and Let's Encrypt certificate issuance and renewal
- OpenSSL certificate and key validation commands
- nginx TLS and HTTP/2 configuration
- Debian and RHEL CA trust store updates

## Sources Consulted
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.find` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible tags documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- Certbot user guide and command-line documentation: https://eff-certbot.readthedocs.io/en/stable/using.html and https://eff-certbot.readthedocs.io/en/stable/man/certbot.html
- nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- OpenSSL `x509`, `pkey`, and `dgst` documentation: https://docs.openssl.org/4.0/man1/openssl-x509/, https://docs.openssl.org/4.0/man1/openssl-pkey/, and https://docs.openssl.org/3.4/man1/openssl-dgst/

## Issues Found
- The Certbot command defined a `letsencrypt_challenge` variable but did not use it. Added `--preferred-challenges {{ letsencrypt_challenge }}` so the variable affects issuance as described.
- The file certificate deployment snippet used dynamic handler names such as `Reload nginx and myapp`, but the shown handlers only defined `Reload nginx`. Replaced the dynamic notifications with registered copy results and a service reload task that loops over `cert.services_to_reload`.
- The fullchain generation task always reported changed. Reworked it to compare generated content with the existing fullchain and only update the file when the content differs.
- The certificate/key matching check used `openssl rsa -modulus`, which only works for RSA private keys. Replaced it with a public-key digest comparison using `openssl x509`, `openssl pkey`, and `openssl dgst`, which works for RSA and ECDSA keys.
- The nginx template used `listen 443 ssl http2;`, which is deprecated in current nginx. Updated it to `listen 443 ssl;` plus `http2 on;`.
- The `--tags cert-deploy` command example did not have a corresponding tag in the shown playbook. Added `tags: cert-deploy` to the `cert-deploy` role entry.

## Review Notes
The monitoring example uses GNU `date -d`, so it is appropriate for typical Linux targets but would need adjustment for non-GNU userlands. The Certbot package names shown are common on Debian/Ubuntu-style systems; package names can vary by distribution.
