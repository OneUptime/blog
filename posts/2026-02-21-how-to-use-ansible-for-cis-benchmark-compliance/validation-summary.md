# Validation Summary: How to Use Ansible for CIS Benchmark Compliance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible Galaxy roles
- CIS Benchmarks
- Linux hardening
- OpenSSH server configuration
- Linux kernel module and mount configuration
- OpenSSL certificate checks
- UFW firewall checks
- Linux auditd rules

## Sources Consulted
- Ansible `ansible-galaxy` CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html
- Ansible `lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `assert` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible `mount` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/mount_module.html
- Ansible playbook delegation documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible Lockdown RHEL9-CIS role repository: https://github.com/ansible-lockdown/RHEL9-CIS
- Ansible Galaxy `ansible-lockdown.rhel9_cis` role page: https://galaxy.ansible.com/ui/standalone/roles/ansible-lockdown/rhel9_cis/
- CIS Benchmarks overview: https://www.cisecurity.org/cis-benchmarks
- OpenSSH release notes: https://www.openssh.org/releasenotes.html
- OpenSSH `sshd_config` manual: https://man.openbsd.org/sshd_config
- Red Hat Enterprise Linux 9 OpenSSH documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/assembly_using-secure-communications-between-two-systems-with-openssh_securing-networks
- OpenSSL `x509` command documentation: https://docs.openssl.org/3.3/man1/openssl-x509/

## Issues Found
- The Ansible Galaxy example used the older shorthand `ansible-galaxy install`. Changed it to the current documented `ansible-galaxy role install` form for installing a role.
- The `/tmp` mount example used `ansible.builtin.mount`, but the current mount module is `ansible.posix.mount` and is not part of `ansible-core`. Updated the FQCN accordingly.
- The RHEL9-CIS role example enabled `rhel9cis_rule_5_2_1` for SSH configuration, but the custom SSH example and validation focused on disabling root login. Changed it to `rhel9cis_rule_5_2_4` so the variable matches the shown control.
- The custom SSH hardening example set `Protocol 2` in `sshd_config`. Modern OpenSSH removed SSH protocol 1 support, and current `sshd_config` documentation no longer lists `Protocol` as a valid directive. Removed that task to avoid an obsolete configuration example.
- The TLS certificate check used `openssl x509 -noout -dates`, which prints certificate dates but does not fail when a certificate is expired. Changed it to `openssl x509 -noout -checkend 0` so the return code validates that the certificate is currently unexpired.
- The unauthorized port assertion used a substring check, which could falsely match port `21` inside another port such as `52100`. Replaced it with a regular-expression check against listener output boundaries.

## Review Notes
The Ansible snippets are illustrative and still require environment-specific testing before use in production, especially for partitioning, SSH daemon names, audit rules, and firewall tooling across different Linux distributions. The local environment did not have Ansible installed, so module and CLI behavior were checked against official/current documentation and the fenced YAML snippets were parsed with PyYAML.
