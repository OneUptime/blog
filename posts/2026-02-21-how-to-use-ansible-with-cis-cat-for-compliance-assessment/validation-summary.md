# Validation Summary: How to Use Ansible with CIS-CAT for Compliance Assessment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules: lineinfile, command, assert, service_facts, cron, include_tasks, include_vars, template, package, service, copy, set_fact, debug
- GitHub Actions workflow scheduling and path filters
- OpenSSH server configuration checks
- OpenSSL X.509 certificate validation
- Linux auditd, cron, UFW, ss, LUKS, and password policy configuration

## Sources Consulted
- Ansible lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible assert module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible service_facts module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible template module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- CIS-CAT Pro Assessor CLI documentation: https://ciscat-assessor.docs.cisecurity.org/en/latest/CLI/
- OpenSSL x509 help output for `-checkend`
- Local `ss -h` output for listening socket filter options

## Issues Found
- The post title, tags, and description claimed CIS-CAT integration, but the examples did not invoke CIS-CAT Pro Assessor or use its CLI. Updated the post metadata and title to describe generic Ansible compliance assessment instead.
- The CI/CD example used `ansible-playbook --check` for a validation playbook that relies on `ansible.builtin.command`. The command module has only partial check-mode support and skips execution without `creates` or `removes`, so the validation tasks could fail or not validate anything. Removed `--check`.
- The auditd assertion accessed `ansible_facts.services['auditd.service'].state` directly, which can fail with a missing-key error if auditd is not present. Updated it to default to `stopped` when the service fact is missing.
- The TLS certificate check used `openssl x509 -dates`, which prints certificate validity dates but does not fail for an expired certificate. Replaced it with `openssl x509 -checkend 0 -noout`, which exits nonzero when the certificate has expired.
- The unauthorized-port check searched for port strings anywhere in `ss -tlnp` output, which could produce false positives from unrelated substrings. Updated it to query each prohibited local port with an `ss` socket filter and assert that no output is returned.

## Review Notes
The examples are Linux-oriented and assume target distributions with OpenSSH, auditd, UFW, `ss`, PAM pwquality, and faillock-style configuration files. The snippets are syntactically valid YAML, but `ansible-playbook` was not installed in the workspace, so a full Ansible syntax check could not be run locally.
