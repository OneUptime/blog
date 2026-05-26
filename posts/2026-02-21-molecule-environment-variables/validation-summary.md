# Validation Summary: How to Use Molecule with Environment Variables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Molecule
- Molecule scenario configuration
- Ansible environment variable lookup
- Ansible Vault
- GitHub Actions
- GitLab CI
- Jenkins
- AWS EC2 provisioning with Ansible

## Sources Consulted
- Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Molecule ansible-native configuration documentation: https://docs.ansible.com/projects/molecule/ansible-native/
- Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible environment lookup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/env_lookup.html
- Ansible variable precedence documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible precedence rules documentation: https://docs.ansible.com/projects/ansible/13/reference_appendices/general_precedence.html
- Ansible Vault encrypted content documentation: https://docs.ansible.com/ansible/latest/vault_guide/vault_using_encrypted_content.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html

## Issues Found
- Removed `MOLECULE_DISTRO` from the built-in Molecule environment variable list because it is not documented as a Molecule-provided variable. Molecule reserves the `MOLECULE_` namespace, so custom examples now use `TEST_DISTRO`.
- Replaced custom `MOLECULE_*` variables in examples (`MOLECULE_DISTRO`, `MOLECULE_INSTANCE_TYPE`, `MOLECULE_SSH_KEY`, `MOLECULE_AMI`) with non-reserved `TEST_*` names.
- Changed the Vault example from `ANSIBLE_VAULT_PASSWORD` to `ANSIBLE_VAULT_PASSWORD_FILE`. Ansible documents `ANSIBLE_VAULT_PASSWORD_FILE` as the environment variable for configuring a Vault password source.
- Updated CI examples so Vault password secret content is written to a file before Molecule runs, or provided through Jenkins file credentials.
- Replaced `ansible_date_time.epoch` in a play with `gather_facts: false` with `lookup('pipe', 'date +%s')`, because `ansible_date_time` is a gathered fact and is unavailable when facts are not gathered.
- Corrected the variable precedence diagram and explanation. Role defaults are low precedence, inventory variables and play vars override them, role vars override those, and extra vars have higher precedence. Environment variables are not Ansible variables unless read or copied into Ansible variable data.
- Updated the debug `grep` example to include the new `TEST_` variables.

## Review Notes
The post uses Molecule's pre ansible-native `provisioner`, `platforms`, and `driver` style. This is still documented, but current Molecule documentation distinguishes it from the newer ansible-native configuration model.
