# Validation Summary: How to Use Ansible for GDPR Compliance Checks

## Status
validated

## Post Type
Tutorial / compliance automation guide

## Technologies Covered
- Ansible playbooks, roles, tasks, handlers, and check mode
- Ansible built-in modules: include_tasks, lineinfile, assert, service_facts, cron, command, package, service, copy, set_fact, debug, template, include_vars
- OpenSSH server configuration validation with sshd
- OpenSSL X.509 certificate checks
- Linux LUKS/block device inspection with lsblk
- Linux firewall and socket inspection with ufw and ss
- GitHub Actions workflow scheduling
- Linux auditd and PAM-related configuration files

## Sources Consulted
- Ansible ansible.builtin.lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.assert module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible ansible.builtin.service_facts module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible ansible.builtin.cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible regex_search filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/regex_search_filter.html
- Ansible check mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible installation guide: https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- Ansible implicit localhost documentation: https://docs.ansible.com/projects/ansible/latest/inventory/implicit_localhost.html
- OpenSSH manual page index for sshd and sshd_config: https://www.openssh.org/manual.html
- OpenSSL x509 command documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- GitHub-hosted runners documentation: https://docs.github.com/en/actions/concepts/runners/about-github-hosted-runners

## Issues Found
- The auditd validation assertion directly accessed `ansible_facts.services['auditd.service'].state`, which can raise an undefined-variable error when auditd is absent. Updated it to use `default` values so the assertion fails cleanly.
- The GitHub Actions example ran `ansible-playbook` without installing Ansible and without passing an inventory. Added an Ansible installation step and `-i inventory` to avoid relying on unavailable runner state or implicit localhost behavior.
- The LUKS data-at-rest example collected `lsblk -f` output but did not validate it. Added an assertion for `crypto_LUKS` in the block device output.
- The TLS certificate example used `openssl x509 -dates` and only checked the command return code, which verifies parseability but not expiration. Changed it to `openssl x509 -checkend 0 -noout -in ...`, which fails for an expired certificate.
- The unauthorized port check searched for bare substrings such as `21`, which can match unrelated output. Changed the socket command to `ss -H -tln` and used Ansible's `regex_search` filter to check for port-boundary matches.
- The report-generation example recorded a password-complexity pass but did not record a corresponding failure. Added a failure case so the report counts that control accurately.

## Review Notes
The examples are Linux-focused and assume common Debian/Ubuntu-style paths and service names such as `ufw`, `auditd.service`, `/etc/security/pwquality.conf`, and `/etc/security/faillock.conf`. In a future revision, the post could call out distribution-specific differences and GDPR's risk-based nature more explicitly, but the reviewed snippets are now technically coherent as examples.
