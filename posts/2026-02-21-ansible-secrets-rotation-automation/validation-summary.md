# Validation Summary: How to Use Ansible for Secrets Rotation Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible built-in modules and lookup plugins
- community.postgresql collection
- ansible.posix collection
- community.crypto collection
- HashiCorp Vault CLI
- PostgreSQL password rotation
- Certbot TLS certificate renewal
- SSH authorized keys
- Cron scheduling

## Sources Consulted
- Ansible password lookup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/password_lookup.html
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible hostvars and facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible slurp module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/slurp_module.html
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible Vault password documentation: https://docs.ansible.com/projects/ansible-core/devel/vault_guide/vault_managing_passwords.html
- community.postgresql postgresql_user documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_user_module.html
- community.postgresql postgresql_ping documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_ping_module.html
- ansible.posix authorized_key documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/authorized_key_module.html
- community.crypto openssh_keypair documentation: https://docs.ansible.com/projects/ansible/12/collections/community/crypto/openssh_keypair_module.html
- HashiCorp Vault kv put documentation: https://developer.hashicorp.com/vault/docs/commands/kv/put
- HashiCorp Vault CLI argument documentation: https://developer.hashicorp.com/vault/docs/commands#passing-command-arguments
- Certbot command-line documentation: https://eff-certbot.readthedocs.io/en/stable/using.html

## Issues Found
- The database password play generated `new_db_password` on `localhost` and then referenced it directly from other plays. Changed those references to `hostvars['localhost'].new_db_password` so the value is read from the host where it was set.
- The password lookup used older inline argument syntax. Updated it to the current FQCN and keyword argument form shown in the Ansible documentation.
- The database password was written to Vault through a command task without `no_log`. Added `no_log: true` so the secret is not exposed in Ansible output.
- The PostgreSQL ping task used the `db` alias, which current documentation marks as deprecated. Changed it to `login_db`.
- The database and API key examples notified `restart application` but did not define a handler. Added matching service handlers using `app_service`.
- The API key example generated the key inside a `serial: 1` rolling play with `run_once`, which can run once per batch and produce multiple keys. Split key creation and key revocation into localhost plays and kept the rolling application update in the app-server play.
- The TLS certificate deployment play referenced `new_cert` and `new_key` directly even though those values were registered on `localhost`. Changed those references to `hostvars['localhost']`.
- The SSH key generation example did not set an explicit private-key mode. Added `mode: '0600'` to match secure file-permission guidance.
- The Vault examples used the older path-style KV syntax. Updated them to `vault kv put -mount=secret ...`, matching current Vault documentation for KV mounts.
- The cron example described the schedule as "every 90 days" but `day: "1"` with `month: "*/3"` is quarterly, not exactly every 90 days. Updated the task name to "quarterly".
- The cron example passed `/opt/ansible/vault-pass` with `-e @...`, which loads extra variables rather than providing an Ansible Vault password file. Changed it to `--vault-password-file /opt/ansible/vault-pass`.

## Review Notes
The examples still assume site-specific variables and infrastructure exist, including `app_service`, `app_config_dir`, `lb_api`, `vault_addr`, service API endpoints, and working Certbot Route53 credentials. The TLS health check assumes `inventory_hostname` is covered by the deployed certificate or otherwise resolves to a hostname valid for certificate verification.
