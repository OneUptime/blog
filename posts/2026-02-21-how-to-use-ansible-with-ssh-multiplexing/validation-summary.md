# Validation Summary: How to Use Ansible with SSH Multiplexing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- OpenSSH client configuration
- SSH connection multiplexing
- SSH bastion hosts / ProxyJump
- Ansible pipelining and forks

## Sources Consulted
- Ansible `ansible.builtin.ssh` connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible configuration settings documentation for pipelining: https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/config.html
- OpenBSD/OpenSSH `ssh_config(5)` manual for `ControlMaster`, `ControlPath`, `ControlPersist`, `ProxyJump`, and `ServerAliveInterval`: https://man.openbsd.org/ssh_config
- OpenBSD/OpenSSH `ssh(1)` manual for `ssh -O check`, `stop`, and `exit`: https://man.openbsd.org/ssh
- OpenBSD/OpenSSH `sshd_config(5)` manual for `MaxSessions`: https://man.openbsd.org/sshd_config
- Local OpenSSH manual pages from OpenSSH_9.6p1 on Ubuntu for command and option behavior.

## Issues Found
- Clarified that subsequent multiplexed SSH invocations open new SSH sessions over the existing connection, rather than "tunneling" through it instantly.
- Corrected `ControlMaster=yes` wording. OpenSSH documents it as creating/listening on a control socket, while `auto` is the opportunistic reuse-or-create mode typically appropriate for Ansible.
- Added the missing `ControlMaster=ask` mode because it is part of the documented OpenSSH option set.
- Corrected the socket cleanup wording. Removing files with `rm -f ~/.ansible/cp/*` removes socket files but does not itself stop already-running SSH master processes.
- Added the Ansible pipelining caveat for sudo: multiplexing works with `become`, but pipelining with sudo can require disabling `requiretty` on managed hosts.
- Clarified Ansible forks language so it does not imply each fork always owns a unique master connection independent of host connection reuse.
- Clarified `MaxSessions` behavior: it limits open shell, login, or subsystem sessions per SSH network connection, and only needs adjustment if the workload hits that limit.

## Review Notes
The main configuration examples use current Ansible and OpenSSH options. Current Ansible defaults already include `-C -o ControlMaster=auto -o ControlPersist=60s` for the SSH connection plugin, so the examples are still valid but may overlap with the default behavior on modern Ansible installations.
