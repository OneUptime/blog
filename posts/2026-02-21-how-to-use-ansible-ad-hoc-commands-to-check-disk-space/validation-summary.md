# Validation Summary: How to Use Ansible Ad Hoc Commands to Check Disk Space

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible ad hoc commands
- Ansible built-in modules: command, shell, setup, cron, apt
- Linux disk usage tools: df, du, find, sort, awk
- Linux cron
- Docker disk usage commands
- LVM reporting commands
- Disk I/O tools: iostat, iotop, dmesg

## Sources Consulted
- Ansible ad hoc commands documentation: https://docs.ansible.com/ansible/latest/command_guide/intro_adhoc.html
- Ansible CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- ansible.builtin.shell module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- ansible.builtin.setup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- ansible.builtin.cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- OpenBSD crontab(5) manual for percent escaping behavior: https://man.openbsd.org/crontab.5

## Issues Found
- The setup module example labeled "Get just device and mount facts" used `filter=ansible_device*`, which returns device facts but not mount facts. Changed it to JSON module arguments with `{"filter":["ansible_devices","ansible_mounts"]}` so both first-level facts are requested correctly.
- The automated report script embedded `$(hostname)` inside the local shell's double-quoted Ansible argument, so the control machine hostname would be expanded before Ansible ran the remote command. Changed the command to set `HOST=$(hostname)` on each remote host and pass it into `awk` with `-v host="$HOST"`.
- The cron job example used literal percent characters in the command string. Cron treats unescaped `%` as a newline separator, and the Ansible cron documentation notes that percent symbols must be escaped. Changed the command to use numeric awk coercion and log `percent` as text, avoiding literal percent characters in the managed crontab entry.

## Review Notes
Ansible was not installed in the local workspace, so validation used official Ansible documentation and authoritative manual pages rather than local `ansible-doc` output. Several cleanup commands are intentionally broad and should be used carefully in production, but they are syntactically valid examples for targeted ad hoc operations.
