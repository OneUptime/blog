# Validation Summary: How to Use Ansible to Deploy to Staging and Production Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventories
- Ansible playbooks
- Ansible group variables
- Ansible Vault
- GitHub Actions environments
- GitHub Actions deployment workflow syntax
- YAML
- Jinja2 templates

## Sources Consulted
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible host_group_vars vars plugin documentation: https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/host_group_vars_vars.html
- Ansible playbook keywords documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-playbook.html
- Ansible ansible-vault CLI documentation: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-vault.html
- Ansible Vault guide: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault.html
- Ansible ansible.builtin.git module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible ansible.builtin.template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- GitHub Actions environments documentation: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The original secrets examples used `inventories/<env>/group_vars/vault.yml`. Ansible's `host_group_vars` plugin loads files that correspond to group or host names, so a standalone `vault.yml` under `group_vars` would only apply to a group named `vault`, not to all hosts. Updated the directory structure and examples to use `group_vars/all/vars.yml` and `group_vars/all/vault.yml`.
- The local deployment commands did not include a Vault password option, which would fail once encrypted group variables are present. Added `--ask-vault-pass` to both local deployment examples.
- The GitHub Actions workflow used the SSH key secret directly through process substitution and did not provide a Vault password. Updated the workflow to write the SSH key and Vault password to permission-restricted files, then pass `--private-key` and `--vault-password-file` to `ansible-playbook`.

## Review Notes
The main Ansible inventory, playbook, `serial`, `git`, `template`, `systemd`, `uri`, and extra-vars usage is consistent with current Ansible documentation. The local environment did not have Ansible installed, so CLI behavior was checked against official Ansible CLI documentation rather than local `--help` output.
