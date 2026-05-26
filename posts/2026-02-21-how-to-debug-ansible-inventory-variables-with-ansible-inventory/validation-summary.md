# Validation Summary: How to Debug Ansible Inventory Variables with ansible-inventory

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible inventory
- ansible-inventory CLI
- Ansible playbooks
- ansible.builtin.debug module
- ansible.builtin.assert module
- Dynamic inventory
- Python JSON parsing
- Bash shell commands

## Sources Consulted
- Ansible Community Documentation: ansible-inventory CLI: https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- Ansible Community Documentation: How to build your inventory: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible Community Documentation: Controlling how Ansible behaves: precedence rules: https://docs.ansible.com/projects/ansible/latest/reference_appendices/general_precedence.html
- Ansible Community Documentation: ansible.builtin.debug module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/debug_module.html
- Ansible Community Documentation: ansible.builtin.assert module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible Community Documentation: amazon.aws.aws_ec2 inventory plugin: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html

## Issues Found
- The post said `ansible-inventory --host` shows every variable with defaults merged. This was too broad because `ansible-inventory` displays inventory host information, not role defaults, play vars, task vars, or other runtime-only playbook variables. Updated the wording to say it shows merged inventory variables.
- The verbose mode explanation said `-vvv` shows which variables were set from each file. Ansible verbose output can show loaded inventory sources and variable files, but it does not provide a reliable per-variable source map. Updated the wording to reflect that limitation.
- The targeted comparison shell example used nested double quotes around the `python3 -c` code, which would break shell parsing. Rewrote the Python snippets with single-quoted `-c` arguments and changed the comment from jq to Python.
- The variable precedence diagram incorrectly placed role defaults above play vars and mixed inventory-time precedence with playbook runtime precedence. Replaced it with the relevant inventory merge order and added a separate runtime note for role defaults, play vars, task vars, and extra vars.
- The same-level group merge explanation omitted the parent/child level caveat. Updated it to say alphabetical ordering applies to groups at the same level unless `ansible_group_priority` is set.
- The `--graph | grep -A 5 web1` example was unlikely to show the containing group hierarchy. Changed it to `grep -B 5 web1`.
- The host_vars filename guidance said only `host_vars/web1.example.com.yml` was valid. Ansible also supports `.yaml`, `.json`, no extension, and host-named directories. Updated the examples accordingly.

## Review Notes
The corrected post is technically valid for current Ansible documentation. The local environment did not have `ansible-inventory` installed, so CLI behavior was validated against official Ansible documentation rather than local `--help` output.
