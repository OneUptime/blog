# Validation Summary: How to Handle Module Return Values in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible module development
- Python
- YAML playbooks

## Sources Consulted
- Ansible Community Documentation: Return Values: https://docs.ansible.com/ansible/latest/reference_appendices/common_return_values.html
- Ansible Community Documentation: Module format and documentation, RETURN block: https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_modules_documenting.html
- Ansible Core Documentation: Developing modules, facts and info modules: https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_modules_general.html

## Issues Found
- The post said to always include `changed`, `msg`, `diff`, and `warnings` as standard return keys. Ansible documents `diff` and `warnings` as common return keys, but they are only appropriate when the module has diff information or warnings to report. I changed the section title and wording to describe them as common keys and clarified that warnings are returned when needed.
- The `RETURN` documentation example omitted required metadata for nested fields and samples for some returned values. I added `returned` and `sample` entries for the nested fields and a sample for `msg`, and adjusted descriptions to match Ansible's documented return block style.

## Review Notes
The examples are intentionally partial snippets, so undefined names such as `AnsibleModule`, `module_args`, and `create_resource` are acceptable in context. The `ansible_facts` guidance is technically correct; for future expansion, the post could mention Ansible's distinction between host-specific facts modules and general `_info` modules.
