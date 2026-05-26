# Validation Summary: How to Use Ansible Ad Hoc Commands with Extra Variables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible ad hoc commands
- Ansible extra variables
- Ansible built-in modules: debug, template, apt, yum/dnf redirect, service, user, copy, shell
- JSON and YAML variable files
- Bash scripting

## Sources Consulted
- Ansible `ansible` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- Ansible variable documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible precedence rules: https://docs.ansible.com/projects/ansible/latest/reference_appendices/general_precedence.html
- Ansible `apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `yum` module redirect documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yum_module.html
- Ansible `service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible `shell` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html

## Issues Found
- The variable precedence diagram was labeled as the full relevant precedence order, but it compressed Ansible's documented precedence levels and included a vague "Inventory Variables" node before group and host variables. Updated the text to call it a simplified order and changed the diagram to better reflect the documented order for the relevant levels, including inventory group variables, inventory host variables, play variables, task variables, `include_vars`/`set_fact`, role/include parameters, and extra variables as highest priority.

## Review Notes
- The Ansible CLI documentation confirms `-e`/`--extra-vars` accepts key=value or YAML/JSON values, supports `@` variable files, and may be specified multiple times.
- The local workspace does not have the `ansible` executable installed, so command verification was performed against current official Ansible documentation rather than local `ansible --help` output.
- The `yum` module is currently documented as a redirect to `ansible.builtin.dnf`; the short module name still works as documented, but future posts may prefer `dnf` for modern RPM-based systems.
