# Validation Summary: How to Use Ansible to Automate SOC 2 Compliance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules: command, stat, uri, template, include_vars, include_tasks, assert, lineinfile, package, service, copy, debug
- SOC 2 Trust Services Criteria
- OpenSSH server configuration
- PAM SSH configuration
- UFW firewall checks
- Fail2ban service checks
- Cron backup checks
- LUKS, OpenSSL, TLS certificate checks
- Linux auditd rules
- Linux socket inspection with ss

## Sources Consulted
- Ansible ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible tags documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible assert module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible lineinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- OpenSSL x509 command documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- AICPA Trust Services Criteria, TSP Section 100: https://us.aicpa.org/content/dam/aicpa/interestareas/frc/assuranceadvisoryservices/downloadabledocuments/trust-services-criteria-redlined.pdf

## Issues Found
- The MFA task only checked for `/etc/pam.d/sshd`, which verifies that PAM SSH configuration exists, not that MFA is configured. Changed the task name to "Verify PAM SSH configuration" so the description matches the actual check.
- The Fail2ban check used the systemd module with `state: started` in check mode. That predicts or enforces a desired state rather than directly testing whether intrusion detection is active. Changed it to `systemctl is-active fail2ban` with `changed_when: false` and `failed_when: false`.
- The root crontab backup check could fail the play before recording a FAIL result when root has no crontab. Added `failed_when: false` so the subsequent evidence-recording task can evaluate the result.
- The TLS certificate task used `openssl x509 -dates`, which prints certificate dates but does not fail when the certificate is expired. Changed it to `openssl x509 -checkend 0`, which exits nonzero when the certificate is expired.
- The unauthorized port check searched for bare strings such as `21` in `ss` output, which could match unrelated values. Changed the assertion to use a port-oriented regex pattern.

## Review Notes
- The examples are Linux-oriented and assume tools such as UFW, systemd, Fail2ban, auditd, OpenSSH, crontab, OpenSSL, and ss are present on managed hosts.
- Service names such as `sshd` can vary by distribution, for example `ssh` on some Debian-based systems.
- The SOC 2 examples are evidence-gathering patterns, not a complete SOC 2 control framework or auditor-approved control matrix.
