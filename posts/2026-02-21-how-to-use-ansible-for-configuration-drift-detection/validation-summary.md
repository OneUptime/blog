# Validation Summary: How to Use Ansible for Configuration Drift Detection

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks and built-in modules
- Ansible check mode and diff mode
- GitHub Actions scheduled workflows
- OpenSSH server configuration
- Linux PAM password quality and faillock configuration
- Linux auditd rules
- OpenSSL certificate checks
- Linux networking tools (`ss`, `ufw`)
- Linux block device inspection (`lsblk`)

## Sources Consulted
- Ansible `lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `assert` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible `service_facts` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible `include_tasks` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible implicit localhost documentation: https://docs.ansible.com/projects/ansible/latest/inventory/implicit_localhost.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/reference/workflow-syntax-for-github-actions
- OpenSSH `sshd_config(5)` manual: https://man7.org/linux/man-pages/man5/sshd_config.5.html
- Linux audit rules manual: https://man7.org/linux/man-pages/man7/audit.rules.7.html
- Linux `pam_faillock(8)` manual: https://www.man7.org/linux/man-pages/man8/pam_faillock.8.html
- OpenSSL `x509 -help` output from the local environment
- `ss --help` output from the local environment
- `lsblk --help` output from the local environment

## Issues Found
- The `lineinfile` examples for `pwquality.conf`, `sshd_config`, `faillock.conf`, and `login.defs` only matched uncommented directives. Updated the regular expressions to match commented defaults and whitespace so remediation updates the existing setting instead of appending a duplicate line.
- The auditd validation directly indexed `ansible_facts.services['auditd.service']`, which could fail with an undefined-key error if the service was absent. Changed it to use safe dictionary lookups.
- The GitHub Actions example ran `ansible-playbook` without an inventory, which can skip `hosts: all` plays because Ansible's implicit localhost does not match `all`. Added an explicit `-i inventory` argument and included `--diff` to match the post's drift-detection description.
- The LUKS example ran `lsblk -f` but did not assert that LUKS was present. Added an assertion for `crypto_LUKS` in the output.
- The TLS certificate example used `openssl x509 -dates` and only checked the command exit code, which verifies that the certificate can be parsed but does not prove it is unexpired. Replaced it with `openssl x509 -checkend 0 -noout`.
- The unauthorized-port check searched for raw substrings like `21` in all `ss` output, which can produce false positives. Changed it to query each prohibited TCP port with an `ss` sport filter and assert that no rows are returned.

## Review Notes
The examples are Linux-focused and assume service names such as `sshd` and `auditd`, UFW availability, and paths such as `/etc/security/pwquality.conf`. Those assumptions are reasonable for a concise guide, but a production role would usually parameterize them by distribution and compliance baseline.
