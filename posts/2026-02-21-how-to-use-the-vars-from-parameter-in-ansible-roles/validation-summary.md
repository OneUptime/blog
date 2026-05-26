# Validation Summary: How to Use the vars_from Parameter in Ansible Roles

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible roles
- ansible.builtin.include_role
- ansible.builtin.include_vars
- ansible.builtin.first_found lookup
- Ansible variable precedence
- YAML playbooks

## Sources Consulted
- Ansible Community Documentation: ansible.builtin.include_role module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible Community Documentation: ansible.builtin.include_vars module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible Community Documentation: ansible.builtin.first_found lookup - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/first_found_lookup.html
- Ansible Community Documentation: Using variables / variable precedence - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_variables.html

## Issues Found
- The post said `vars_from` could load a specific vars file "instead of (or in addition to)" `vars/main.yml`. Official `include_role` documentation defines `vars_from` as the file loaded from the role's `vars/` directory, with `main` as the default. I changed the wording to state that setting `vars_from` selects that vars file instead of the default `main` entry point and does not automatically layer `vars/main.yml`.
- The examples described `vars/main.yml` as common variables loaded in all contexts, which is misleading when `vars_from` is set to another file. I updated the comments to say those variables are loaded by default when `vars_from` is not set.
- The fallback section was titled as a `vars_from` pattern even though the snippet uses `include_vars` with `first_found`. I renamed and clarified the section so it accurately describes the mechanism being used.

## Review Notes
The remaining examples use current fully qualified Ansible module names and match the documented parameters for `include_role`, `include_vars`, and `first_found`. The variable precedence explanation is accurate for the discussed role vars, with the caveat that `include_vars`, registered variables, `set_fact`, role/include parameters, and extra vars have higher precedence than role vars in Ansible's full precedence list.
