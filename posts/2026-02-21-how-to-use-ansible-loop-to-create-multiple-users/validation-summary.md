# Validation Summary: How to Use Ansible loop to Create Multiple Users

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and loops
- ansible.builtin.user module
- ansible.builtin.group module
- ansible.posix.authorized_key module
- Ansible filters and tests: default(omit), subelements, password_hash, selectattr, contains
- Linux user, group, sudoers, and SSH authorized_keys management

## Sources Consulted
- Ansible ansible.builtin.user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible ansible.builtin.group module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/group_module.html
- Ansible ansible.posix.authorized_key module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/authorized_key_module.html
- Ansible loop documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible ansible.builtin.subelements filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/subelements_filter.html
- Ansible ansible.builtin.password_hash filter documentation: https://docs.ansible.com/projects/ansible/9/collections/ansible/builtin/password_hash_filter.html
- Ansible ansible.builtin.contains test documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/contains_test.html
- Ansible ansible.builtin.lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html

## Issues Found
- The complete playbook used `exclusive: "{{ true if loop.last else false }}"` inside an `ansible.posix.authorized_key` task that loops over individual keys. The official module documentation says `exclusive` is not loop-aware and must receive all keys for a user in a single `key` value when exclusivity is desired. Ansible's documented extended loop variable is also `ansible_loop.last`, exposed only when `loop_control.extended` is enabled, not `loop.last`. Removed the `exclusive` line so the looped task correctly adds each listed key with `state: present`.

## Review Notes
- Ansible is not installed in this workspace, so I could not run `ansible-playbook --syntax-check` locally. The examples were reviewed against official Ansible documentation instead.
- The password example is functionally correct, but in a production role each user should use a unique salt or a precomputed password hash stored in Ansible Vault rather than relying on a shared fallback salt.
