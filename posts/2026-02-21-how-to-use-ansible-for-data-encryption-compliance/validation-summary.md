# Validation Summary: How to Use Ansible for Data Encryption Compliance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- GitHub Actions workflow configuration
- OpenSSH server configuration
- Linux password quality and account lockout configuration
- LUKS disk encryption checks
- OpenSSL certificate checks
- Linux firewall and socket inspection commands
- Linux audit rules

## Sources Consulted
- Ansible `ansible.builtin.command` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.assert` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible `ansible.builtin.cron` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `ansible.builtin.include_tasks` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible `ansible.builtin.lineinfile` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- OpenSSL `openssl-x509` documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- OpenSSH `sshd_config(5)` manual: https://man7.org/linux/man-pages/man5/sshd_config.5.html
- `faillock.conf(5)` manual: https://man7.org/linux/man-pages/man5/faillock.conf.5.html
- Linux audit rules manual: https://man7.org/linux/man-pages/man7/audit.rules.7.html
- `ss(8)` manual: https://man7.org/linux/man-pages/man8/ss.8.html
- `lsblk(8)` manual: https://man7.org/linux/man-pages/man8/lsblk.8.html
- Debian `pwquality.conf(5)` manual: https://manpages.debian.org/testing/libpwquality-common/pwquality.conf.5.en.html

## Issues Found
- The TLS certificate example used `openssl x509 -noout -dates` and then only checked the command return code. That confirms the certificate can be parsed, but it does not fail for an expired certificate. Changed the command to use `openssl x509 -noout -checkend 0`, which returns a failing status when the certificate has expired.
- The LUKS data-at-rest example collected `lsblk -f` output but did not validate that encrypted volumes were present. Added an assertion for `crypto_LUKS` in the output so the example actually enforces the stated check.
- The GitHub Actions example ran `ansible-playbook ... --check` for a validation playbook that uses `ansible.builtin.command`. The Ansible command module has only partial check-mode support and arbitrary commands are skipped without `creates` or `removes`, so the validation would not reliably run. Removed `--check` and added an Ansible install step.
- The listening-port assertion checked whether a port string appeared anywhere in `ss` output, which can match unrelated values. Updated it to check for the port followed by whitespace, matching socket output more precisely.
- The generated report recorded a password-complexity pass but did not record the corresponding failure, which could underreport failed controls. Added a password failure record when the `grep` check fails.

## Review Notes
- The README code blocks were parsed successfully as YAML with PyYAML. Ansible is not installed in this workspace, so `ansible-playbook --syntax-check` could not be run locally.
- Some examples are intentionally Linux-distribution-specific, such as `ufw`, `auditd.service`, `/etc/security/pwquality.conf`, and `/etc/security/faillock.conf`. They are technically plausible, but production roles should usually branch by OS family and service manager.
