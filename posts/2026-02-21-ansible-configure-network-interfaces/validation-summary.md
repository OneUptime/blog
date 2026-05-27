# Validation Summary: How to Use Ansible to Configure Network Interfaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.general.nmcli
- NetworkManager / nmcli
- Linux networking
- ifupdown `/etc/network/interfaces`
- `/etc/resolv.conf`
- DHCP client configuration
- `at`, `atq`, and `atrm`

## Sources Consulted
- Ansible community.general.nmcli module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/nmcli_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.shell module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/shell_module.html
- Ansible handler and `meta: flush_handlers` documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible ansible.builtin.wait_for_connection module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_connection_module.html
- Debian interfaces(5) man page: https://manpages.debian.org/testing/ifupdown/interfaces.5.en.html
- Debian at/atq/atrm man page: https://manpages.debian.org/testing/at/atrm.1.en.html
- Linux resolv.conf(5) man page: https://man7.org/linux/man-pages/man5/resolv.conf.5.html

## Issues Found
- The post referred to `ansible.builtin.nmcli`, but the documented module used in the examples is `community.general.nmcli`. Updated the text and prerequisites to require the `community.general` collection.
- The "Bring up the connection" task used `state: present`, which creates or updates the profile but does not actively bring it up. Changed that task to `state: up`, matching current `community.general.nmcli` documentation.
- The multi-interface example set `gw4: ""` for interfaces without a gateway, then used `default(omit)`, which would not omit a defined empty string. Removed the empty gateway values and used `default(omit, true)` in the task.
- The DNS section referenced `templates/resolv.conf.j2` but did not include the template, so the example was incomplete. Added a minimal resolver template and rendered search domains as a single `search` line.
- The rollback example used shell command substitution with `ansible.builtin.command`, but `command` does not process shell metacharacters. Changed rollback cancellation to pass `atrm` arguments via `argv` using the job id captured from `at`, and adjusted the `at` invocation to put `-f` before the time specification.
- The safe restart workflow notified a handler but checked connectivity before forcing the handler to run. Added `ansible.builtin.meta: flush_handlers` before `wait_for_connection` so the restart happens before the connectivity check.

## Review Notes
Directly managing `/etc/resolv.conf` can conflict with NetworkManager, systemd-resolved, resolvconf, or DHCP tooling on modern distributions. The post now presents a technically valid static-file example, but future improvements could add distribution-specific resolver management guidance.
