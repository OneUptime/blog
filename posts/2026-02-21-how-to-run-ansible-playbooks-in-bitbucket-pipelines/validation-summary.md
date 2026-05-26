# Validation Summary: How to Run Ansible Playbooks in Bitbucket Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bitbucket Pipelines
- Ansible and ansible-playbook
- ansible-galaxy collections
- ansible-lint
- SSH keys and known_hosts
- Ansible Vault
- Docker
- YAML pipeline configuration

## Sources Consulted
- Atlassian Bitbucket Cloud documentation: Get started with Bitbucket Pipelines - https://support.atlassian.com/bitbucket-cloud/docs/get-started-with-bitbucket-pipelines/
- Atlassian Bitbucket Cloud documentation: Set up Pipelines SSH keys on Linux - https://support.atlassian.com/bitbucket-cloud/docs/set-up-pipelines-ssh-keys-on-linux/
- Atlassian Bitbucket Cloud documentation: Use multiple SSH keys in your pipeline - https://support.atlassian.com/bitbucket-cloud/docs/use-multiple-ssh-keys-in-your-pipeline/
- Atlassian Bitbucket Cloud documentation: Step options - https://support.atlassian.com/bitbucket-cloud/docs/step-options/
- Atlassian Bitbucket Cloud documentation: Variables and secrets - https://support.atlassian.com/bitbucket-cloud/docs/variables-and-secrets/
- Atlassian Bitbucket Cloud documentation: Set up and monitor deployments - https://support.atlassian.com/bitbucket-cloud/docs/set-up-and-monitor-deployments/
- Ansible Community Documentation: Installing Ansible - https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- Ansible Community Documentation: ansible-playbook CLI - https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible Community Documentation: ansible-galaxy CLI - https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html
- Ansible Community Documentation: Installing collections - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html

## Issues Found
- Private SSH key variable handling was inaccurate. Bitbucket Pipelines variables do not currently support multiline values reliably for private keys, and Atlassian documents base64 encoding for private keys stored as secured variables. Updated the examples to use `SSH_PRIVATE_KEY_B64` and decode it with `base64 --decode` before writing `~/.ssh/id_rsa`.
- The parallel steps example used an outdated/incorrect schema. Current Bitbucket Pipelines documentation shows `parallel:` with a nested `steps:` list. Updated the example to include `steps:`.

## Review Notes
- The Ansible CLI commands (`ansible-playbook --syntax-check`, `--vault-password-file`, `-i`, `-e`, and `ansible-galaxy collection install -r requirements.yml`) match current Ansible documentation.
- Bitbucket deployment variables, secured variable masking, `deployment`, `trigger: manual`, `after-script`, cache definitions, and `size: 1x` / `size: 2x` are consistent with current Atlassian documentation.
- The examples pin `ansible==8.7.0`, which is older than the latest Ansible community package as of this review date. This is still syntactically valid, but teams should periodically update the pinned version after testing their playbooks and collections.
