# Validation Summary: How to Configure Ansible SSH with IPv6 Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible inventory
- Ansible SSH connection plugin
- OpenSSH client configuration
- IPv6

## Sources Consulted
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible patterns guide: https://docs.ansible.com/projects/ansible-core/devel/inventory_guide/intro_patterns.html
- Ansible SSH connection plugin reference: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/ssh_connection.html
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config
- Ansible host list inventory plugin reference: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/host_list_inventory.html

## Issues Found
- The post incorrectly said IPv6 addresses must be bracketed in Ansible inventory. I changed Step 1 to use raw IPv6 literals for `ansible_host` and clarified that brackets are only needed in SSH syntaxes that combine host and port, such as `ProxyJump`.
- The ad-hoc command `ansible '[2001:db8::10]' ...` was incorrect for the shown inventory, because ad-hoc patterns must match inventory hostnames or groups, not `ansible_host` values. I replaced it with an inline inventory example using `ansible all -i '2001:db8::10,' ...`.
- The jump-host example used invalid placeholder IPv6 literals and was not shown as a valid inventory or vars file structure. I converted it to a valid `host_vars/web-01.yml` example and replaced the placeholders with syntactically valid documentation IPv6 addresses.
- The mixed-fleet example tried to change `ansible_host` with `set_fact` in `pre_tasks`. Based on the Ansible inventory and connection-plugin docs, `ansible_host` is a connection variable used before tasks run, so that approach would be too late for the initial SSH connection. I replaced it with an inventory-based mixed IPv4/IPv6 example that sets the connection address up front.

## Review Notes
- `host_key_checking = False` in `ansible.cfg` and `StrictHostKeyChecking no` in `~/.ssh/config` are technically valid, but they weaken SSH host authenticity checks. A production-oriented version of this post would normally prefer managed `known_hosts` entries or `StrictHostKeyChecking accept-new`, depending on the environment.
- `timeout` under `[ssh_connection]` is supported in current `ansible-core`, so that configuration remains valid.
