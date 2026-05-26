# Validation Summary: How to List All Hosts in Ansible Inventory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory
- Ansible CLI
- Ansible playbooks
- Jinja2 templates
- JSON, YAML, jq, and shell pipelines

## Sources Consulted
- Ansible `ansible-inventory` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- Ansible `ansible` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible inventory pattern documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible special variables documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html

## Issues Found
- The `--host` explanation said the command shows the final merged value of every variable the host will receive, and related labels described the output as all variables. This was too broad because `ansible-inventory --host` reports host information from inventory processing, not every possible playbook, fact, or runtime variable. I changed the text to say it shows merged inventory variables from group_vars, host_vars, and inline inventory variables.
- The report-generation example used `copy.content` with Jinja variable interpolation. Ansible's `copy` module documentation recommends using `ansible.builtin.template` for content that contains variables. I changed the example to use the `template` module with an `inventory-report.j2` template.

## Review Notes
- The local environment did not have Ansible installed, so command behavior was verified against the current official Ansible documentation rather than local `--help` output.
- The inventory commands, `--list`, `--graph`, `--vars`, `--host`, `--yaml`, `--list-hosts`, and host pattern examples match current Ansible documentation.
