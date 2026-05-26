# Validation Summary: How to Use Ansible for Change Audit Trails

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules: include_tasks, lineinfile, assert, service_facts, template, cron, package, service, copy, set_fact, debug, command
- GitHub Actions workflows
- OpenSSH server configuration validation
- auditd rules
- OpenSSL certificate validation
- Linux firewall and socket inspection commands

## Sources Consulted
- Ansible documentation: ansible.builtin.command - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible documentation: ansible.builtin.assert - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible documentation: ansible.builtin.lineinfile - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible documentation: ansible.builtin.cron - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible documentation: ansible.builtin.service_facts - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible documentation: ansible.builtin.include_tasks - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible documentation: ansible.builtin.copy - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible documentation: ansible.builtin.template - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Local command help: `openssl x509 -help`
- Local command help: `ss --help`
- Local command help: `ufw --help`

## Issues Found
- The GitHub Actions example ran `ansible-playbook playbooks/validate_compliance.yml --check`. Because `ansible.builtin.command` only has partial check-mode support and skips command execution without `creates` or `removes`, the registered validation variables could be missing. Removed `--check`; the validation playbook is already non-mutating through read-only commands and `changed_when: false`.
- The LUKS validation example ran `lsblk -f` but did not assert that any LUKS volume was present. Added an `ansible.builtin.assert` check for `crypto_LUKS` in the command output.
- The TLS certificate example used `openssl x509 -dates` and only checked the command return code, which confirms parsing but not expiry. Changed it to `openssl x509 -checkend 0 -noout -in /etc/ssl/certs/app.pem` and kept the return-code assertion, so an expired certificate fails validation.
- The listening-port example used `ss -tlnp`, which checks TCP listeners only while the prohibited port list includes UDP port 69. Changed the command to `ss -tulnp` to include both TCP and UDP listeners.
- The generated report recorded a pass for password complexity but did not record a failure when the check failed. Added a corresponding `checks_failed` entry when `pwquality.rc != 0`.

## Review Notes
- The post title and description emphasize change audit trails, while most examples focus on compliance validation and remediation. The technical content is still relevant, but a future editorial pass could align the framing more closely with the examples.
- The examples are Linux-focused and assume tools and paths such as `sshd`, `auditd`, `ufw`, `/etc/security/pwquality.conf`, and `/etc/security/faillock.conf` exist on the managed hosts.
