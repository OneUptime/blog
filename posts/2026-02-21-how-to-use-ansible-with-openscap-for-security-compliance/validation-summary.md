# Validation Summary: How to Use Ansible with OpenSCAP for Security Compliance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible playbooks
- Ansible built-in modules: command, assert, lineinfile, service_facts, cron, template, package, service, copy, set_fact, debug
- GitHub Actions
- OpenSSL certificate checks
- Linux security configuration: SSH, auditd, pwquality, faillock, LUKS, UFW, ss

## Sources Consulted
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.assert module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible ansible.builtin.lineinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible ansible.builtin.service_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible ansible.builtin.cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible ansible.builtin.template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- OpenSCAP User Manual: https://static.open-scap.org/openscap-1.4.1/oscap_user_manual.html
- OpenSCAP manual source: https://github.com/OpenSCAP/openscap/blob/main/docs/manual/manual.adoc

## Issues Found
- The post title, tags, and description claimed OpenSCAP/SCAP integration, but the article did not use OpenSCAP commands, SCAP content, XCCDF evaluation, or OpenSCAP remediation. I corrected the metadata to describe the actual Ansible compliance content instead of making unsupported OpenSCAP claims.
- The `lineinfile` examples for `pwquality.conf` and `faillock.conf` used regular expressions that could match unrelated keys with the same prefix. I changed them to match assignment lines for the intended keys.
- The `service_facts` assertion indexed `auditd.service` directly, which could fail with an undefined key if auditd was absent. I changed it to use `.get()` so the assertion fails cleanly.
- The GitHub Actions example ran the validation playbook with `--check`. Ansible command tasks without `creates` or `removes` are skipped in check mode, so the registered validation output would not be available. I removed `--check` and added an Ansible installation step.
- The LUKS example collected `lsblk -f` output but did not assert that an encrypted device was present. I added an assertion for `crypto_LUKS`.
- The TLS certificate example used `openssl x509 -dates`, which prints dates but does not fail for an expired certificate. I changed it to `openssl x509 -checkend 0` so the return code validates that the certificate is not expired.
- The listening-port assertion checked for bare port-number substrings, which could produce false positives. I changed the `ss` command output and assertion to check for port tokens like `:23 ` instead.

## Review Notes
The examples are Linux-focused and assume package/service names such as `auditd` and `sshd`, plus tools such as `ufw`, `ss`, and `openssl`. Those assumptions are reasonable for a concise guide but should be called out if the post is later expanded for multiple distributions.
