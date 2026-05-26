# Validation Summary: How to Use Ansible inventory_hostname vs ansible_hostname

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible inventory
- Ansible magic variables
- Ansible facts
- Ansible playbooks
- Ansible modules: setup, debug, set_fact, template, file, uri, hostname, shell, lineinfile, command, assert
- YAML
- Linux hostname management

## Sources Consulted
- Ansible special variables documentation: https://docs.ansible.com/ansible/latest/reference_appendices/special_variables.html
- Ansible facts and magic variables documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible inventory documentation: https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html
- ansible.builtin.setup module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/setup_module.html
- ansible.builtin.command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.shell module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/shell_module.html
- ansible.builtin.hostname module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/hostname_module.html
- ansible.builtin.lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html

## Issues Found
- The `ansible.builtin.command` example used a shell pipeline with `ss -tlnp | grep ...`. The Ansible command module does not process shell metacharacters such as pipes, so the example would not run as described. Updated the example to use `ansible.builtin.shell` for a pipeline-based hostname check and added the `quote` filter for safer interpolation.
- The hostname synchronization section implied that any `inventory_hostname` is appropriate as a system hostname, but the earlier examples include a raw IP address. Updated the text to clarify that this pattern should be used when inventory names are valid hostnames rather than raw IP addresses or arbitrary aliases.

## Review Notes
- The core distinction is accurate: `inventory_hostname` is an Ansible magic variable for the current inventory host, while `ansible_hostname` is a gathered fact and is unavailable unless facts have been gathered or cached.
- Current Ansible documentation recommends accessing facts through `ansible_facts[...]`, but the top-level injected fact variables shown in the post, such as `ansible_hostname` and `ansible_default_ipv4`, remain common and are still documented in Ansible examples.
