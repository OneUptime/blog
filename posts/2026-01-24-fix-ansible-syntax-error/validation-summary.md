# Validation Summary: How to Fix 'Syntax Error' in Ansible Playbooks

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Ansible playbooks
- YAML
- Jinja2 templating
- yamllint
- ansible-lint
- Ansible CLI tools

## Sources Consulted
- Ansible playbook guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_intro.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible variables documentation, including the YAML quoting guidance for Jinja2 expressions: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible-lint documentation: https://docs.ansible.com/projects/lint/
- yamllint rules documentation: https://yamllint.readthedocs.io/en/stable/rules.html
- Jinja template documentation: https://jinja.palletsprojects.com/en/stable/templates/
- YAML 1.1 boolean type documentation: https://yaml.org/type/bool.html
- Local verification with `ansible-core 2.21.1`, `ansible-lint 26.4.0`, `yamllint 1.38.0`, Jinja2 3.1.6, and PyYAML 6.0.3 installed under `/tmp/ansible-validate-pkgs`.

## Issues Found
- The quoting section used an inaccurate example error message for unquoted colons. Updated it to the YAML parser message pattern observed for the examples: `mapping values are not allowed in this context`.
- The boolean values section described unquoted `yes` as a syntax error. It is valid YAML, but can be parsed as boolean `True`; updated the error text and explanation accordingly.
- The Jinja2-at-start example used an inaccurate `found undefined alias` message. Updated it to Ansible's current diagnostic about missing quotes around a template block.
- The nested quotes example was valid YAML as written because the shell command was a plain scalar. Changed the incorrect example to a YAML double-quoted string with unescaped nested quotes, and updated the fixed examples to valid YAML forms.
- The invalid `apt` parameter example claimed `package` is not valid. Official Ansible documentation lists `package` and `pkg` as aliases for `name`, so the example was changed to the unsupported parameter `package_name`.
- The missing `hosts` example used an inaccurate error message. Updated it to Ansible's current message: `The field 'hosts' is required but was not set.`
- The `when` condition example used an inaccurate error message and described `=` as assignment. Updated the message to match current Ansible behavior and clarified that single equals is not a valid comparison operator in this expression.
- The quick reference table had an inaccurate `found unexpected ':'` row. Updated it to match the corrected YAML parser message.

## Review Notes
Some examples intentionally show invalid YAML or invalid Ansible tasks, so they were reviewed as illustrative failure cases rather than runnable snippets. `ansible-playbook --syntax-check` validates playbook loading and syntax, but it does not catch every runtime issue, such as unsupported module parameters or invalid `when` expressions that are evaluated during task execution.
