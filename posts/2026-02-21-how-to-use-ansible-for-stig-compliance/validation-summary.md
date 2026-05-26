# Validation Summary: How to Use Ansible for STIG Compliance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible Galaxy roles
- DISA STIG compliance
- RHEL auditd and audit rules
- Linux password policy configuration
- OpenSSL certificate checks
- Linux firewall and listening-port validation

## Sources Consulted
- Ansible ansible-galaxy CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible Galaxy user guide for role installation: https://docs.ansible.com/ansible/latest/galaxy/user_guide.html
- ansible-lockdown.rhel9_stig Galaxy role page: https://galaxy.ansible.com/ui/standalone/roles/ansible-lockdown/rhel9_stig/
- Ansible lineinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible assert module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible service_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible command, copy, and service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/
- Red Hat DISA STIG compliance guidance: https://access.redhat.com/compliance/disa-stig
- RHEL 8 STIG reference entries for password complexity and audit controls: https://www.stigviewer.com/stigs/red_hat_enterprise_linux_8/
- OpenSSL x509 command documentation: https://docs.openssl.org/3.3/man1/openssl-x509/

## Issues Found
- The Ansible Galaxy install command used the older ambiguous role syntax. Changed it to `ansible-galaxy role install ansible-lockdown.rhel9_stig`, matching current Ansible Galaxy documentation and the role page.
- Several example RHEL STIG vulnerability IDs were mapped to the wrong controls. Corrected the password minimum length ID to `V-230369`, mapped the character-class password settings to the relevant password complexity IDs, removed an inaccurate lockout ID from the generic task name, and corrected the privileged-command audit rule ID to `V-230386`.
- The validation playbook's password grep task would fail before the assert task could produce the intended compliance failure message. Added `failed_when: false` and split the assertion into an existence check plus a numeric minimum-length check.
- The auditd validation failure message referenced `V-230386`, which is for privileged-command auditing rather than simply checking whether auditd is running. Changed the message to a generic auditd failure.
- The TLS certificate task claimed to verify expiry but only printed certificate dates. Changed it to use `openssl x509 -checkend 0 -noout`, which returns nonzero for an expired certificate.
- The prohibited-port check searched for port numbers as substrings in full `ss` output, which could produce false positives. Changed it to query each prohibited port directly with `ss -tlnH sport = :PORT` and assert that the per-port result is empty.

## Review Notes
- The examples are technically valid as illustrative Ansible snippets, but production STIG automation should pin content versions and validate against the exact DISA STIG release, OS major/minor version, and local exceptions or POA&M process.
- The custom compliance examples mix RHEL-oriented STIG content with generic Linux checks such as `ufw`; that is acceptable as illustrative compliance automation, but real RHEL STIG enforcement normally uses firewalld/nftables checks rather than UFW.
