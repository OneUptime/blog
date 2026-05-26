# Validation Summary: How to Set User Passwords with the Ansible user Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible `ansible.builtin.user` module
- Ansible `password_hash` filter
- Ansible Vault
- Linux password hashes and `/etc/shadow`
- OpenSSL `passwd`
- Linux `chage`
- YAML playbooks

## Sources Consulted
- Ansible `ansible.builtin.user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible `ansible.builtin.password_hash` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/password_hash_filter.html
- Ansible playbook filter guide, password hashing section: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- Ansible FAQ, generating encrypted passwords for the user module: https://docs.ansible.com/projects/ansible/latest/reference_appendices/faq.html#how-do-i-generate-encrypted-passwords-for-the-user-module
- Ansible Vault CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Ansible Vault guide: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault.html
- Ansible playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Local `openssl passwd -help` output
- Local `chage --help` output

## Issues Found
- Replaced the Python `crypt` command-line hashing example with `openssl passwd -6`. Python's `crypt` module is deprecated in Python 3.12 and not a current best command-line recommendation, while Ansible's FAQ lists OpenSSL as a supported way to generate SHA-512 password hashes for the `user` module.
- Corrected the sample hash shape after the command-line example. The original Python command did not produce a `$6$rounds=656000$...` hash by default; the OpenSSL example produces a `$6$salt$hash` SHA-512 crypt hash.
- Added explicit `rounds=5001` to fixed-salt `password_hash` examples. Ansible documents that `password_hash` can produce different results depending on whether passlib is installed, and recommends specifying non-default rounds when idempotency matters.
- Corrected the description of `update_password: always`. The official module documentation says it updates passwords if they differ, not every time regardless of the current hash.

## Review Notes
The post is Linux-focused and technically relevant. The Ansible examples are valid YAML after the corrections. The local environment did not have Ansible installed, so Ansible-specific behavior was verified against official Ansible documentation rather than by running `ansible-playbook --syntax-check`.
