# Validation Summary: How to Use Multiple Conditions with and/or in Ansible when

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible `when` conditionals
- Jinja expressions and boolean logic
- Ansible facts and magic variables
- Ansible built-in modules

## Sources Consulted
- Ansible conditionals documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible special variables documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- Ansible `copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Jinja template documentation: https://jinja.palletsprojects.com/en/stable/templates/

## Issues Found
- The introduction said Ansible supports AND and OR logic with two different syntaxes for each. This conflicted with the later, correct statement that OR has no list shorthand. Updated the introduction to say AND can use list or inline syntax, while OR uses a Jinja expression with the `or` keyword.
- The negation example named a task "Run on non-Linux systems" while the condition only excluded Debian and RedHat OS families. Other Linux OS families can also match that condition. Renamed it to "Run on non-Debian/RedHat systems."

## Review Notes
The main conditional examples align with Ansible's documented behavior: `when` clauses use raw Jinja expressions, list-form `when` entries are implicitly ANDed, `and`/`or` expressions and parentheses are valid, and `ansible_play_batch` is a documented magic variable. Ansible was not installed in the local environment, so examples were reviewed against official documentation rather than with `ansible-playbook --syntax-check`.
