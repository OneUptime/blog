# Validation Summary: How to Generate Compliance Reports with Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules: lineinfile, include_tasks, assert, service_facts, template, cron, include_vars, command, package, service, copy, set_fact
- OpenSSH server configuration validation
- OpenSSL certificate checks
- Linux service, firewall, auditd, cron, and socket inspection commands
- GitHub Actions workflow scheduling

## Sources Consulted
- Ansible ansible.builtin.lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible check mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible ansible.builtin.assert module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible ansible.builtin.service_facts module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible ansible.builtin.template module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible ansible.builtin.cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible ansible.builtin.include_tasks module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible ansible.builtin.include_vars module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible ansible.builtin.package module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible ansible.builtin.service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- OpenSSL x509 documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- GitHub-hosted runners documentation: https://docs.github.com/en/actions/using-github-hosted-runners/using-github-hosted-runners/about-github-hosted-runners
- Local command help output for openssl x509 and ss

## Issues Found
- The description promised CSV exports and executive summaries, but the post only shows HTML/report-summary examples. Updated the description to match the implemented examples.
- Read-only command tasks used in validation examples would be skipped when the playbook is run with `--check`, because Ansible command tasks have only partial check-mode support unless guarded by creates/removes. Added `check_mode: false` to read-only command checks so validation still runs in check mode without changing systems.
- The auditd assertion indexed `ansible_facts.services['auditd.service']` directly, which can raise an undefined-variable error when auditd is absent instead of producing a clean failed assertion. Changed it to use `.get()` with a default stopped state.
- The TLS certificate task printed certificate dates and only checked the command return code, which does not prove the certificate is unexpired. Changed it to use `openssl x509 -checkend 0`, which fails for an expired certificate.
- The listening-port check used `ss -tlnp`, which checks TCP only while the prohibited list includes UDP port 69. Changed it to `ss -tulnp`.
- The unauthorized-port assertion searched for raw substrings such as `23`, which could match unrelated ports or process IDs. Replaced it with a port-boundary regex filter against the socket output.
- The report generation example recorded password complexity success but did not record a failure when the check failed, producing an incomplete score. Added a matching password failure fact.

## Review Notes
The snippets are Linux-focused and assume paths, service names, and package names common on systemd-based distributions. A production role should usually branch by distribution family for package names, service names, SSH daemon restart behavior, firewall tooling, and PAM/password-quality configuration paths.
