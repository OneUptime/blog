# Validation Summary: How to Use Host Ranges in Ansible Inventory

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible inventory
- INI inventory format
- YAML inventory format
- Ansible host patterns and `--limit`
- Ansible CLI commands: `ansible`, `ansible-inventory`, and `ansible-playbook`

## Sources Consulted
- Ansible Community Documentation: How to build your inventory, including ranges, YAML and INI inventory examples, stride syntax, variables, and `host_vars`: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible Community Documentation: Patterns, targeting hosts and groups, group slicing, and `--limit`: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible Community Documentation: `ansible.builtin.yaml` inventory plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yaml_inventory.html
- Ansible Community Documentation: `ansible.builtin.advanced_host_list` inventory plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/advanced_host_list_inventory.html
- Local verification with Ansible Core 2.21.0 Python CLI modules.

## Issues Found
- The padding labels in the "Ranges with Different Padding" examples were off by one digit. Changed `node-[001:100]` to "three-digit zero-padding" and `worker-[0001:0500]` to "four-digit padding".
- The post claimed each host line supports only one range and that matrix-style expansion requires multiple lines. Local Ansible Core 2.21 verification showed `rack[1:3]-srv-[01:05].dc.local` expands correctly to 15 hosts, so the section was corrected.
- The post claimed YAML inventory does not natively expand ranges and made range support version-dependent. Official Ansible documentation shows both INI and YAML inventory examples with host ranges, so the section was corrected.
- The post claimed Ansible does not natively support step values in ranges. Official Ansible documentation supports numeric strides with `[start:end:step]`, so the example was replaced with `srv-[02:10:2].example.com`.
- The host-count command used `wc -l` directly on `ansible --list-hosts`, which counts the header line as well as hosts. Updated it to `tail -n +2 | wc -l`.
- The `--limit` example used inventory range syntax, which did not match expanded inventory hosts in local testing. Updated it to use group slicing with `--limit 'webservers[0:4]'`.

## Review Notes
The corrected examples were syntax-checked with local Ansible Core 2.21.0 via `python3 -m ansible.cli.inventory` and `python3 -m ansible.cli.playbook --list-hosts`. The shell executables `ansible`, `ansible-inventory`, and `ansible-playbook` were not on `PATH` in this environment, but the installed Ansible Python CLI modules were available and used for verification.
