# Validation Summary: How to Debug Ansible YAML Syntax Errors

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Ansible playbooks
- YAML syntax
- ansible-lint
- yamllint
- PyYAML
- VS Code YAML editing
- Vim YAML indentation settings

## Sources Consulted
- Ansible Community Documentation: YAML Syntax, https://docs.ansible.com/projects/ansible/latest/reference_appendices/YAMLSyntax.html
- Ansible Community Documentation: Using variables, https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible Lint Documentation: yaml rule, https://docs.ansible.com/projects/lint/rules/yaml/
- Ansible Lint Documentation: syntax-check rule, https://docs.ansible.com/projects/lint/rules/syntax-check/
- Ansible Lint Documentation: usage and CLI options, https://docs.ansible.com/projects/lint/usage/
- yamllint Documentation: configuration, https://yamllint.readthedocs.io/en/stable/configuration.html
- Local PyYAML 6.0.1 parser checks for the examples that depend on loader behavior.

## Issues Found
- The tabs section said YAML does not allow tab characters generally. YAML's practical restriction here is tabs used for indentation, so the text now says tabs are not allowed for indentation.
- The incorrect indentation example was still syntactically valid YAML under PyYAML, even though it was poor style. I replaced it with a truly misaligned indentation example that produces a parser error.
- The missing-space-after-colon example implied a YAML syntax error in all cases. In block-style mappings, Ansible's documented form is `key: value`; without the space, the sample may parse as a plain scalar instead of the intended key/value pair. The comment now states that more precisely.
- The special-character wording was too broad because many characters only require quoting in specific positions or contexts. I changed the wording to "in specific contexts" and "often require quoting."
- The duplicate-key section said YAML does not allow duplicate keys while the example comment said the later key overwrites the earlier one. The text now explains that mappings should not contain duplicate keys, linters report them, and some loaders silently keep the last value.

## Review Notes
The Ansible and ansible-lint guidance is current as of May 26, 2026. The post intentionally uses YAML/PyYAML behavior relevant to Ansible, including YAML 1.1-style boolean and octal surprises; ansible-lint's current yaml rule also recommends quoting octal-looking values for consistent loader behavior.
