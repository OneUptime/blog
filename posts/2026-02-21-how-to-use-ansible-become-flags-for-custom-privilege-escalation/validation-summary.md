# Validation Summary: How to Use Ansible become_flags for Custom Privilege Escalation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible privilege escalation
- Ansible become plugins
- sudo
- su
- doas
- SELinux sudo context flags
- Ansible inventory and configuration

## Sources Consulted
- Ansible `ansible.builtin.sudo` become plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sudo_become.html
- Ansible `ansible.builtin.su` become plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/su_become.html
- Ansible `community.general.doas` become plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/doas_become.html
- Ansible privilege escalation guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible playbook keyword reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible inventory guide for `ansible_become_flags`: https://docs.ansible.com/projects/ansible-core/2.18/inventory_guide/intro_inventory.html
- Sudo manual: https://www.sudo.ws/docs/man/sudo.man/
- Linux `su(1)` manual: https://man7.org/linux/man-pages/man1/su.1.html
- OpenBSD `doas(1)` manual: https://man.openbsd.org/doas.1

## Issues Found
- Corrected the explanation of `become_flags` so it says the directive sets the flags passed to the become command. Ansible's sudo plugin default is `-H -S -n`, so custom sudo flags should include those defaults when that behavior is still needed.
- Updated sudo examples that used only a custom flag, such as `-i`, `-E`, `-g`, `-r`, or `-t`, to include `-H -S -n` where the examples intend to preserve normal Ansible sudo behavior.
- Replaced `ansible.builtin.command: echo $PATH` with `ansible.builtin.command: printenv PATH` because the Ansible `command` module does not perform shell variable expansion.
- Corrected the verbose troubleshooting example so the `--become-flags` value matches the shown sudo command.
- Clarified one proxy task name to indicate that `lookup('env', ...)` reads from the controller environment.

## Review Notes
The sudo, su, doas, inventory, and playbook keyword usage is now consistent with the official documentation. The SELinux `-r` and `-t` sudo flags are valid, but they depend on the target system's sudoers and SELinux policy allowing the requested role and type.
