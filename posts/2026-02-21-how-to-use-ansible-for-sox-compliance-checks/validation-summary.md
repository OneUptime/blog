# Validation Summary: How to Use Ansible for SOX Compliance Checks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules: include_tasks, lineinfile, command, assert, service_facts, template, cron, include_vars, package, service, copy, set_fact, debug
- OpenSSH server configuration
- Linux password policy files: pwquality.conf, faillock.conf, login.defs
- auditd audit rules
- LUKS disk encryption checks
- OpenSSL certificate checks
- UFW and ss network validation
- GitHub Actions workflow syntax

## Sources Consulted
- Ansible ansible.builtin.lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible check mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible ansible.builtin.assert module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible ansible.builtin.service_facts module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible ansible.builtin.cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible ansible.builtin.regex_search filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/regex_search_filter.html
- OpenSSL x509 command documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- OpenSSH sshd_config manual page: https://man.openbsd.org/sshd_config
- Linux pam_pwquality manual page: https://manpages.debian.org/trixie/libpam-pwquality/pam_pwquality.8.en.html
- pwquality.conf manual page: https://man.archlinux.org/man/pwquality.conf.5.en
- GitHub-hosted runners documentation: https://docs.github.com/en/actions/reference/runners/github-hosted-runners

## Issues Found
- The access control example validated `passwordauthentication no` but did not show the corresponding remediation task. Added a `PasswordAuthentication no` `lineinfile` task so the enforcement and validation snippets are consistent.
- The GitHub Actions example ran the validation playbook with `--check`. Ansible's `command` module is skipped in check mode unless `creates` or `removes` is supplied, so the registered validation output would not be reliable. Removed `--check` because the validation playbook already uses read-only commands and assertions.
- The LUKS example collected `lsblk -f` output but did not validate that encryption was present. Added an assertion for `crypto_LUKS` in the command output.
- The TLS certificate example used `openssl x509 -noout -dates`, which prints validity dates but does not fail for an expired certificate. Replaced it with `openssl x509 -noout -checkend 0`, which returns non-zero if the certificate has expired.
- The prohibited-port check used a plain substring comparison, so ports such as `21` could match unrelated text or other port numbers. Replaced it with a `regex_search` assertion that checks listening socket address fields.

## Review Notes
The examples are Linux-oriented and assume common package/service names such as `auditd`, `sshd`, `ufw`, and `/etc/security/*` paths; these can vary by distribution. Local `ansible-playbook` was not installed in the review environment, so full Ansible syntax-check execution was not available; all YAML code blocks were parsed successfully with PyYAML.
