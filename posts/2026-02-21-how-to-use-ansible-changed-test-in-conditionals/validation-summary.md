# Validation Summary: How to Use Ansible changed Test in Conditionals

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible conditionals
- Ansible registered task results
- Ansible handlers
- Ansible modules: template, copy, service, systemd, apt, debug, lineinfile, command
- YAML

## Sources Consulted
- Ansible changed test documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/changed_test.html
- Ansible tests syntax documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible conditionals documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible check mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html

## Issues Found
- The post described `is changed` as a filter and called `|changed` an older equivalent. Updated the wording to identify `is changed` as the current test syntax and note that filter-style test syntax is not current in Ansible 2.9+.
- The "Using is not changed" section repeated the same inverse test twice. Simplified it to only document `is not changed`.
- The final `when` condition was not valid YAML because only the inner string was quoted. Quoted the full expression: `when: "'1.0' not in app_version.stdout"`.
- The post said `command` and `shell` always report changed. Updated the wording because `creates`, `removes`, and `changed_when` can alter that behavior.

## Review Notes
The YAML snippets were parsed after edits and all code blocks are syntactically valid YAML. The examples use current Ansible test syntax and fully qualified built-in module names.
