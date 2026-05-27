# Validation Summary: How to Use the Ansible password Lookup Plugin

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible lookup plugins
- ansible.builtin.password
- ansible.builtin.user
- Ansible Vault
- Jinja2 filters and templates
- Linux user password hashes

## Sources Consulted
- Ansible Community Documentation: ansible.builtin.password lookup - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/password_lookup.html
- Ansible Community Documentation: ansible.builtin.user module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible Community Documentation: ansible.builtin.password_hash filter - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/password_hash_filter.html
- Ansible source: ansible.builtin.password lookup implementation - https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/plugins/lookup/password.py

## Issues Found
- The post described `chars` examples as password requirements. Ansible's `chars` option defines the possible character set, but does not guarantee at least one character from each listed class. I changed the wording and added a clarification.
- The `hexdigits` description said it included only `0-9` and `a-f`. Python's `string.hexdigits`, which Ansible uses, includes both lowercase and uppercase `a-f`. I corrected the description.
- The Linux user-account example used `password_hash('sha512')` without a stable salt. That can produce a different hash on each run and make the user task non-idempotent. I changed the example to use `encrypt=sha512_crypt` in the password lookup, which Ansible documents as saving salt for idempotence.
- The file-permissions pitfall said password files are created with the default umask. The current plugin implementation creates parent directories with restrictive permissions and writes password files with mode `0600`. I corrected the warning to focus on protecting the plaintext controller-side files and surrounding directory.
- The directory-creation pitfall said the plugin does not create parent directories automatically. The current implementation creates parent directories on the controller. I replaced that with the documented caveat that the playbook user must have controller-side read or create permissions because `become` does not apply to lookups.

## Review Notes
- The examples use the short lookup name `password`, which still works because the plugin is part of ansible-core. Ansible's current documentation recommends the fully qualified name `ansible.builtin.password` for easier linking and to avoid collection-name conflicts.
