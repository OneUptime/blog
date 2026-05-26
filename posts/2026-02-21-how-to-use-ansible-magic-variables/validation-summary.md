# Validation Summary: How to Use Ansible Magic Variables (hostvars, groups, inventory_hostname)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible magic variables
- Ansible inventory variables and facts
- Jinja2 templating in Ansible
- HAProxy configuration templating

## Sources Consulted
- Ansible Community Documentation: Discovering variables, facts, and magic variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible Community Documentation: Special Variables - https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- Ansible Community Documentation: YAML Syntax - https://docs.ansible.com/ansible/latest/reference_appendices/YAMLSyntax.html
- Ansible Community Documentation: ansible.builtin.regex_replace filter - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/regex_replace_filter.html
- GitHub author profile URL - https://github.com/nawazdhandala

## Issues Found
- The quick-reference table said `hostvars` is a dictionary of all variables for all hosts. Ansible documents `hostvars` as a dictionary of inventory hosts and assigned variables, with facts only available after gathering or caching them. Updated the wording to avoid overstating fact availability.
- The quick-reference table said `ansible_play_hosts` is the list of hosts in the current play. Ansible documents it as active hosts in the current play, excluding failed or unreachable hosts. Updated the wording accordingly.
- The quick-reference table said `play_hosts` is the same as `ansible_play_hosts`. Ansible documents `play_hosts` as deprecated and equivalent to `ansible_play_batch`. Updated the table entry.
- The `hostvars` example accessed `ansible_default_ipv4` as a top-level injected fact. Current Ansible documentation uses facts under `ansible_facts`, and top-level fact injection can be disabled. Updated the example to use `hostvars[inventory_hostname]['ansible_facts']['default_ipv4']['address']`.
- The `regex_replace` example used `(.*)`, which can also match the empty string at the end and append the port twice in Python-style regex replacement. Anchored the pattern as `^(.*)$` so each host address receives the port once.

## Review Notes
- `ansible` is not installed in this workspace, so I could not run `ansible-playbook --syntax-check`. The examples were reviewed against the official Ansible documentation and the regex behavior was checked with Python's regular expression engine.
- The examples assume referenced groups such as `webservers`, `databases`, `loadbalancers`, and `app_cluster` exist in inventory and that facts or inventory variables such as `ansible_host` are available where used.
- The author profile link resolves to the expected GitHub user.
