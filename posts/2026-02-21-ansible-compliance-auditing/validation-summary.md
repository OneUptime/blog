# Validation Summary: How to Use Ansible to Automate Compliance Auditing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks, roles, facts, handlers, and built-in modules
- OpenSSH server configuration
- OpenSSL certificate checks
- UFW firewall validation
- Linux auditd audit rules
- Linux networking and account policy commands

## Sources Consulted
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible playbook error handling documentation for `failed_when` and `changed_when`: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible `ansible.builtin.include_tasks` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- OpenSSH `sshd(8)` manual for `sshd -T` and SSH protocol support: https://man.openbsd.org/sshd.8
- OpenSSH `sshd_config(5)` manual for `PermitRootLogin`, `MaxAuthTries`, `PasswordAuthentication`, and related directives: https://man.openbsd.org/sshd_config.5
- OpenSSL `openssl-x509` documentation for `-dates` and `-checkend`: https://docs.openssl.org/3.4/man1/openssl-x509/
- Linux audit rules manual: https://man7.org/linux/man-pages/man7/audit.rules.7.html
- Linux `ss(8)` manual for listening TCP socket output options: https://man7.org/linux/man-pages/man8/ss.8.html
- Ubuntu Server firewall documentation for UFW usage: https://documentation.ubuntu.com/server/how-to/security/firewalls/

## Issues Found
- The SSH audit example checked `Protocol` with `grep` in `/etc/ssh/sshd_config`. Modern OpenSSH supports SSH protocol 2 only, and effective server configuration should be checked with `sshd -T` rather than grepping the base config file. Updated the check to use `sshd -T` and record protocol support based on OpenSSH's effective configuration.
- The SSH root-login and `MaxAuthTries` checks grepped only `/etc/ssh/sshd_config`, which can miss defaults, included files, and effective values. Updated them to parse the `sshd -T` output instead.
- The `MaxAuthTries` check could incorrectly pass when the setting was absent because an empty grep result could be converted to `0`. Updated the logic to fall back to the OpenSSH default of `maxauthtries 6`.
- The compliance score formulas could divide by zero if no checks were recorded. Updated the formulas to return `0` when there are no results.
- The certificate example used `openssl x509 -dates`, then asserted only that the command succeeded. That verifies parseability but not expiry. Updated it to use `openssl x509 -checkend 0`, which fails for an expired certificate.
- The LUKS encryption example collected `lsblk -f` output but did not assert on it. Added an assertion for `crypto_LUKS` so the example actually validates the stated control.
- The unauthorized port example tested whether a raw port string appeared anywhere in `ss` output, which could match unrelated digits. Updated it to check the local-address port pattern instead.
- The password complexity report recorded a pass but did not record a failure when `minlen` was missing. Added a failure record so the report and score reflect that condition.

## Review Notes
The examples are intentionally simplified and should be adapted to each compliance framework. The audit rule, firewall, and SSH hardening snippets use valid commands and Ansible module patterns, but production roles should account for distribution differences such as service names, package availability, and whether systems use UFW, firewalld, nftables, or another firewall manager.
