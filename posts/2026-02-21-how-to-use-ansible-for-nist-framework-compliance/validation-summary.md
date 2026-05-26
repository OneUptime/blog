# Validation Summary: How to Use Ansible for NIST Framework Compliance

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ansible playbooks and built-in modules
- GitHub Actions workflows
- NIST Cybersecurity Framework compliance automation
- OpenSSH server configuration validation
- Linux auditd, password policy, firewall, TLS, and port validation

## Sources Consulted
- Ansible documentation: `ansible.builtin.lineinfile` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible documentation: `ansible.builtin.command` module and check mode behavior: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible documentation: check mode and diff mode: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible documentation: `ansible.builtin.assert` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible documentation: `ansible.builtin.cron` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible documentation: `ansible.builtin.service_facts` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible documentation: regex/search tests: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tests.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions runner images software list: https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md
- NIST Cybersecurity Framework official resources and FAQ: https://www.nist.gov/cyberframework
- OpenSSL `openssl x509` documentation: https://docs.openssl.org/4.0/man1/openssl-x509/
- OpenSSH `sshd_config` manual page: https://man7.org/linux/man-pages/man5/sshd_config.5.html

## Issues Found
- The validation and reporting examples used `ansible.builtin.command` tasks while also showing `ansible-playbook --check` in CI. Ansible skips arbitrary command tasks in check mode unless `creates`/`removes` is used or check mode is disabled for that task. Added `check_mode: false` to read-only command checks so registered outputs are available to subsequent assertions.
- The TLS certificate example used `openssl x509 -noout -dates` but labeled the assertion as an expiration check. That command prints validity dates but does not fail for an expired certificate. Replaced it with `openssl x509 -noout -checkend 0`, which fails when the certificate is expired.
- The listening-port validation checked whether strings such as `"21"` appeared anywhere in `ss` output. That could incorrectly match PIDs or larger port numbers. Changed the command to `ss -tlnH` and updated the assertion to match port fields with a regex.
- The report generation example recorded password complexity success but did not record failure when `minlen` was missing. Added a matching failure fact so the report score reflects that check.

## Review Notes
- The examples are Linux-oriented and assume distribution-specific paths and services such as `/etc/security/pwquality.conf`, `/etc/security/faillock.conf`, `auditd.service`, `ufw`, and `sshd`. These are valid examples, but production playbooks should usually branch by OS family and package/service naming.
- Ansible was not installed in the local review environment, so module behavior was verified against official documentation and the Markdown YAML snippets were parsed locally with PyYAML.
