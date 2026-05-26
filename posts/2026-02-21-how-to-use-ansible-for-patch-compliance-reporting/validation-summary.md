# Validation Summary: How to Use Ansible for Patch Compliance Reporting

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules: lineinfile, include_tasks, assert, service_facts, template, cron, command, package, service, copy, set_fact, debug
- OpenSSH server configuration validation with `sshd -T`
- Linux auditd configuration
- LUKS disk encryption checks
- OpenSSL X.509 certificate checks
- UFW firewall status checks
- iproute2 `ss` socket inspection
- GitHub Actions scheduled workflows

## Sources Consulted
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.builtin.assert` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible `ansible.builtin.service_facts` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.include_tasks` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.set_fact` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/set_fact_module.html
- OpenSSL `openssl-x509` documentation: https://docs.openssl.org/4.0/man1/openssl-x509/
- GitHub Actions hosted runner reference: https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- Local `ss --help` output for supported `ss` flags and filter syntax.

## Issues Found
- The auditd validation asserted `ansible_facts.services['auditd.service'].state` directly. Added an explicit assertion that `auditd.service` exists in `ansible_facts.services` first, matching the service facts data shape and producing a clearer failure.
- The LUKS example ran `lsblk -f` but did not validate the result. Added an `assert` checking for `crypto_LUKS` in the output so the task actually verifies the stated encryption requirement.
- The TLS certificate example used `openssl x509 -dates`, which prints validity dates but does not fail solely because a certificate is expired. Changed it to `openssl x509 -checkend 0 -noout`, which exits nonzero when the certificate has expired or will expire within the specified interval.
- The unauthorized port check searched for port strings anywhere in `ss` output, which could match unrelated substrings such as process IDs or other port numbers. Changed it to query each prohibited TCP listening port with an `ss` sport filter and assert that no matching socket is returned.
- The generated report recorded a passing password-complexity check but did not record a failure when the check failed. Added a failure-recording task for `pwquality.rc != 0`.

## Review Notes
The examples are Linux-focused and assume paths and service names common on systemd-based distributions. In a production version, the post could mention OS-family differences for SSH service names, UFW availability, auditd paths, and password policy tooling, but the corrected examples are technically valid for the intended Linux context.
