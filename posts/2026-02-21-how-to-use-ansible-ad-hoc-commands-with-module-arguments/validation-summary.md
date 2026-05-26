# Validation Summary: How to Use Ansible Ad Hoc Commands with Module Arguments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible ad hoc commands
- Ansible CLI
- Ansible module arguments
- Ansible built-in modules: command, shell, script, raw, copy, file, apt, service, systemd/systemd_service, lineinfile, cron, user
- ansible-doc

## Sources Consulted
- Ansible ad hoc commands documentation: https://docs.ansible.com/ansible/latest/command_guide/intro_adhoc.html
- Ansible CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- ansible-doc CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-doc.html
- Ansible inventory pattern documentation: https://docs.ansible.com/ansible/latest/inventory_guide/intro_patterns.html
- ansible.builtin.command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.shell module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- ansible.builtin.script module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/script_module.html
- ansible.builtin.raw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html
- ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- ansible.builtin.file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- ansible.builtin.service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- ansible.builtin.systemd/systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_module.html
- ansible.builtin.lineinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- ansible.builtin.cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- ansible.builtin.user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html

## Issues Found
- The `copy` example for JSON-like `content` used `content={"key": "value", "port": 8080}` inside key-value module arguments. Ansible's key-value parser splits on spaces unless the value is quoted, so this would parse incorrectly. Changed the example to quote the whole `content` value while escaping JSON double quotes for the shell.
- The dynamic host selection example used `ansible "{{ target_group }}" ... -e "target_group=webservers"`. Extra vars are available to tasks/module arguments, but this ad hoc inventory pattern is not templated by `-e`. Changed the example to use a shell variable for dynamic host selection.

## Review Notes
The rest of the commands and module parameters match current Ansible documentation. The `systemd` short module name is still available as a redirect to `ansible.builtin.systemd_service`; using the FQCN would be clearer in future updates but is not required for correctness.
