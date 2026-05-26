# Validation Summary: How to Use Role Defaults vs Role Vars Best Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible roles
- Ansible variable precedence
- YAML role variable files
- ansible.builtin.include_vars

## Sources Consulted
- Ansible Community Documentation: Using variables / Understanding variable precedence: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible Community Documentation: Roles / Role directory structure and role usage: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible Community Documentation: ansible.builtin.include_vars module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html

## Issues Found
- The post stated that `vars/main.yml` is precedence level 18. Current Ansible documentation lists role vars at level 15, with `include_vars` at level 18. Updated the text to use level 15 and clarify which variable sources can still override role vars.
- The precedence diagram grouped task vars with `set_fact` and placed role vars too high. Updated the diagram order to reflect current Ansible precedence more accurately for the variables discussed.
- The post stated that consumers would need extra vars (`-e`) to override values in `vars/main.yml`. Current Ansible documentation also allows role and include parameters to override role vars. Updated the sentence to mention passing variables directly to the role as well as extra vars.

## Review Notes
The remaining guidance is heuristic rather than a strict Ansible rule, but it matches Ansible's documented recommendation to use role defaults for easily overridden values and role vars when a role needs a value that inventory variables should not override.
