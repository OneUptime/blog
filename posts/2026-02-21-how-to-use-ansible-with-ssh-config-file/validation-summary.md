# Validation Summary: How to Use Ansible with SSH Config File

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible inventory and SSH connection configuration
- OpenSSH client configuration
- SSH host aliases and wildcard `Host` patterns
- SSH `ProxyJump` bastion access
- SSH ControlMaster connection multiplexing

## Sources Consulted
- Ansible `ansible.builtin.ssh` connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- OpenBSD `ssh_config(5)` manual page: https://man.openbsd.org/ssh_config
- OpenBSD `ssh(1)` manual page: https://man.openbsd.org/ssh
- OpenSSH release notes for `Include` directive version context: https://www.openssh.org/releasenotes.html

## Issues Found
- The wildcard, bastion, and enterprise inventory examples used `ansible_host=<IP>` while explaining that SSH `Host prod-*` and `Host staging-*` patterns would apply. Ansible's SSH connection plugin uses `ansible_host` as the SSH target when it is set, and OpenSSH `Host` patterns normally match the target host name passed to `ssh`. I removed those `ansible_host` values from the pattern-based examples and added a note explaining that IP-based `Host` patterns apply when `ansible_host` is set to an IP address.
- The minimal inventory example included `web03`, but the preceding SSH config only defined aliases for `web01` and `web02`. I added the missing `web03` SSH config block so the clean inventory example is complete.

## Review Notes
- The OpenSSH examples are syntactically valid for current OpenSSH. The `Include` version note is consistent with OpenSSH 7.3 release information.
- The Ansible `ssh_args = -F ...` examples are valid, but setting `ssh_args` replaces Ansible's default `ssh_args`; teams that rely on Ansible's default compression or multiplexing options should keep those settings either in `ssh_args` or in SSH config.
