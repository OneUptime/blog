# Validation Summary: How to Use Ansible for Continuous Compliance Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks, roles, task includes, conditionals, handlers, and modules
- Ansible compliance validation and remediation workflows
- GitHub Actions
- OpenSSH server configuration validation
- auditd
- cron
- UFW and Linux socket inspection with ss
- OpenSSL X.509 certificate checks
- LUKS block-device encryption checks

## Sources Consulted
- Ansible `include_tasks` and loop documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible `assert` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible `lineinfile` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `service_facts` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible `cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible conditionals and Jinja expression documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible installation documentation: https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- GitHub-hosted runners documentation: https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- OpenSSL `x509` documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- Ubuntu `lsblk` man page: https://manpages.ubuntu.com/manpages/noble/man8/lsblk.8.html

## Issues Found
- The auditd validation accessed `ansible_facts.services['auditd.service']` directly, which can fail with an undefined-key error when auditd is absent. Changed it to use `.get()` so the assertion cleanly evaluates to false.
- The GitHub Actions example ran `ansible-playbook` without installing Ansible and without specifying an inventory. Added an Ansible install step and passed `-i inventory`.
- The TLS certificate example used `openssl x509 -dates`, which prints validity dates but does not fail when a certificate is expired. Changed it to `-checkend 0` so the return code validates that the certificate is currently valid.
- The LUKS example collected `lsblk -f` output but did not assert that encryption was present. Added an assertion for `crypto_LUKS` in the filesystem-type output.
- The unauthorized-port check used a plain substring search, so a prohibited port such as `23` could match unrelated ports such as `1234`. Changed the check to look for the socket port pattern with a trailing space.
- The report-generation example recorded successful password-complexity checks but never recorded a failure. Added a password failure fact when the grep command does not find the setting.

## Review Notes
The examples are Linux-focused and assume paths and service names common on systemd-based distributions. In a production compliance role, these controls should be parameterized by distribution family and compliance framework, and destructive remediation should be gated by change-control policy.
