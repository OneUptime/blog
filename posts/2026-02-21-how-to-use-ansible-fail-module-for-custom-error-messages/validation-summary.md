# Validation Summary: How to Use Ansible fail Module for Custom Error Messages

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- ansible.builtin.fail module
- ansible.builtin.assert module
- ansible.builtin.command module
- ansible.builtin.set_fact module
- Ansible conditionals, loops, facts, and block/rescue error handling
- PostgreSQL client utilities

## Sources Consulted
- Ansible ansible.builtin.fail module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/fail_module.html
- Ansible ansible.builtin.assert module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.set_fact module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible conditionals documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible block/rescue documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_blocks.html
- Ansible regex_search filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/regex_search_filter.html
- Ansible facts documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_vars_facts.html
- PostgreSQL psql documentation: https://www.postgresql.org/docs/current/app-psql.html
- PostgreSQL documentation version index: https://www.postgresql.org/docs/

## Issues Found
- The PostgreSQL client version example only checked for substrings `14`, `15`, and `16`, which could reject newer supported clients such as PostgreSQL 17 or 18 and could also produce false positives if those digits appeared elsewhere in the output. Updated the condition to use `regex_search` against the major version and accept PostgreSQL 14 or newer.
- The GPU block/rescue example registered `nvidia-smi` without `failed_when: false`, so a missing GPU would cause the command task itself to fail and jump directly to `rescue` before the explicit `ansible.builtin.fail` task could run. Added `failed_when: false` so the fail task performs the intentional failure shown in the section.

## Review Notes
- The examples use fully qualified Ansible module names, which matches Ansible's current documentation recommendations.
- The use of `ansible_date_time` in a deployment-window guard is technically valid when facts are gathered, but Ansible documents that this fact is captured at fact-gathering time and can become stale during long-running playbooks.
