# Validation Summary: How to Use Ansible loop with flatten Filter

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Ansible playbooks
- Ansible loops
- Ansible `flatten`, `unique`, `default`, `map`, and `selectattr` filters
- Ansible `contains` test
- Ansible `apt`, `shell`, `debug`, `set_fact`, and `template` modules
- `ansible.posix.firewalld` module

## Sources Consulted
- Ansible `ansible.builtin.flatten` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/flatten_filter.html
- Ansible loops documentation, including `with_flattened` migration guidance: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.shell` module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Ansible `ansible.posix.firewalld` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.contains` test documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/contains_test.html
- Ansible `ansible.builtin.unique` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unique_filter.html

## Issues Found
- The registered-results example used `ansible.builtin.command` with shell pipeline operators (`|`) and an `awk` command. The Ansible `command` module does not process shell metacharacters, so I changed it to `ansible.builtin.shell`.
- The `firewalld` examples set `permanent: yes` and described the ports as opened by the task. Because permanent-only firewalld changes are not immediately applied by default, I added `immediate: yes` to both examples.

## Review Notes
- The `flatten` examples, including `flatten(levels=1)`, match Ansible documentation.
- The `with_flattened` migration guidance is accurate: Ansible documentation states that `with_flattened` is replaced by `loop` with the `flatten` filter, while `with_<lookup>` syntax remains valid.
- The `apt` examples are technically valid, but for real playbooks Ansible documentation notes that passing a list directly to `apt` is more efficient than looping over individual packages.
