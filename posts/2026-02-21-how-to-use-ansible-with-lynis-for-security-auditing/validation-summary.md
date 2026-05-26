# Validation Summary: How to Use Ansible with Lynis for Security Auditing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and built-in modules
- GitHub Actions
- OpenSSH server configuration
- Linux PAM password quality and faillock configuration
- OpenSSL X.509 certificate checks
- Linux service, cron, firewall, socket, audit, and password-aging configuration

## Sources Consulted
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `ansible.builtin.service_facts` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible installation documentation: https://docs.ansible.com/ansible/8/installation_guide/intro_installation.html
- OpenSSL `x509` documentation: https://docs.openssl.org/3.2/man1/openssl-x509/
- Local `pwquality.conf(5)`, `faillock(8)`, `ss(8)`, `sshd_config(5)`, and `login.defs(5)` manual pages

## Issues Found
- The original title, tags, and description claimed the post covered Lynis, but the article did not include any Lynis installation, commands, configuration, or output. Updated the title and metadata to describe Ansible-based compliance validation, which is what the examples implement.
- The GitHub Actions example ran `ansible-playbook` without installing Ansible on the runner. Added an installation step using `python -m pip install ansible`.
- The GitHub Actions example used `ansible-playbook --check` for a validation playbook that depends on arbitrary `ansible.builtin.command` tasks. Ansible command tasks are skipped in check mode unless `creates` or `removes` is used, so the validation would not run as shown. Removed `--check`.
- The certificate example used `openssl x509 -dates` and only checked the command return code, which verifies that a certificate can be parsed but does not assert that it is unexpired. Changed it to `openssl x509 -checkend 0`, which exits non-zero if the certificate is already expired.
- The unauthorized-port assertion checked whether the bare port string appeared anywhere in `ss` output, which could produce false positives from unrelated text such as another port, PID, or process argument. Replaced it with a regex check against socket endpoint formatting.

## Review Notes
- The examples are Linux- and systemd-oriented. Service names such as `auditd.service` and `sshd` can vary by distribution.
- The password-aging snippet updates `/etc/login.defs`, which affects defaults for newly created accounts; existing account aging values may need separate handling in a production role.
- YAML code fences were parsed successfully after the edits.
