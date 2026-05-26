# Validation Summary: How to Use Ansible local_action for Running Tasks Locally

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible `local_action`
- Ansible task delegation with `delegate_to`
- Ansible built-in modules: `uri`, `wait_for`, `file`, `lineinfile`, `apt`, `systemd`
- YAML

## Sources Consulted
- Ansible documentation: Controlling where tasks run: delegation and local actions - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible documentation: Implicit localhost - https://docs.ansible.com/ansible/latest/inventory/implicit_localhost.html
- Ansible documentation: `ansible.builtin.uri` module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible documentation: `ansible.builtin.wait_for` module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible documentation: `ansible.builtin.lineinfile` module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible documentation: `ansible.builtin.apt` module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Local syntax verification with ansible-core 2.21.0 using `ansible-playbook --syntax-check`

## Issues Found
- The post used the older mapping form of `local_action` such as `local_action: { module: ... }` in multiple examples. ansible-core 2.21 accepts this form but emits a deprecation warning for using a mapping for `action`, with removal scheduled for ansible-core 2.23. I changed those examples to the supported `local_action: ansible.builtin.<module>` plus `args:` format.
- The "block syntax" wording was updated to "args syntax" so it matches the corrected Ansible syntax.
- The local CSV example wrote to the same delegated local file for every host without controlling parallelism. Ansible's delegation documentation warns that delegated tasks still run in parallel and can race when multiple forks update the same file. I added `throttle: 1` to serialize that write task.

## Review Notes
The reviewed examples syntax-check successfully with ansible-core 2.21.0 after the fixes. The article correctly describes `local_action` as shorthand/alias behavior for localhost delegation, and correctly recommends `delegate_to: localhost` for new playbooks.
