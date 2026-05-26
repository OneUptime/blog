# Validation Summary: How to Use Ansible for Automated Security Scanning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules: `include_tasks`, `include_vars`, `lineinfile`, `assert`, `service_facts`, `template`, `cron`, `command`, `package`, `service`, `copy`, `set_fact`, and `debug`
- OpenSSH server configuration validation with `sshd -T`
- Linux audit daemon (`auditd`) service and rules
- Linux password policy files: `/etc/security/pwquality.conf`, `/etc/security/faillock.conf`, and `/etc/login.defs`
- LUKS volume detection with `lsblk`
- TLS certificate checks with `openssl x509`
- Firewall and listening socket checks with `ufw` and `ss`
- GitHub Actions scheduled workflows
- Cron scheduling

## Sources Consulted
- Ansible `ansible.builtin.lineinfile` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.builtin.assert` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible `ansible.builtin.service_facts` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible `ansible.builtin.command` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible check mode documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible delegation documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible `ansible.builtin.cron` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- OpenSSL `x509` documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- OpenSSH `sshd_config` manual: https://man.openbsd.org/sshd_config
- Local command help for `openssl x509 -help` and `ss --help`

## Issues Found
- The post description claimed the article used OpenSCAP and Lynis, but the post only demonstrates custom Ansible compliance playbooks. Updated the description to match the actual technical content.
- The GitHub Actions example ran the validation playbook with `--check`. Ansible command tasks without `creates` or `removes` do not produce normal command output in check mode, so the registered variables used by later assertions would not be reliable. Removed `--check` from the validation workflow command.
- The LUKS example ran `lsblk -f` but did not assert that encrypted volumes were found. Added an `ansible.builtin.assert` check for `crypto_LUKS` in the command output.
- The TLS certificate example used `openssl x509 -dates` and then asserted only that the command parsed the certificate successfully. That did not verify expiration. Replaced it with `openssl x509 -checkend 0 -noout -in /etc/ssl/certs/app.pem` and asserted on the return code.
- The listening port example searched for port numbers as plain substrings in `ss` output, which could produce false positives. Replaced it with per-port `ss -H -tln sport = :{{ item }}` checks and asserted that each prohibited port returns no listening sockets.

## Review Notes
The examples are Linux-oriented and assume distro-specific paths, service names, and tools such as `auditd`, `ufw`, `/etc/security/pwquality.conf`, and `/etc/security/faillock.conf`. That is acceptable for a practical guide, but a future revision could call out supported distributions explicitly.
