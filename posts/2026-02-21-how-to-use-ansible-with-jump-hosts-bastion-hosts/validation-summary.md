# Validation Summary: How to Use Ansible with Jump Hosts (Bastion Hosts)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- OpenSSH
- SSH bastion hosts / jump hosts
- Ansible inventory and group variables
- Ansible configuration
- SSH client configuration

## Sources Consulted
- Ansible SSH connection plugin documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible inventory guide: https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html
- Ansible configuration settings: https://docs.ansible.com/ansible/3/reference_appendices/config.html
- Ansible host_group_vars documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/host_group_vars_vars.html
- OpenSSH release notes for OpenSSH 7.3: https://www.openssh.org/releasenotes.html
- OpenBSD ssh_config(5) manual: https://man.openbsd.org/OpenBSD-7.4/ssh_config
- OpenBSD ssh(1) manual: https://man.openbsd.org/cgi-bin/man.cgi/OpenBSD-current/man1/ssh.1

## Issues Found
- The SSH config section defined a specific alias entry, `Host web01`, but the later inventory used `web01 ansible_host=10.0.1.10`. Since `ansible_host` tells Ansible to connect to the IP address, SSH would match `Host 10.0.*` rather than the alias-specific `Host web01` entry. I changed that inventory line to `web01` so the SSH config alias is actually used.

## Review Notes
- `ProxyJump` availability in OpenSSH 7.3+ is accurate.
- `ProxyCommand` with `ssh -W %h:%p` is accurate for older OpenSSH clients that do not support `ProxyJump`.
- `ansible_ssh_common_args`, `ansible_ssh_private_key_file`, `ansible_user`, `ssh_args`, `control_path_dir`, and `pipelining` are valid Ansible SSH connection or inventory settings.
- The examples that disable host key checking are technically valid, but production environments should normally prefer managing known host keys rather than disabling host key verification.
