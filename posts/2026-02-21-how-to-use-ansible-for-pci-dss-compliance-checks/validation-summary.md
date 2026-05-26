# Validation Summary: How to Use Ansible for PCI DSS Compliance Checks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules: include_tasks, lineinfile, command, assert, service_facts, template, cron, include_vars, package, service, copy, set_fact, debug
- PCI DSS compliance automation concepts
- OpenSSH server configuration validation
- Linux PAM password quality and faillock configuration
- auditd audit rules
- OpenSSL certificate checks
- Linux networking tools: ss and ufw
- GitHub Actions scheduled and path-filtered workflows

## Sources Consulted
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible lineinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible assert module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible built-in collection index for include_tasks, include_vars, template, service_facts, package, service, copy, set_fact, and debug: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/index.html
- OpenSSH sshd(8) manual for `sshd -T`: https://man7.org/linux/man-pages/man8/sshd.8.html
- OpenSSL x509 command documentation for `-checkend`: https://docs.openssl.org/3.3/man1/openssl-x509/
- Ubuntu pwquality.conf manual: https://manpages.ubuntu.com/manpages/bionic/man5/pwquality.conf.5.html
- Linux pam_faillock manual: https://man7.org/linux/man-pages/man8/pam_faillock.8.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- PCI SSC document library for PCI DSS v4.0.1 reference: https://www.pcisecuritystandards.org/document_library/

## Issues Found
- The GitHub Actions example ran `ansible-playbook ... --check`, but the validation playbook depends on `ansible.builtin.command` tasks. The Ansible command module skips arbitrary commands in check mode unless `creates` or `removes` is supplied, so the validation would not actually collect command output. Removed `--check`.
- The TLS certificate task used `openssl x509 -dates` and asserted only that the command parsed the certificate. That does not prove the certificate is unexpired. Changed it to `openssl x509 -checkend 0`, which exits nonzero when the certificate is expired.
- The LUKS example collected `lsblk -f` output but did not assert that encrypted volumes were present. Added an assertion for `crypto_LUKS`.
- The prohibited-port check searched for strings like `23` anywhere in `ss -tlnp` output, which could match unrelated ports or process IDs. Changed it to query each prohibited port with `ss -H -tln sport = :<port>` and assert that the result is empty.
- The report generation example recorded a password-complexity pass but did not record a corresponding failure when `minlen` was absent. Added a failure record so the summary score reflects that check.

## Review Notes
- The examples remain Linux-distribution dependent. For example, the SSH service may be named `sshd` on RHEL-family systems and `ssh` on Debian/Ubuntu systems, and `ufw` is not the default firewall interface everywhere.
- These examples help automate control checks, but passing them is not by itself a complete PCI DSS assessment. PCI DSS validation also depends on scope, evidence, testing procedures, assessor expectations, and compensating or customized-control documentation where applicable.
