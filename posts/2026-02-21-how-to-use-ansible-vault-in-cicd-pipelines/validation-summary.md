# Validation Summary: How to Use Ansible Vault in CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Vault
- ansible-playbook and ansible-vault CLI
- Bash shell scripts
- GitHub Actions
- GitLab CI/CD
- Jenkins Pipeline
- Azure Pipelines
- SSH key handling in CI/CD

## Sources Consulted
- Ansible Community Documentation: Using encrypted variables and files - https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_using_encrypted_content.html
- Ansible Community Documentation: ansible-vault CLI - https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- GitHub Docs: Using secrets in GitHub Actions - https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- GitHub Docs: Workflow syntax for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitLab Docs: CI/CD variables - https://docs.gitlab.com/ci/variables/
- GitLab Docs: Using SSH keys with GitLab CI/CD - https://docs.gitlab.com/ci/jobs/ssh_keys/
- Jenkins Documentation: Credentials Binding Plugin Pipeline steps - https://www.jenkins.io/doc/pipeline/steps/credentials-binding/
- Microsoft Learn: Define variables in Azure Pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/variables

## Issues Found
- Replaced `echo` with `printf '%s\n'` when writing or returning vault passwords and SSH private key content. This avoids shell-specific `echo` behavior for secret values that begin with option-like text or contain backslash sequences.
- Updated the GitLab CI SSH key setup to match current GitLab guidance for Docker jobs using a file-type `SSH_PRIVATE_KEY` CI/CD variable: set restrictive permissions on the file path and run `ssh-add "$SSH_PRIVATE_KEY"` instead of piping the variable content into `ssh-add -`.

## Review Notes
The Ansible Vault CLI options used in the post, including `--vault-password-file`, `--vault-id`, and `ansible-vault view`, are current and documented. GitHub Actions, Jenkins, and Azure Pipelines examples use supported secret-mapping patterns. Future hardening could add explicit package version pinning for Ansible in CI, but the unpinned examples are technically valid for a general tutorial.
