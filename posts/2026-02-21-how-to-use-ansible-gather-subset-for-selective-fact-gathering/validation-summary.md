# Validation Summary: How to Use Ansible gather_subset for Selective Fact Gathering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.setup
- Ansible fact gathering
- YAML playbooks
- ansible CLI

## Sources Consulted
- Ansible Community Documentation: ansible.builtin.setup module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible Community Documentation: Module defaults - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_module_defaults.html
- Ansible Community Documentation: Ansible Configuration Settings - https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Local ansible-core 2.21.0 runtime checks using ansible, ansible-config, and ansible-playbook from an isolated /tmp install

## Issues Found
- The post described `minimum` as an alias for `min`, but current ansible-core rejects `minimum` as an invalid `gather_subset` value. Changed references to use only `min`.
- The post stated that `min` is always collected regardless of configuration. Current Ansible documentation says `!all,!min` collects no facts, so the wording now says `min` is collected by default unless explicitly excluded.
- The exclusion example used `all` plus several exclusions while describing "minimum and network facts." Changed it to use `!all` plus `network`, matching the documented pattern for collecting the default minimum set plus a specific subset.
- The post showed `[defaults] gather_subset = min` and `ANSIBLE_GATHER_SUBSET`, but current ansible-core configuration docs and `ansible-config list` do not include those settings. Replaced that section with a `module_defaults` example for `ansible.builtin.setup`.
- The benchmark command used `ANSIBLE_GATHER_SUBSET`, which is not a current configuration path. Replaced it with an `ansible` ad-hoc `setup` command that passes `gather_subset` directly to the module.

## Review Notes
The benchmark numbers are illustrative and environment-dependent. The examples otherwise align with current Ansible setup module behavior and the YAML snippets parse successfully.
