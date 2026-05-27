# Validation Summary: How to Use Ansible to Monitor SSL Certificate Expiry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and modules
- OpenSSL `s_client` and `x509`
- SSL/TLS certificate expiry monitoring
- Slack webhook alerts
- SMTP email alerts with `community.general.mail`
- Certbot renewal
- Cron scheduling

## Sources Consulted
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.set_fact` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible `community.general.mail` collection documentation: https://docs.ansible.com/ansible/latest/collections/community/general/mail_module.html
- OpenSSL `s_client` documentation: https://docs.openssl.org/3.4/man1/openssl-s_client/
- OpenSSL `x509` documentation: https://docs.openssl.org/3.4/man1/openssl-x509/
- Certbot renewal and hook documentation: https://eff-certbot.readthedocs.io/en/stable/using.html#renewal
- Jinja template assignment scoping documentation: https://github.com/pallets/jinja/blob/main/docs/templates.rst
- GNU `date` documentation: https://www.gnu.org/software/coreutils/date
- Local command help for `openssl s_client`, `openssl x509`, and GNU `date`

## Issues Found
- The certificate parsing task assigned `not_after` and `subject` inside an inner Jinja loop, but Jinja loop assignments do not persist outside the loop iteration. Changed the parsing to select the `notAfter=` and `subject=` lines directly from `stdout_lines`, so the generated report receives the actual certificate expiry and subject values.
- The BSD/macOS date parsing fallback used `%d`, which can fail for OpenSSL's space-padded single-digit certificate days such as `Dec  4 07:04:05 2035 GMT`. Changed the fallback format to `%e`, which matches a space-padded day of month.
- The certificate file selector only checked `group_names[0]`, which could skip certificates for hosts that belong to the intended group but not as their first listed group. Changed the selector to match any configured `hosts` value present in `group_names`.
- The Certbot example reloaded Nginx based on `certbot_result.changed`, but Ansible command tasks report changed when they run successfully unless overridden, so Nginx would reload even when no certificate was renewed. Changed the example to use Certbot's `--deploy-hook`, which Certbot runs after successful certificate issuance or renewal.

## Review Notes
The examples use shell commands for certificate inspection, which is acceptable for this tutorial but should be treated as controller/server automation rather than untrusted user input handling. Ansible was not installed in the local environment, so Ansible behavior was verified against official documentation rather than by executing the playbooks.
