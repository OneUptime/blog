# Validation Summary: How to Use Ansible to Enforce File System Security Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules: include_tasks, lineinfile, assert, command, service_facts, template, cron, package, service, copy, set_fact, debug
- OpenSSH server configuration
- Linux auditd/audit rules
- LUKS encryption validation
- OpenSSL X.509 certificate checks
- UFW and ss network validation
- GitHub Actions scheduled workflows

## Sources Consulted
- Ansible documentation: ansible.builtin.lineinfile module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible documentation: ansible.builtin.command module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible documentation: ansible.builtin.assert module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible documentation: ansible.builtin.include_tasks module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible documentation: ansible.builtin.service_facts module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible documentation: ansible.builtin.template module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible documentation: ansible.builtin.cron module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- OpenSSL x509 documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- OpenSSH sshd_config manual page: https://man.archlinux.org/man/core/openssh/sshd_config.5.en
- Linux audit rules manual page: https://man7.org/linux/man-pages/man7/audit.rules.7.html
- Red Hat documentation on Linux audit file system rules: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/security_guide/sec-defining_audit_rules_and_controls
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions

## Issues Found
- The LUKS validation example ran `lsblk -f` but did not actually validate that any encrypted LUKS devices were present. Added an `assert` task checking for `crypto_LUKS` in the command output.
- The TLS certificate example used `openssl x509 -dates` and asserted only that the command succeeded, which proves the certificate file can be parsed but does not prove it is unexpired. Changed the command to use `openssl x509 -checkend 0`, which returns a non-zero exit status for an expired certificate, and updated the failure/success messages.
- The unauthorized port check searched for strings such as `23` anywhere in the full `ss -tlnp` output, which could produce false positives or miss exact port intent. Changed it to query each prohibited source port with `ss -tlnH "sport = :<port>"` and assert that no matching listener is returned.

## Review Notes
- The snippets use current Ansible fully qualified collection names and supported module parameters.
- The `lineinfile` examples are syntactically valid, but production hardening roles should consider commented directives, distro-specific include files, and validation commands such as `sshd -t` before restarting SSH.
- The local workspace does not have Ansible installed, so I could not run `ansible-playbook --syntax-check`; validation was performed against official documentation and local command help where available.
