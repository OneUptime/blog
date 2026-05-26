# Validation Summary: How to Run Ansible Playbooks in Azure DevOps Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure DevOps Pipelines YAML
- Azure Pipelines deployment jobs and environments
- Azure Pipelines variable groups, secure files, and Azure Key Vault integration
- Azure Pipelines self-hosted agents
- Ansible and ansible-playbook
- ansible-lint
- SSH key installation in Azure Pipelines

## Sources Consulted
- Microsoft Learn: Azure Pipelines YAML schema - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/
- Microsoft Learn: Deployment jobs - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/deployment-jobs
- Microsoft Learn: Approvals and checks - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/approvals
- Microsoft Learn: InstallSSHKey@0 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/install-ssh-key-v0
- Microsoft Learn: UsePythonVersion@0 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/use-python-version-v0
- Microsoft Learn: AzureKeyVault@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-key-vault-v2
- Microsoft Learn: Variable groups and Azure Key Vault linked variable groups - https://learn.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups
- Microsoft Learn: Secure files - https://learn.microsoft.com/en-us/azure/devops/pipelines/library/secure-files
- Microsoft Learn: Linux self-hosted agents - https://learn.microsoft.com/en-us/azure/devops/pipelines/agents/linux-agent
- Ansible documentation: ansible-playbook CLI - https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- Ansible documentation: ansible-galaxy CLI - https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html
- PyPI package metadata for ansible and ansible-lint - https://pypi.org/project/ansible/ and https://pypi.org/project/ansible-lint/

## Issues Found
- The post pinned `ansible==8.7.0`, which is outdated for a 2026 tutorial. Updated examples to `ansible==12.3.0`, the latest Ansible release available for Python 3.11 during validation. Verified the Python 3.11 compatibility with `pip install --dry-run --python-version 3.11 --only-binary=:all: ansible==12.3.0 ansible-lint==26.4.0`.
- The lint example installed an unpinned `ansible-lint`. Pinned it to `ansible-lint==26.4.0` so the example is reproducible with the current validated version.
- Vault password examples used `echo` to write the password file. Replaced these with `umask 077` and `printf '%s\n' ...` so the temporary file is created with restrictive permissions and password content is not altered by shell-specific `echo` behavior.
- The Azure Key Vault example fetched an `ssh-private-key` secret but did not use it. Removed the unused secret from `SecretsFilter` so the example matches the commands shown.
- The self-hosted agent setup used a literal placeholder download URL with `3.x.x`, which would not execute and is stale compared with current Azure Pipelines agent guidance. Replaced it with the official flow to download the current Linux agent package from the Azure DevOps "New agent" dialog.

## Review Notes
- The Azure Pipelines task names, input names, variable group syntax, deployment job syntax, environment approval guidance, secure file usage, and Ansible CLI options were consistent with official documentation after the fixes.
- The examples assume the repository contains the referenced `ansible/requirements.yml`, inventory files, and playbooks; those are application-specific and were not present in this blog post.
