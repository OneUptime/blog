# Validation Summary: How to Use Molecule with Ansible Vault

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Vault
- Ansible roles and variable files
- Molecule role testing
- Molecule Docker driver
- GitHub Actions
- GitLab CI
- YAML configuration

## Sources Consulted
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule ansible-native configuration documentation: https://docs.ansible.com/projects/molecule/ansible-native/
- Ansible Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Vault guide: https://docs.ansible.com/ansible/latest/vault_guide/vault_managing_passwords.html
- Ansible configuration settings reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible roles documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible include_vars module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html

## Issues Found
- The role structure example implied that `vars/vault.yml` would naturally be part of the role's loaded variables. Ansible role auto-loading is based on `main.yml`/`main.yaml`/`main` files, or directory forms under `vars` and `defaults`; a standalone `vars/vault.yml` must be loaded explicitly. I updated the comment to say it is loaded explicitly when needed.
- The encrypted variable-file example showed plaintext YAML under a heading that said the encrypted file might contain it. I changed the wording to say the decrypted contents might look like the example.
- The text said tasks reference the vault values through regular variables, but the snippet was from `defaults/main.yml`. I changed the wording to say role defaults can reference them.
- The test-specific override strategy said no vault password is needed without noting that this is only true if the converge playbook does not explicitly load encrypted files. I added that caveat.
- The verification example used `head -1` through a free-form command string. I changed it to `ansible.builtin.command` with `argv` and `head -n 1`, which is clearer and avoids path tokenization issues.

## Review Notes
- The Molecule examples use the pre ansible-native `provisioner` style. This is still documented by Molecule, but current Molecule documentation also describes the newer ansible-native `ansible:` configuration style where executor args, environment, config, and playbooks move under the top-level `ansible` section.
- The CI snippets are intentionally minimal. Real GitLab Docker-in-Docker jobs often require runner-level privileged mode and may need Docker TLS variables depending on the runner configuration.
