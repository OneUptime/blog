# Validation Summary: How to Disable SSH Host Key Checking in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible configuration
- Ansible SSH connection plugin
- Ansible inventory and group variables
- OpenSSH client configuration
- OpenSSH `ssh-keyscan`
- OpenSSH `ssh-keygen`
- SSH `known_hosts`
- GitLab CI and GitHub Actions environment variables

## Sources Consulted
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible SSH connection plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible `known_hosts` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/known_hosts_module.html
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config
- OpenSSH `ssh-keyscan(1)` manual: https://man.openbsd.org/OpenBSD-7.2/ssh-keyscan.1
- OpenSSH `ssh-keygen(1)` manual: https://man.openbsd.org/ssh-keygen

## Issues Found
- The `known_hosts` module examples used `ssh-keyscan -H` while passing the unhashed host as `name`. Ansible's `known_hosts` module requires the host value prepended in `key` to match the `name` parameter, so the examples were changed to `ssh-keyscan {{ item }}`.
- The post described pre-populating `known_hosts` with `ssh-keyscan` as the most secure approach without noting that scanned keys must be verified. Added wording that the keys should be verified through a trusted channel before relying on them.
- The dynamic infrastructure example said `StrictHostKeyChecking=accept-new` would "warn about changed keys." OpenSSH rejects changed host keys with `accept-new`, so the comment was corrected to "reject changed keys."

## Review Notes
- `StrictHostKeyChecking=accept-new` is supported by modern OpenSSH and behaves as described: it automatically accepts new host keys but refuses changed host keys.
- `host_key_checking = False`, `ANSIBLE_HOST_KEY_CHECKING`, `[ssh_connection] ssh_args`, and `ansible_ssh_extra_args` are documented Ansible settings or variables.
- Using `UserKnownHostsFile=/dev/null` is technically valid, but it intentionally discards learned host keys and should remain limited to low-risk or ephemeral environments.
