# Validation Summary: How to Use Ansible limit Flag to Run on Specific Hosts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-playbook CLI
- Ansible ad-hoc commands
- Ansible inventory host patterns
- Ansible retry file configuration
- Ansible playbook `serial`

## Sources Consulted
- Ansible documentation: Patterns: targeting hosts and groups - https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible documentation: ansible-playbook CLI - https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible Core documentation: Configuration settings (`retry_files_enabled`, `retry_files_save_path`, `run_vars_plugins`) - https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/config.html
- Ansible Core documentation: Vars plugins - https://docs.ansible.com/projects/ansible-core/devel/plugins/vars.html
- Ansible documentation: ansible.builtin.host_group_vars vars plugin - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/host_group_vars_vars.html
- Ansible documentation: ansible.builtin.service module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible documentation: ansible.builtin.uri module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible documentation: Rolling upgrades and the `serial` keyword - https://docs.ansible.com/projects/ansible/latest/playbook_guide/guide_rolling_upgrade.html
- Local CLI validation using temporary `ansible-core` 2.21.0 install under `/tmp`

## Issues Found
- The example `--limit 'db[0-9][0-9]'` was invalid for current Ansible host patterns because bracket syntax is interpreted as group slicing, not wildcard digit matching. Changed it to the documented regex form `--limit '~db[0-9][0-9]'`.
- The retry-file section implied Ansible always creates `.retry` files on failure. Current Ansible has `retry_files_enabled` defaulting to `False`, so the text now says retry files are created when retry files are enabled.
- The tips section said Ansible still loads all `group_vars` and `host_vars` when using `--limit`. Current Ansible vars plugins run on demand by default, so the wording now says Ansible resolves the relevant variables for the hosts that run and does not modify inventory variables.

## Review Notes
The remaining examples and explanations align with current Ansible host pattern behavior, `--limit` / `--list-hosts` CLI options, ad-hoc command usage, module argument syntax, and `serial` rolling deployment behavior. The local machine did not have Ansible installed globally, so command behavior was checked with a temporary `ansible-core` 2.21.0 install.
