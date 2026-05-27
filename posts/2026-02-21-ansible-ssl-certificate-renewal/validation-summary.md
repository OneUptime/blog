# Validation Summary: How to Use Ansible to Automate SSL Certificate Renewal

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Certbot
- Let's Encrypt
- OpenSSL
- cron
- systemd
- Bash
- TLS certificates

## Sources Consulted
- Ansible cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible fetch module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/fetch_module.html
- Ansible items lookup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/items_lookup.html
- Ansible to_datetime filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/to_datetime_filter.html
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Certbot documentation and instructions: https://certbot.eff.org/docs and https://certbot.eff.org/instructions
- OpenSSL x509 documentation: https://docs.openssl.org/4.0/man1/openssl-x509/
- GNU coreutils date documentation: https://www.gnu.org/software/coreutils/date

## Issues Found
- The post description claimed custom CA support, but the role only showed Let's Encrypt and Certbot-based issuance. Removed the custom CA claim and the unused `ssl_provider` default to keep the example aligned with what it actually implements.
- The certbot renewal cron hook reloaded only nginx, even though the role supports multiple services per certificate. Updated the hook to reload the unique configured services from `ssl_domains`.
- The distribution example attempted to set `cert_file` with `lookup('items', ['fullchain.pem', 'privkey.pem'])` while looping only over domains, which would not produce one valid fetch path per certificate file. Changed the fetch task to loop over the domain/file product.
- The distribution fetch task was intended to pull from a single renewal server but would run once per play host. Added `run_once: yes`.
- The copy task wrote certificates under `/etc/ssl/{{ item.0.name }}/...` without ensuring those directories existed. Added a directory creation task before copying certificates.

## Review Notes
- The YAML snippets parse successfully after the fixes.
- Ansible was not installed in the local environment, so module behavior was verified against official Ansible documentation rather than by executing the playbook.
