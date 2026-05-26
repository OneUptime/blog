# Validation Summary: How to Use the TOML Inventory Plugin in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory plugins
- ansible.builtin.toml inventory plugin
- TOML inventory files
- ansible-inventory and ansible-playbook CLI usage
- Ansible INI and YAML inventory comparisons

## Sources Consulted
- Ansible documentation: ansible.builtin.toml inventory plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/toml_inventory.html
- Ansible Core documentation: enabling inventory plugins: https://docs.ansible.com/projects/ansible-core/devel/plugins/inventory.html
- Ansible documentation: ansible-inventory CLI options: https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- Ansible documentation: building inventories, ranges, and INI variable typing notes: https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html
- Ansible documentation: ansible.builtin.ini inventory notes: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/ini_inventory.html
- TOML v1.0.0 specification: https://toml.io/en/v1.0.0
- Python documentation: tomllib standard library module: https://docs.python.org/3.11/library/tomllib.html

## Issues Found
- The post said the TOML inventory plugin comes from the `community.general` collection. Current Ansible documentation identifies it as `ansible.builtin.toml`, included with `ansible-core` and new in Ansible 2.8. Updated the introduction, prerequisites, enablement instructions, and limitations accordingly.
- The original TOML inventory examples used table paths such as `[all.children.webservers.hosts.web1]`. Ansible's TOML plugin expects each group's `children` entry to be a list, so those snippets failed to parse. Rewrote the examples to use group tables such as `[webservers.hosts.web1]` and explicit `children = [...]` lists for nested groups.
- The note claiming TOML keys with hyphens must be quoted was incorrect. The TOML v1.0.0 spec allows dashes in bare keys. Updated the note to say quoted keys are useful for names outside the bare-key set, while hyphenated keys are valid either way.
- The comparison table described INI values as strings only and said INI has no list support. Ansible INI inline host variables are parsed as Python literals, while `:vars` entries are strings. Updated the table to describe that limitation more accurately.
- The post said TOML is not an Ansible default and needs a plugin. The TOML plugin is built in and included in the default enabled plugin list in current Ansible. Updated the comparison table and enablement section.
- The conversion section said there is no built-in way to export inventory as TOML. Current `ansible-inventory` supports `--toml`. Added that command and revised the explanation.

## Review Notes
- Verified all five TOML code blocks by running them through `ansible-inventory -i <file> --list` using an isolated `ansible-core` install. The nested and production examples were also checked with `--graph --vars` to confirm group inheritance.
- The local workspace did not have Ansible installed initially, so validation used a temporary target install under `/tmp/ansible-review-target`.
