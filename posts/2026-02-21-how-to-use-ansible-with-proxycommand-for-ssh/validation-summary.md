# Validation Summary: How to Use Ansible with ProxyCommand for SSH

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible SSH connection plugin
- OpenSSH ProxyCommand and ProxyJump
- OpenSSH connection multiplexing with ControlMaster and ControlPersist
- OpenBSD netcat (`nc`)
- Nmap Ncat (`ncat`)
- Corkscrew HTTP CONNECT proxy tunneling
- YAML and INI-style Ansible inventory/configuration

## Sources Consulted
- Ansible `ansible.builtin.ssh` connection plugin documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/ssh_connection.html
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh
- OpenBSD `nc(1)` manual: https://man.openbsd.org/nc
- Nmap Ncat proxying guide: https://nmap.org/ncat/guide/ncat-proxy.html
- OpenSSH 7.3 release notes for ProxyJump introduction: https://www.openssh.org/txt/release-7.3
- Local OpenSSH 9.6p1 manual output for command-line syntax confirmation

## Issues Found
- The database bastion example placed `-i ~/.ssh/db_bastion_key` after the SSH destination. OpenSSH treats arguments after the destination as the remote command, so the identity file would not be applied to the proxy hop. Moved `-i` before `admin@bastion-db.example.com`.
- The SOCKS `nc -X 5 -x ...` example was correct for OpenBSD netcat, but not for every `nc` implementation. Clarified that this requires an `nc` implementation with proxy-option support and labeled the example as OpenBSD netcat.
- The comparison table said ProxyCommand works with "Any" SSH version. That is overbroad; ProxyCommand is an OpenSSH feature available in older OpenSSH versions, while ProxyJump was introduced in OpenSSH 7.3. Updated the table wording.

## Review Notes
- The Ansible variables and configuration keys used in the post (`ssh_args`, `ansible_ssh_common_args`, `ansible_ssh_private_key_file`, `control_path_dir`, `control_path`, and `pipelining`) match current Ansible SSH connection plugin documentation.
- The `ssh -W %h:%p` and `ProxyCommand` behavior matches the OpenSSH manuals.
- The `ncat --proxy-type socks5 --proxy ...` syntax matches Nmap Ncat documentation.
- `ssh_args` overrides Ansible's default SSH arguments, so users who set it globally may want to preserve defaults such as compression and ControlPersist where relevant.
