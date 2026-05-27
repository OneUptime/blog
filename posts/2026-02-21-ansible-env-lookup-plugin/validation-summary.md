# Validation Summary: How to Use the Ansible env Lookup Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible lookup plugins
- `ansible.builtin.env` lookup plugin
- Jinja2 templating and `default` filter usage in Ansible
- Ansible facts and remote command execution
- Shell environment variables and CI/CD environment injection

## Sources Consulted
- Ansible `ansible.builtin.env` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/env_lookup.html
- Ansible lookups playbook guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_lookups.html
- Ansible lookup plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/lookup.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible facts and magic variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html

## Issues Found
- Several examples used `default('value')` after `lookup('env', ...)`. Because the env lookup returns an empty string by default when an environment variable is undefined, the Jinja default filter must use its boolean argument, such as `default('value', true)`, for these fallbacks to apply. Updated the CI/CD defaults, environment selector, config path, and DB port examples.
- The post suggested using `ansible.builtin.command` with `echo $VARIABLE` to read a remote environment variable. The command module does not use shell processing, and shell-style expansion is not the right general recommendation. Updated the text to recommend gathered facts such as `ansible_env`, or `ansible.builtin.shell` when shell expansion is specifically required.
- The `.env` example used `source .env && ansible-playbook deploy.yml`. Sourcing a file with plain `KEY=value` assignments does not export those variables to child processes by default. Updated the command to use `set -a` while sourcing the file.
- The limitations section said the lookup is resolved at playbook parse time, not task execution time. Official Ansible documentation states lookup expressions are evaluated by templating on the control node when used in a task or template. Updated the wording accordingly.

## Review Notes
Ansible was not installed in the local workspace, so local `ansible-playbook` syntax validation could not be run. The review was performed against current official Ansible documentation.
