# Validation Summary: How to Use Ansible to Run Commands on the Control Node

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible task delegation
- `local_action`
- `delegate_to`
- `connection: local`
- Ansible built-in modules: `copy`, `lineinfile`, `pip`, `file`, `template`, `command`, `shell`, `stat`, `fail`, `debug`, `apt`

## Sources Consulted
- Ansible Community Documentation: Controlling where tasks run: delegation and local actions - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible Community Documentation: Implicit localhost - https://docs.ansible.com/projects/ansible/latest/inventory/implicit_localhost.html
- Ansible Community Documentation: ansible.builtin.local connection - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/local_connection.html
- Ansible Community Documentation: ansible.builtin.command module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible Community Documentation: ansible.builtin.shell module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible Community Documentation: ansible.builtin.lineinfile module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html

## Issues Found
- The delegated CSV example wrote to the same local file once per host without controlling concurrency. Ansible's delegation documentation warns that delegated tasks still run in parallel and can overwrite each other when several hosts update one delegated file. Added `throttle: 1` to serialize that task.
- The post described preserved host context as the key difference between `delegate_to: localhost` and `local_action`. Official documentation describes `local_action` as shorthand for delegation to localhost, so this was misleading. Reworded the explanation to say both forms let task arguments use the current inventory host context, while `delegate_to` remains the more flexible directive.
- The post said `connection: local` runs modules using the local Python interpreter. Official documentation notes that local connection interpreter selection can require explicit `ansible_python_interpreter` configuration. Reworded this to avoid implying a guaranteed interpreter choice and added a short caveat.

## Review Notes
Ansible was not installed in the local environment, so syntax was reviewed against official documentation rather than by running `ansible-playbook --syntax-check`. The examples use current FQCN module names and the checked module parameters are valid in current Ansible documentation.
