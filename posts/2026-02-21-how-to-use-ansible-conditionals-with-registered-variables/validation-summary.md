# Validation Summary: How to Use Ansible Conditionals with Registered Variables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible registered variables
- Ansible conditionals with `when`
- Ansible return values
- Ansible built-in modules: `command`, `apt`, `template`, `systemd_service`, `lineinfile`, `stat`, `copy`, `package_facts`, and `debug`
- Jinja2 expressions in Ansible playbooks

## Sources Consulted
- Ansible conditionals documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible common return values documentation: https://docs.ansible.com/projects/ansible/13/reference_appendices/common_return_values.html
- Ansible variables and registered loop results documentation: https://docs.ansible.com/ansible/6/user_guide/playbooks_variables.html
- `ansible.builtin.command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- `ansible.builtin.apt` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- `ansible.builtin.stat` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/stat_module.html
- `ansible.builtin.package_facts` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_facts_module.html
- `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html

## Issues Found
- The post said several registered-variable keys are always present. Ansible documents common return values, but exact keys vary by module and by execution status. Changed the wording to say common keys appear frequently.
- The stdout section used `java -version`, which reports version text on stderr on common Java implementations. Updated the surrounding explanation to mention stdout or stderr.
- The examples used `ansible.builtin.systemd`, which is now a redirect/alias to the renamed `ansible.builtin.systemd_service` module. Updated examples to use `ansible.builtin.systemd_service`.
- The `package_facts` example registered `pkg_facts` but then checked `ansible_facts.packages` directly. Updated the condition to use the registered result, `pkg_facts.ansible_facts.packages`, so the example matches the registered-variable topic.

## Review Notes
The remaining examples align with Ansible's documented behavior for `register`, `when`, `failed_when`, `changed_when`, skipped registered tasks, command return codes, stdout/stderr fields, loop `results`, and module-specific return data. `ansible-playbook` was not installed in the workspace, so local syntax-check execution was not available.
