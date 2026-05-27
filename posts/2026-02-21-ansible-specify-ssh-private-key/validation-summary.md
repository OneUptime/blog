# Validation Summary: How to Specify SSH Private Key in an Ansible Playbook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Playbooks
- Ansible inventory and group variables
- Ansible configuration
- Ansible Vault
- OpenSSH private key authentication

## Sources Consulted
- Ansible ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible SSH connection plugin documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/ssh_connection.html
- Ansible precedence rules documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/general_precedence.html
- Ansible variable precedence documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible Vault documentation: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault.html
- Ansible ansible-vault CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html

## Issues Found
- The post incorrectly stated that `--private-key` overrides all other key settings. Ansible command-line options override configuration settings, but connection variables from inventory or playbook vars can override command-line options. Updated the command-line explanation and precedence diagram.
- The Vault example did not show that a vault password must be supplied when running the playbook. Added an `ansible-playbook ... --ask-vault-pass` example so the encrypted key can be decrypted at runtime.

## Review Notes
- The local environment did not have Ansible installed, so CLI behavior was verified against official Ansible documentation rather than local `--help` output.
- The `copy` module can automatically decrypt vaulted source files by default, so the Vault copy task is technically valid when a vault password or vault ID is supplied.
