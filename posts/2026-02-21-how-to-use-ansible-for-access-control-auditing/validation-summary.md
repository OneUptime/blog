# Validation Summary: How to Use Ansible for Access Control Auditing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules: lineinfile, command, assert, service_facts, template, cron, include_tasks, include_vars, package, service, copy, set_fact, debug
- OpenSSH sshd configuration validation
- auditd and Linux audit rules
- PAM password quality and faillock configuration
- LUKS disk encryption checks with cryptsetup
- OpenSSL X.509 certificate validation
- Linux socket inspection with ss
- GitHub Actions scheduled workflows
- cron scheduling

## Sources Consulted
- Ansible lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible check mode documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- OpenSSH sshd manual: https://man.openbsd.org/sshd
- OpenSSL x509 documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- ss(8) Linux manual page: https://www.man7.org/linux/man-pages/man8/ss.8.html
- faillock(8) Linux manual page: https://www.man7.org/linux/man-pages/man8/faillock.8.html
- cryptsetup-isLuks manual page: https://man7.org/linux/man-pages/man8/cryptsetup-isLuks.8.html

## Issues Found
- The GitHub Actions example ran the validation playbook with `--check`. Ansible command tasks without `creates` or `removes` do not execute in check mode, so the registered values used by later assertions could be missing or skipped. Changed the workflow command to run the read-only validation playbook normally.
- The auditd service assertion indexed `ansible_facts.services['auditd.service']` directly. If the service is absent, that can fail with an undefined-key error instead of producing the intended assertion failure. Changed it to use `.get(..., {})` with a default state comparison.
- The LUKS example claimed to check whether data volumes were LUKS encrypted, but only ran `lsblk -f` and did not assert anything about the result. Changed it to run `cryptsetup isLuks` for each `data_volumes` item and assert a zero return code.
- The TLS certificate example claimed to verify that the certificate was not expired, but `openssl x509 -dates` only prints dates and succeeds for expired certificates if the file parses. Changed it to use `openssl x509 -checkend 0`, which fails when the certificate is expired.
- The unauthorized-port check searched for strings such as `21` anywhere in `ss -tlnp` output, which could produce false positives from addresses, PIDs, or other fields. Changed it to query each prohibited TCP listening port directly with `ss -H -tln sport = :<port>` and assert empty output.

## Review Notes
- The examples are Linux-focused and assume paths and service names common on distributions that use `sshd`, `auditd`, `/etc/security/pwquality.conf`, and `/etc/security/faillock.conf`. Other distributions may require service-name or PAM-stack adjustments.
- `data_volumes` must be defined by the user or inventory for the LUKS validation snippet to run.
- `sshd -T` is the right command family for printing effective OpenSSH server configuration, but production playbooks should still validate configuration file edits before restarting SSH.
