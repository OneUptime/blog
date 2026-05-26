# Validation Summary: How to Add Users to Groups with the Ansible user Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.user module
- ansible.builtin.group module
- Linux user and group management
- GNU coreutils id and groups commands
- gpasswd

## Sources Consulted
- Ansible ansible.builtin.user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible ansible.builtin.group module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/group_module.html
- Ansible error handling documentation for changed_when and failed_when: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- GNU coreutils id documentation: https://www.gnu.org/software/coreutils/id
- GNU coreutils groups documentation: https://www.gnu.org/software/coreutils/manual/html_node/groups-invocation.html
- GNU coreutils setgid directory behavior documentation: https://www.gnu.org/s/coreutils/manual/html_node/Directory-Setuid-and-Setgid.html
- Linux gpasswd manual page: https://man7.org/linux/man-pages/man1/gpasswd.1.html

## Issues Found
- The post stated that the primary group is what gets assigned to new files. This is generally true, but not always true for directories with setgid group inheritance. Updated the explanation to include that caveat.
- The verification example used `groups alice | grep -q docker`, which can match substrings in other group names. Replaced it with `id -nG alice | tr ' ' '\n' | grep -qx docker` so the check matches the exact group name.

## Review Notes
The Ansible examples use current fully qualified module names and match the documented behavior of `group`, `groups`, and `append`. The `gpasswd -d user group` example is technically valid for targeted group removal, but using command-based changes is less declarative than managing the complete supplementary group list with the `user` module.
