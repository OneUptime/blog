# Validation Summary: How to Use Ansible Vault with AWX/Tower

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Vault
- AWX
- Ansible Tower / Automation Controller
- AWX REST API
- AWX CLI / awxkit
- AWX surveys and custom credential types

## Sources Consulted
- Ansible Vault documentation: https://docs.ansible.com/ansible/latest/vault_guide/vault.html
- Ansible Vault CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- AWX Multi-Credential Assignment documentation: https://docs.ansible.com/projects/awx/en/24.6.1/administration/multi-creds-assignment.html
- AWX Credentials documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/credentials.html
- AWX Job Templates documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/job_templates.html
- AWX Custom Credential Types documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/credential_types.html
- awxkit 24.6.1 CLI package metadata and local `awx --version` output

## Issues Found
- Corrected the AWX/AAP relationship: AWX is the upstream of the automation controller component, not the whole Red Hat Ansible Automation Platform product.
- Updated the command-line vault discussion to include `--vault-id`, which is the documented mechanism for vault identifiers and multiple vault passwords.
- Changed the Mermaid command example from a generic `--vault-password-file` invocation to a vault-ID style `--vault-id` example for vault-identifier credentials.
- Added a note that the API `credential_type` numeric ID is installation-specific, so readers should use the Vault credential type ID from their AWX instance.
- Fixed all job-template credential association API examples to use the documented payload shape: `{"associate": true, "id": ...}`.
- Updated the summary so it does not imply that AWX only replaces `--vault-password-file`; it also covers `--vault-id`-based workflows.

## Review Notes
The remaining examples are conceptually correct, but AWX CLI argument behavior can vary with server version and resource lookup configuration. For production automation, using explicit resource IDs or the documented REST API association endpoint is less ambiguous than relying on display-name lookup.
