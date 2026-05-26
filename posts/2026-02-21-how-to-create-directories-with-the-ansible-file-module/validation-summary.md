# Validation Summary: How to Create Directories with the Ansible file Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.file module
- ansible.builtin.user module
- ansible.builtin.group module
- YAML playbooks
- Linux filesystem permissions and ownership
- SELinux file contexts

## Sources Consulted
- Ansible official documentation: ansible.builtin.file module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible official documentation: ansible.builtin.user module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible official documentation: ansible.builtin.group module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/group_module.html
- Ansible official documentation: loops and loop_control label - https://docs.ansible.com/projects/ansible/8/playbook_guide/playbooks_loops.html

## Issues Found
- The post said only the final directory in a nested path receives the supplied owner, group, and mode, while intermediate directories use the task user's default umask. Current Ansible documentation says `state: directory` creates intermediate subdirectories if needed and, since Ansible 1.7, creates them with the supplied permissions. The implementation also applies filesystem attributes to newly created intermediate directories. I updated the explanation to state that newly created intermediate directories receive the supplied filesystem attributes.
- The basic directory example said the directory is owned by the user running the playbook and usually has `0755` permissions. The official file module documentation says unspecified mode uses the target system's default umask for newly created objects, and unspecified ownership follows Ansible's ownership rules for the current user/root. I changed the sentence to focus on the default `umask`.
- The complete playbook created a user with `group: "{{ app_group }}"` but did not ensure the primary group exists first. The user module's `group` parameter sets the user's primary group, while the group module manages group presence. I added a preceding `ansible.builtin.group` task.

## Review Notes
The remaining examples use current FQCN module names, valid `state: directory`, `owner`, `group`, `mode`, `setype`, `loop`, `loop_control.label`, `stat`, `register`, `when`, and `become` syntax. Quoting octal modes is consistent with Ansible's guidance for reliable mode parsing.
