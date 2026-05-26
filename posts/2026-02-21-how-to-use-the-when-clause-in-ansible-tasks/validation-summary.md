# Validation Summary: How to Use the when Clause in Ansible Tasks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible `when` conditionals
- Ansible facts
- Ansible loops and blocks
- Jinja2 expressions, tests, and filters
- Ansible `apt`, `dnf`, `debug`, and `template` modules

## Sources Consulted
- Ansible conditionals documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible blocks documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible loops documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible tests documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible `bool` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/bool_filter.html
- Ansible `apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `dnf` module documentation: https://docs.ansible.com/projects/ansible/13/collections/ansible/builtin/dnf_module.html
- Jinja template tests documentation: https://jinja.palletsprojects.com/en/latest/templates/#tests

## Issues Found
- The post described `match` and `version` as plain Jinja2 tests. In Ansible, `defined`, `none`, `even`, and `divisibleby` are Jinja built-in tests, while `match` and `version` are Ansible-provided tests used with Jinja test syntax. Updated the section heading and wording to say "Jinja2-style tests, including Ansible-provided tests."

## Review Notes
The examples use older injected fact variable names such as `ansible_os_family` and `ansible_distribution`. These remain commonly supported when fact injection is enabled, though Ansible's current documentation often shows the explicit `ansible_facts[...]` form.
