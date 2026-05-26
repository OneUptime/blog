# Validation Summary: How to Override Role Default Variables in Ansible

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- Ansible roles
- Ansible variable precedence
- YAML playbooks and variable files
- Ansible inventory variables

## Sources Consulted
- Ansible Community Documentation: Roles - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible Community Documentation: Using variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible Community Documentation: ansible.builtin.include_role - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible Community Documentation: ansible.builtin.import_role - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_role_module.html
- Ansible Community Documentation: ansible-playbook CLI - https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html

## Issues Found
- The role parameters example used `vars:` under the role entry while describing role parameters. Updated the example to pass variables directly under the role entry, matching Ansible's documented role parameter syntax.
- The post stated that role-entry `vars` have the same precedence as play `vars`. Updated the explanation because documented role parameters have higher precedence than play vars, vars_files, role vars, include_vars, and set_fact, while extra vars still override them.
- The role vars section said only extra vars and `set_fact` can override role vars. Updated it to include other higher-precedence sources documented by Ansible, including block vars, task vars, include_vars, registered vars, role/include parameters, include parameters, and extra vars.
- The final precedence summary had role parameters in the wrong order and omitted role vars. Updated the summary order for the variable sources covered in the post.

## Review Notes
The remaining examples are syntactically valid YAML, inventory, and Ansible CLI usage for current Ansible documentation. The post intentionally simplifies Ansible's full precedence list, so the summary now says "among the sources covered here" rather than claiming to be exhaustive.
