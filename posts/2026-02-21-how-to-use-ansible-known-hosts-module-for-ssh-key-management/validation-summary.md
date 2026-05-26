# Validation Summary: How to Use Ansible known_hosts Module for SSH Key Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.known_hosts
- OpenSSH known_hosts and ssh-keyscan
- community.general.timezone
- community.general.ufw
- Ansible error handling, facts, templates, URI, cron, and service tasks

## Sources Consulted
- Ansible documentation: ansible.builtin.known_hosts module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/known_hosts_module.html
- Ansible documentation: community.general.timezone module - https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible documentation: community.general.ufw module - https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible documentation: Error handling in playbooks - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- OpenBSD manual page: ssh-keyscan(1) - https://man.openbsd.org/ssh-keyscan.1

## Issues Found
- The initial `ssh-keyscan` examples did not specify a key type, which can return multiple known_hosts lines. The `known_hosts` module documents the `key` value as a single known_hosts-format public host key entry, so the examples now use `ssh-keyscan -t ed25519` to provide one host key line.
- The post implied that using `ssh-keyscan` automatically verifies host identity. Added a short caveat that scanned keys should be verified out of band or sourced from trusted inventory for security-sensitive workflows.
- The infrastructure example used `ansible.builtin.timezone`, but current Ansible documentation lists the timezone module as `community.general.timezone`. Updated the module name.
- The fallback task in the error-handling example could fail and stop the play before the final failure-reporting task ran. Added `failed_when: false` so the playbook can evaluate whether both primary and fallback commands failed.
- Several "Common Use Cases" labels said the examples used "this module" even though those examples were broader Ansible automation patterns. Reworded those labels to avoid the inaccurate implication.

## Review Notes
- The `community.general.ufw` and `community.general.timezone` modules require the `community.general` collection, which is commonly present with the full `ansible` package but not included in `ansible-core`.
- The `known_hosts` examples assume the parent `~/.ssh` directory already exists; the module can create the known_hosts file itself, but not missing parent directories.
