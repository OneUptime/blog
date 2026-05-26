# Validation Summary: How to Use Ansible loop with Registered Variable Results

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible loops
- Registered variables
- Jinja2 filters and tests in Ansible
- Ansible built-in modules: stat, command, systemd, get_url, set_fact, find, copy, uri, debug

## Sources Consulted
- Ansible Community Documentation: Loops - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible Community Documentation: Conditionals - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible Community Documentation: Error handling in playbooks - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible Community Documentation: Using filters to manipulate data - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_filters.html
- Ansible Community Documentation: ansible.builtin.set_fact module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible Community Documentation: ansible.builtin.uri module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible Community Documentation: ansible.builtin.command module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible Community Documentation: ansible.builtin.stat module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/stat_module.html

## Issues Found
- The package version report used `item.stdout | default('NOT INSTALLED')`, which only substitutes the fallback for undefined values by default. A failed `dpkg-query` command can leave `stdout` defined but empty, so the example did not reliably produce `NOT INSTALLED`. Changed the expression to use `item.rc == 0` with `ternary(...)`.
- The health-check example configured `status_code: [200, 301, 302]` as accepted URI success statuses, but the summary and unhealthy filter treated only HTTP 200 as healthy. Updated both checks to use `[200, 301, 302]` consistently.
- The registered-result structure example was marked as JSON but used ellipses, making the snippet invalid JSON. Removed the ellipses while preserving the structure being illustrated.

## Review Notes
The main explanation of loop registration is accurate: Ansible stores per-iteration module responses under a `results` list, and each result includes the original loop item. The examples intentionally use `ignore_errors: yes`, which is accepted Ansible syntax, though newer style often uses boolean `true`.
