# Validation Summary: How to Use the Ansible sysvinit Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.sysvinit
- ansible.builtin.service
- ansible.builtin.systemd
- SysV init
- Linux runlevels
- Bash init scripts

## Sources Consulted
- Ansible `ansible.builtin.sysvinit` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sysvinit_module.html
- Ansible `ansible.builtin.service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Red Hat Enterprise Linux 6 runlevel documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/deployment_guide/ch-services_and_daemons
- Debian Wiki runlevel documentation: https://wiki.debian.org/RunLevel
- GNU Bash Reference Manual, special parameters: https://www.gnu.org/software/bash/manual/html_node/Special-Parameters.html

## Issues Found
- The runlevel summary described runlevel 2 as "without networking (Debian) or with networking (Red Hat)." Debian documents runlevels 2 through 5 as multiuser modes with no default distinction, while Red Hat Enterprise Linux 6 documents runlevel 2 as user-definable. Updated the table to reflect those distro-specific meanings and added runlevel 4 as user-definable.
- The comparison with `ansible.builtin.service` said the generic module has no concept of runlevels. Current Ansible documentation includes a singular `runlevel` parameter for OpenRC, while `ansible.builtin.sysvinit` provides the SysV-specific `runlevels` list. Updated the wording to make that distinction accurate.
- The custom init script started the application inside a `su` subshell and then wrote `$!` from the parent shell, which would not reliably capture the daemon PID. Updated the command so the background PID is emitted from inside the `su` shell and written to the PID file.

## Review Notes
The Ansible examples use documented `sysvinit` parameters and match the official examples for `state`, `enabled`, `runlevels`, and `sleep`. Service names such as `httpd`, `mysqld`, and `crond` are distribution-specific, which is expected for SysV examples.
