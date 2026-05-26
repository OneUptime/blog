# Validation Summary: How to Use Ansible for Logging Compliance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks, roles, handlers, and built-in modules
- Linux SSH hardening with OpenSSH
- Linux audit logging with auditd rules
- PAM password quality and faillock configuration
- OpenSSL certificate checks
- Linux firewall and socket inspection commands
- GitHub Actions scheduled workflows

## Sources Consulted
- Ansible `include_tasks` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible `lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `assert` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible `service_facts` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible `cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible check mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible `copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- OpenSSH `sshd` manual page: https://man.openbsd.org/sshd.8
- OpenSSH `sshd_config` manual page: https://manpages.ubuntu.com/manpages/jammy/man5/sshd_config.5.html
- OpenSSL `x509` command documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- Linux audit rules manual page: https://man7.org/linux/man-pages/man7/audit.rules.7.html
- Red Hat audit rule documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/security_guide/sec-defining_audit_rules_and_controls
- pam_pwquality manual page: https://manpages.ubuntu.com/manpages/noble/man8/pam_pwquality.8.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/reference/workflow-syntax-for-github-actions

## Issues Found
- The `lineinfile` examples only matched active, uncommented settings. Updated the regular expressions for SSH, password quality, faillock, and password aging settings so they also replace commented defaults and remain idempotent.
- The CI example ran the validation playbook with `--check`. Ansible's `command` module skips command execution in check mode unless `creates` or `removes` is supplied, so the registered validation output could be missing. Removed `--check` from the read-only validation playbook invocation.
- The certificate example claimed to verify expiration but only printed certificate dates and checked the command return code. Replaced `-dates` with `-checkend 0`, which makes OpenSSL fail when the certificate is expired.
- The LUKS example collected `lsblk -f` output but did not assert that encryption was present. Added an assertion checking for `crypto_LUKS` in the block device output.
- The unauthorized port assertion checked for raw port digits anywhere in `ss` output, which could match unrelated text. Tightened the assertion to look for a port delimiter pattern.

## Review Notes
- The examples are Linux-focused and assume common Red Hat or Ubuntu-style paths and service names. In production, service names such as `sshd` versus `ssh`, firewall tooling such as `ufw`, and audit rule loading behavior should be adjusted per distribution.
