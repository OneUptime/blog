# Validation Summary: Moving Playbooks to AWX: Inventories, Credentials, Vaults, and Repositories

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- AWX 24.6.1
- Ansible Vault
- Ansible Builder
- Ansible Runner
- Execution Environments
- Source-controlled and dynamic inventories
- AWX credentials and Job Templates

## Sources Consulted
- [AWX Projects](https://docs.ansible.com/projects/awx/en/24.6.1/userguide/projects.html)
- [AWX Inventories](https://docs.ansible.com/projects/awx/en/24.6.1/userguide/inventories.html)
- [AWX inventory files from source control](https://docs.ansible.com/projects/awx/en/24.6.1/administration/scm-inv-source.html)
- [AWX Credentials](https://docs.ansible.com/projects/awx/en/24.6.1/userguide/credentials.html)
- [AWX multi-credential and multi-Vault assignment](https://docs.ansible.com/projects/awx/en/24.6.1/administration/multi-creds-assignment.html)
- [AWX Job Templates](https://docs.ansible.com/projects/awx/en/24.6.1/userguide/job_templates.html)
- [AWX Execution Environments](https://docs.ansible.com/projects/awx/en/24.6.1/userguide/execution_environments.html)
- [Ansible command-line tools](https://docs.ansible.com/ansible/latest/command_guide/command_line_tools.html)
- [Ansible roles: storing and finding roles](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html#storing-and-finding-roles)
- [Encrypting content with Ansible Vault](https://docs.ansible.com/ansible/latest/vault_guide/vault_encrypting_content.html)
- [Using encrypted variables and files](https://docs.ansible.com/ansible/latest/vault_guide/vault_using_encrypted_content.html)
- [Ansible Builder execution-environment definition](https://docs.ansible.com/projects/builder/en/latest/definition/)
- [AWX upstream repository and release status](https://github.com/ansible/awx)

## Issues Found
- The repository layout placed `site.yml` under `playbooks/` while the referenced `myapp` role was under the repository-root `roles/` directory. Ansible searches `roles/` relative to the playbook file, the playbook directory itself, collections, and configured role paths; the shown layout did not provide a matching role path. Moved `site.yml` to the repository root so the role example works with the displayed layout and the earlier `ansible-playbook ... site.yml` command.
- The Vault snippet showed variable-level `!vault` YAML, but the accompanying command used `ansible-vault encrypt`, which encrypts an entire file. Changed it to `ansible-vault encrypt_string --vault-id production@prompt --stdin-name vault_database_password`, which prompts for the value and emits the displayed variable-level format.

## Review Notes
- AWX 24.6.1 is still the latest released AWX version as of 2026-07-25. The upstream repository states that releases have been paused during a large-scale refactoring, so the versioned documentation links remain appropriate but should be revisited when AWX releases resume.
- Vault ID labels are hints by default in `ansible-core`; Ansible tries the matching label first and then other supplied Vault passwords unless strict Vault ID matching is enabled. Keeping AWX Vault credential identifiers aligned with encrypted labels remains the clearest and safest configuration.
- AWX Check jobs use Ansible check mode. Tasks without check-mode support are skipped, so a Check job is useful migration validation but is not a complete guarantee that a later Run job has no side effects.
