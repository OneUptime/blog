# Validation Summary: How to Verify Your Ansible Inventory with ansible-inventory --graph

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Ansible
- `ansible-inventory`
- Ansible inventory groups, hosts, and variables
- Dynamic inventory sources
- JSON, YAML, `jq`, and Python command-line processing

## Sources Consulted
- Ansible `ansible-inventory` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible dynamic inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_dynamic_inventory.html
- Ansible variable precedence documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/general_precedence.html
- Local verification with `ansible-core` 2.21.0 `ansible-inventory`

## Issues Found
- The post claimed it covered all ways to use `ansible-inventory`. Changed this to "common ways" because the CLI has additional options such as `--export`, `--toml`, cache controls, and vault-related options.
- The `--host` section overstated the output as the definitive view of all variables a host will have when a playbook runs. Changed this to clarify that `--host` shows inventory-derived host variables and does not include variables introduced later by plays, roles, tasks, registered results, `set_fact`, or extra vars unless those values are passed to the command.
- The dynamic inventory YAML conversion example omitted `--export`. Added `--export` for an export-oriented static YAML representation.
- The `jq` host count example counted only groups with direct `hosts` entries, which can skip parent groups that contain hosts only through child groups. Updated the comment to say "direct hosts per group."
- The `ungrouped` explanation said hosts in `ungrouped` are not assigned to any group. Clarified that they are not assigned to any group other than `all`.
- The staging/production overlap check only compared direct `hosts` entries and missed hosts inherited from child groups. Replaced it with a recursive child-group traversal.
- The generated report heading said "Host Count by Group" while the code counted only direct host entries. Changed the heading to "Direct Host Count by Group."

## Review Notes
The main `--graph`, group-scoped `--graph`, `--vars`, `--list`, `--host`, and `--yaml` commands were verified against current Ansible CLI behavior. The examples are now technically accurate for nested inventories, with the remaining direct-host count examples labeled accordingly.
