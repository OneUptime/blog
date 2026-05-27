# Validation Summary: How to Use the Ansible random_choice Lookup Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible lookup plugins
- ansible.builtin.random_choice lookup
- ansible.builtin.random filter
- Jinja2 templating in Ansible playbooks
- YAML playbooks
- chrony configuration snippets

## Sources Consulted
- Ansible documentation: ansible.builtin.random_choice lookup - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/random_choice_lookup.html
- Ansible documentation: Lookups - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_lookups.html
- Ansible documentation: ansible.builtin.random filter - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/random_filter.html
- Ansible documentation: ansible.builtin.password lookup - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/password_lookup.html
- Ansible source: random_choice lookup implementation - https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/plugins/lookup/random_choice.py
- Local syntax validation with ansible-core 2.19.10

## Issues Found
- The post said `random_choice` uses Python's standard `random` module and is not cryptographically secure. Current Ansible source uses Python's `secrets.choice`. I changed the caveat to say it is not a secret generator and should not be used to generate keys or passwords.
- The idempotency caveat recommended using the `password` lookup to generate a persistent random seed. The more direct Ansible-supported option for repeatable random selection is the `random` filter with a stable `seed`, so I corrected that recommendation.
- The post said passing an empty list causes an error. In ansible-core 2.19.10, `lookup('ansible.builtin.random_choice', *empty_list)` returns an empty result. I corrected the caveat to describe the actual behavior.
- The chrony example notified `restart chronyd` without defining a handler. I added a minimal `restart chronyd` handler using `ansible.builtin.systemd` so the playbook is complete.

## Review Notes
All YAML playbook examples were syntax-checked with ansible-core 2.19.10. Snippets using non-local host groups produced expected inventory warnings during syntax validation because the temporary validation inventory only contained localhost.
