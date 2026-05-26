# Validation Summary: How to Use Jump Hosts (Bastion Hosts) in Ansible Inventory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory
- Ansible SSH connection plugin
- OpenSSH ProxyJump
- OpenSSH ProxyCommand
- SSH agent forwarding
- SSH connection multiplexing
- Bastion hosts / jump hosts

## Sources Consulted
- Ansible SSH connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible FAQ on configuring jump hosts with `ansible_ssh_common_args`: https://docs.ansible.com/projects/ansible/latest/reference_appendices/faq.html#how-do-i-configure-a-jump-host-to-access-servers-that-i-have-no-direct-access-to
- Ansible inventory documentation for `host_vars` and `group_vars`: https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html
- OpenSSH `ssh(1)` manual for `-J`, `-W`, and `-o`: https://man.openbsd.org/ssh.1
- OpenSSH `ssh_config(5)` manual for `ProxyJump`, `ProxyCommand`, `ForwardAgent`, `ControlMaster`, `ControlPersist`, `ControlPath`, `StrictHostKeyChecking`, and `ConnectTimeout`: https://man.openbsd.org/ssh_config.5
- OpenSSH release notes for OpenSSH 7.3 `ProxyJump` support: https://www.openssh.org/releasenotes.html

## Issues Found
- Corrected the SSH key forwarding guidance. The original text implied that agent forwarding should be used when the bastion does not have private keys for internal hosts. With `ProxyJump`, the bastion acts as a TCP forwarding hop and does not need target private keys; authentication to the final target can use keys or an SSH agent on the Ansible control workstation. The section now recommends local keys/local agent use, and limits `ForwardAgent=yes` to cases where onward SSH sessions are intentionally started from a remote host.

## Review Notes
- The examples use documentation-reserved IP ranges such as `203.0.113.0/24`, which is appropriate for sample configuration.
- `StrictHostKeyChecking=no` and `UserKnownHostsFile=/dev/null` are syntactically valid OpenSSH options but reduce host key verification protections. The post also includes the safer `accept-new` option in the production example.
- Ansible's current SSH connection plugin already defaults to `ControlMaster=auto` and `ControlPersist=60s`; explicit multiplexing settings remain valid when users want to control the values or paths.
