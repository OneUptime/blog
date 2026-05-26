# Validation Summary: How to Use Ansible to Run Idempotent Shell Commands

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- `ansible.builtin.command`
- `ansible.builtin.shell`
- `ansible.builtin.stat`
- `ansible.builtin.service`
- Ansible conditionals, registered variables, `changed_when`, and `failed_when`
- OpenSSL certificate expiry checks
- Linux administration commands including `swapon`, `timedatectl`, `sysctl`, `iptables`, `crontab`, and `mount`

## Sources Consulted
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.shell` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible error handling and `changed_when` documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible conditionals and registered variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible `ansible.builtin.stat` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible `ansible.builtin.service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- OpenSSL `openssl-x509` documentation: https://docs.openssl.org/3.3/man1/openssl-x509/

## Issues Found
- The introduction said `command` and `shell` tasks run every time and always report changed. This is true by default, but Ansible supports `creates` and `removes` for both modules. Updated the wording to say "By default" so it does not conflict with the documented `creates`/`removes` behavior.
- The PostgreSQL configuration example used `sed` to replace an existing `max_connections` line, but would still report `CHANGED` without modifying the file if the setting was absent. Updated the script to replace the setting when present and append it when missing.
- The SSL certificate renewal example claimed to renew only when a certificate was expiring within 30 days, but the condition only checked that an expiry string existed. Updated it to use `openssl x509 -checkend 2592000`, with `failed_when: false`, and renew only when OpenSSL reports the certificate expires within the next 30 days.

## Review Notes
- The post intentionally demonstrates shell-command idempotency patterns, but several examples have better built-in Ansible module alternatives in production, such as `user`, `cron`, `mount`, `lineinfile`, `sysctl`, package modules, or service handlers.
- The `service` task gated with `when: config_gen is changed` is technically valid, but a handler would usually be the more idiomatic Ansible pattern for restarting services after configuration changes.
- `sysctl -w` changes the runtime kernel parameter only. A production playbook should also persist the setting when persistence is required.
