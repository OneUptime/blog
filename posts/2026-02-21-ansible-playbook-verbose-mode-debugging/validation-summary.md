# Validation Summary: How to Use ansible-playbook Verbose Mode for Debugging

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ansible
- ansible-playbook CLI
- Ansible debug module
- Ansible command module
- Ansible copy module
- SSH connection debugging

## Sources Consulted
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible `ansible.builtin.debug` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/debug_module.html
- Ansible module architecture documentation for `_ansible_debug` and `_ansible_verbosity`: https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_program_flow_modules.html
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html

## Issues Found
- The post stated that Ansible supports four verbosity levels. Current Ansible documentation says adding multiple `-v` flags increases verbosity and the built-in plugins currently evaluate up to `-vvvvvv`. I changed the wording to describe the first four levels as the most commonly used debugging levels rather than the complete supported range.
- The post described `-vvvv` as dumping everything, including raw SSH protocol exchanges and internal plugin decisions. Official CLI documentation describes `-vvvv` as useful for connection debugging, while plugin/framework detail can continue increasing through `-vvvvvv`. I changed the Level 4 description to focus on connection debugging and noted that higher verbosity levels exist.

## Review Notes
The playbook snippets use valid YAML and valid Ansible module parameters. The `debug` module's `verbosity` parameter is correct: `verbosity: 2` runs only with `-vv` or higher. The `command: df -h /` example is valid because it does not require shell metacharacter processing. The recursive `copy` example is valid for a directory source, though the official copy module notes that recursive copy does not scale well to large directory trees.
