# Validation Summary: How to Organize Ansible Inventory with host_vars Directory

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible inventory
- Ansible host_vars and group_vars
- Ansible Vault
- Ansible CLI commands
- YAML variable files

## Sources Consulted
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible variable precedence guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- ansible.builtin.host_group_vars vars plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/host_group_vars_vars.html
- ansible-inventory CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible Vault guide: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault.html
- Encrypting content with Ansible Vault: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_encrypting_content.html
- Using encrypted variables and files with Ansible Vault: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_using_encrypted_content.html

## Issues Found
- Clarified that Ansible reads files inside a host_vars directory in lexicographical order before merging variables, matching the official inventory guide.
- Changed the Vault example label from encrypted plaintext to plaintext before encryption, and added that a saved vault file is stored with an Ansible Vault header. This avoids implying that an encrypted vault file remains readable YAML on disk.
- Narrowed the precedence diagram wording to "simplified inventory variable precedence order" because Ansible's full variable precedence includes many non-inventory sources.
- Replaced the absolute claim that `-vvv` prints loaded files and order with a more accurate statement that verbose output can show additional inventory and variable-loading detail, while `ansible-inventory --host` directly shows resolved host variables.

## Review Notes
The local environment did not have Ansible CLI tools installed, so command syntax was verified against the current official Ansible CLI documentation rather than local `--help` output.
