# Validation Summary: How to Handle Boolean Variables in Ansible

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks
- Ansible variables and extra vars
- Ansible `bool`, `ternary`, and `type_debug` filters
- Ansible `when` conditionals
- YAML boolean parsing
- Jinja2 expression evaluation

## Sources Consulted
- Ansible Community Documentation: YAML Syntax - https://docs.ansible.com/projects/ansible/latest/reference_appendices/YAMLSyntax.html
- Ansible Community Documentation: Using variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible Community Documentation: Conditionals - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible Community Documentation: `ansible.builtin.bool` filter - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/bool_filter.html
- Ansible Core Documentation: `ansible.builtin.ternary` filter - https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/ternary_filter.html
- Ansible Core Documentation: `ansible.builtin.type_debug` filter - https://docs.ansible.com/projects/ansible-core/2.14/collections/ansible/builtin/type_debug_filter.html
- YAML 1.1 boolean type draft - https://yaml.org/type/bool.html

## Issues Found
- The post said all extra vars passed with `-e` are strings. Ansible documents that `key=value` extra vars are strings, while JSON or YAML extra vars can carry native booleans and other non-string values. Updated the wording to specify `key=value` form and mention JSON/YAML for native booleans.
- The post described quoted strings as `AnsibleUnicode`. Current Python 3 / ansible-core behavior reports a string type such as `str` through `type_debug`. Updated the wording to avoid the outdated type name.
- The post treated `bool` as a broad truthiness filter for values such as empty strings, `null`, and arbitrary non-empty strings. Current Ansible documentation defines a limited set of valid true and false values, and ansible-core 2.21 emits deprecation warnings when invalid values are coerced. Updated the defensive example, truthiness table, and best-practice wording to focus on supported boolean-like values.

## Review Notes
Validated the YAML snippets with PyYAML 6.0.3 and syntax-checked the standalone playbook examples with a temporary ansible-core 2.21.0 install. The role task snippet is not a standalone playbook, so it was wrapped in a minimal test play for syntax checking.
