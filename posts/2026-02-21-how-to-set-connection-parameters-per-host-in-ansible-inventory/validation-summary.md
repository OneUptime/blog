# Validation Summary: How to Set Connection Parameters Per Host in Ansible Inventory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory
- Ansible host_vars and group_vars
- Ansible SSH connection plugin
- WinRM connection settings
- Docker connection plugin
- Ansible network_cli for Cisco IOS
- Ansible Vault

## Sources Consulted
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible SSH connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible WinRM connection plugin documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/winrm_connection.html
- community.docker.docker connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_connection.html
- Ansible IOS platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_ios.html
- Ansible interpreter discovery documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/interpreter_discovery.html
- ansible-inventory CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- ansible.builtin.ping module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ping_module.html
- ansible.windows.win_ping module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_ping_module.html

## Issues Found
- The initial database inventory example used `ansible_port=5433` for `db2.example.com`, which reads as a PostgreSQL service port rather than an SSH connection port. Changed it to `ansible_port=22` so the example remains an Ansible host connection example.
- The Docker connection example used `ansible_connection: docker`. Current official documentation identifies the plugin as `community.docker.docker` in the `community.docker` collection. Updated the example to use `ansible_connection: community.docker.docker`.
- The verification commands used short module names `ping` and `win_ping`. Updated them to the documented FQCNs `ansible.builtin.ping` and `ansible.windows.win_ping` to avoid ambiguity and match current documentation.

## Review Notes
The remaining inventory variables, SSH options, WinRM settings, network_cli settings, Python interpreter examples, `ansible-inventory --host`, and security guidance align with official Ansible documentation. The local environment did not have Ansible installed, so command validation was performed against official CLI and module documentation rather than local `--help` output.
