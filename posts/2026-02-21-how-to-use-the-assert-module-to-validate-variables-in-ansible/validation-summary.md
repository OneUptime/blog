# Validation Summary: How to Use the assert Module to Validate Variables in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- ansible.builtin.assert module
- Jinja tests and filters
- Ansible facts
- YAML configuration snippets

## Sources Consulted
- Ansible assert module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible playbook tests documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible type_debug filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/type_debug_filter.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html

## Issues Found
- The post stated that `quiet: true` is available in Ansible 2.10+. Official documentation says the `quiet` option was added in Ansible 2.8, so the version reference was corrected.
- The integer validation example compared `type_debug` output to type names while also allowing string types, but then rejected strings with `server_port | int == server_port`. Current Ansible documentation recommends type tests for validation, so the example now uses `server_port is integer` and keeps `type_debug` only in the failure message.
- The network validation regexes only checked the shape of IPv4 addresses and CIDR strings, so invalid values like `999.999.999.999` or `/99` would pass even though the text called them valid. The regexes were tightened to check IPv4 octet ranges and CIDR prefix lengths from 0 to 32.
- The `db_host` assertion failure message referenced `db_host` directly even though the same assertion checked whether it was defined. The message now uses `default('undefined')` so the failure path remains valid when the variable is missing.

## Review Notes
The examples use fully qualified Ansible module names and current `fail_msg`, `success_msg`, and `quiet` parameters. The disk and memory fact examples are valid when facts are gathered and injected as top-level `ansible_` variables, as shown in the playbook.
