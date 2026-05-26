# Validation Summary: How to Debug Variable Values with type_debug Filter in Ansible

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ansible playbooks
- ansible.builtin.type_debug filter
- ansible.builtin.debug, ansible.builtin.set_fact, ansible.builtin.command, ansible.builtin.include_tasks, and ansible.builtin.assert modules
- Jinja2 filters and tests
- YAML scalar parsing

## Sources Consulted
- Ansible documentation: ansible.builtin.type_debug filter - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/type_debug_filter.html
- Ansible documentation: defining variables at runtime / --extra-vars - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html#defining-variables-at-runtime
- Ansible documentation: YAML syntax and gotchas - https://docs.ansible.com/projects/ansible/latest/reference_appendices/YAMLSyntax.html
- Ansible documentation: ansible.builtin.command return values - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html#return-values
- Ansible documentation: ansible.builtin.bool filter - https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/bool_filter.html
- Ansible documentation: ansible.builtin.int filter - https://docs.ansible.com/projects/ansible/12/collections/ansible/builtin/int_filter.html
- Jinja documentation: int filter and built-in tests - https://jinja.palletsprojects.com/en/stable/templates/
- Local validation with ansible-core 2.21.0, Jinja 3.1.6, and PyYAML 6.0.3 installed into a temporary target directory under /tmp

## Issues Found
- Current ansible-core reports plain string values through `type_debug` as `str`, not `AnsibleUnicode`. Updated the comments for string examples accordingly.
- The extra-vars guidance said extra vars are always strings. Ansible documents that `key=value` extra-vars are strings, while JSON or YAML extra-vars can preserve non-string values. Narrowed the statement to key=value extra-vars.
- The YAML example claimed `1e10` parses as a float. With Ansible's current PyYAML-based parsing, `1e10` remains a string; changed the example to `1.0e+10`, which parses as a float.

## Review Notes
The reusable debug helper is suitable as a debugging aid, but its validation expression for integer conversion is intentionally strict and will reject formats such as leading-zero integers or values with surrounding whitespace. That is acceptable for the example, but production validation may need rules tailored to the expected input format.
