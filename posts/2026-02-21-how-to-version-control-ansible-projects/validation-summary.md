# Validation Summary: How to Version Control Ansible Projects

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- Ansible Vault
- Ansible Galaxy roles and collections
- ansible-lint
- Molecule
- Git
- pre-commit
- GitHub Actions

## Sources Consulted
- Ansible Vault documentation: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault.html
- Ansible Vault file format documentation: https://docs.ansible.com/projects/ansible/6/user_guide/vault.html
- Ansible Galaxy collection installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Galaxy CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible Lint pre-commit configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- Ansible Lint installation and GitHub Actions documentation: https://docs.ansible.com/projects/lint/installing/
- Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- pre-commit usage documentation: https://pre-commit.com/
- pre-commit-hooks documentation: https://github.com/pre-commit/pre-commit-hooks
- GitHub Actions documentation for checkout and setup-python actions: https://github.com/actions/checkout and https://github.com/actions/setup-python

## Issues Found
- The CI and dependency update examples used `ansible-galaxy collection install -r requirements.yml` with a `requirements.yml` file that included both `collections` and `roles`. Official Ansible documentation states that `ansible-galaxy collection install -r` only installs collections, while `ansible-galaxy install -r requirements.yml` installs both roles and collections. Updated both commands to `ansible-galaxy install -r requirements.yml`.
- The encrypted Ansible Vault file example was marked as a `yaml` code block even though a vault-encrypted file is stored as Ansible Vault text beginning with `$ANSIBLE_VAULT`, not normal YAML. Changed the code fence to `text`.
- The later vault example labeled plaintext secret variables as the encrypted file contents. Clarified that this is the decrypted view while editing, while the file remains stored encrypted.

## Review Notes
The pre-commit hook revisions are pinned to older but valid release tags. For a real project, these should be updated periodically with `pre-commit autoupdate` or Dependabot, especially because ansible-lint recommends using current ansible-core when run through pre-commit.
