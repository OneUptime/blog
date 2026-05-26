# Validation Summary: How to Use Ansible Inventory Patterns to Target Specific Hosts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory patterns
- Ansible ad hoc commands
- Ansible playbook `hosts` patterns
- Ansible `--limit` flag
- Ansible retry files
- YAML playbooks
- INI inventory files

## Sources Consulted
- Ansible Community Documentation: Patterns: targeting hosts and groups - https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible Community Documentation: Ansible configuration settings, `RETRY_FILES_ENABLED` and `RETRY_FILES_SAVE_PATH` - https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html

## Issues Found
- The post said Ansible processes combined patterns left to right. Official Ansible documentation specifies that pattern processing happens by operation type: unions with `:` or `,` first, then intersections with `&`, then exclusions with `!`. Updated the explanation and Mermaid diagram accordingly.
- The post said Ansible automatically creates `.retry` files with failed hosts. In current Ansible, `RETRY_FILES_ENABLED` defaults to `False`; retry files are only created when that setting is enabled. Updated the text to state that `.retry` files are created if `retry_files_enabled` is set to `True`.
- The indexed selection section included `webservers[0::2]` for step slicing. Official Ansible pattern documentation supports indexed selection and inclusive `s[i:j]` slices, but not Python-style step slices. Replaced the example with the documented `webservers[1:]` slice form.

## Review Notes
The remaining examples and explanations match the official Ansible inventory pattern documentation. Ansible was not installed in the local environment, so command behavior was verified against official documentation rather than local CLI execution.
