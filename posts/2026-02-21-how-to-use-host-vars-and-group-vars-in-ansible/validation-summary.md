# Validation Summary: How to Use host_vars and group_vars in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory
- Ansible host variables and group variables
- Ansible vars plugins
- Ansible Vault variable file organization
- ansible-playbook
- ansible-inventory
- YAML inventory and variable files

## Sources Consulted
- Ansible Community Documentation: How to build your inventory, including organizing host and group variables and inventory merge order: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible Community Documentation: ansible-inventory CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- Ansible Core Documentation: ansible.builtin.host_group_vars vars plugin reference: https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/host_group_vars_vars.html
- Ansible Documentation: Using variables and variable precedence: https://docs.ansible.com/projects/ansible/6/user_guide/playbooks_variables.html

## Issues Found
- The post described `ansible-inventory -i inventory/ --graph --vars` as showing the inventory graph with variable sources. Official CLI documentation says `--vars` adds variables to the graph display, but it does not show the source file for each variable. Changed the comment to say "with variables".

## Review Notes
- The local environment did not have `ansible-inventory` installed, so CLI behavior was verified against official Ansible documentation rather than local `--help` output.
- The simplified group and host variable precedence explanation is accurate for the tutorial's scope. Ansible also has broader variable precedence rules across inventory files, playbook-adjacent variable directories, play variables, role variables, facts, and extra vars.
