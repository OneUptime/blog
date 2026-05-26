# Validation Summary: How to Use Ansible to Manage the root Password

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible Vault
- Ansible `user`, `group`, `copy`, `file`, `lineinfile`, `systemd`, `ping`, `command`, `shell`, `debug`, and `assert` modules
- Ansible `password_hash`, `password`, and `env` plugins
- HashiCorp Vault via `community.hashi_vault`
- Linux root account and password aging tools
- sudoers and OpenSSH server configuration

## Sources Consulted
- Ansible `ansible.builtin.user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible `ansible.builtin.password_hash` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/password_hash_filter.html
- Ansible `ansible.builtin.password` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/password_lookup.html
- Ansible `community.hashi_vault.vault_kv2_get` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/vault_kv2_get_lookup.html
- Ansible `community.hashi_vault.hashi_vault` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/hashi_vault_lookup.html
- Local `chage --help`, `date --help`, and `visudo -h` output

## Issues Found
- Hostname-derived salts used values such as `'salt' + inventory_hostname` and `inventory_hostname[:16]`. Ansible documents `password_hash` salts as limited to characters matching `[./0-9A-Za-z]+`, while hostnames can contain characters such as hyphens. Replaced those examples with deterministic numeric salts generated with `random(seed=inventory_hostname)`.
- The random password example used older inline `password` lookup arguments and stored files under `/root` with `become: no`, which could fail for non-root playbook users and if the directory did not already exist. Updated the lookup to documented keyword arguments, added a local directory creation task, and stored files under the playbook user's home directory.
- The rotation workflow and verification task implied the playbook was verifying access with the new root password. The actual Ansible tasks verify ongoing management connectivity and sudo access, so the wording was corrected to match the behavior.
- The sudo/SSH example restarted `sshd` unconditionally. This is not portable to Debian-family systems, where the service is commonly `ssh`. Added a small service-name variable based on `ansible_facts.os_family`.
- The HashiCorp Vault example used the older short `hashi_vault` lookup and embedded `{{ inventory_hostname }}` inside a quoted lookup term. Updated it to the current `community.hashi_vault.vault_kv2_get` lookup and Jinja string concatenation.
- The audit example emitted `NEVER_SET` for unset passwords but would not alert because `NEVER_SET | int` evaluates to `0`. Updated the alert condition and message to handle unset passwords explicitly.

## Review Notes
Ansible is not installed in this workspace, so `ansible-playbook --syntax-check` could not be run. I validated the YAML code blocks with PyYAML and checked the relevant local command help output where available.
