# Validation Summary: How to Pass become Password in Ansible Securely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Vault
- Ansible privilege escalation / become
- Ansible lookup plugins
- HashiCorp Vault
- AWS Secrets Manager
- GitHub Actions
- GitLab CI

## Sources Consulted
- Ansible privilege escalation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible sudo become plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sudo_become.html
- Ansible Vault documentation: https://docs.ansible.com/ansible/latest/vault_guide/vault.html
- Ansible Vault encrypting content documentation: https://docs.ansible.com/ansible/latest/vault_guide/vault_encrypting_content.html
- ansible-vault CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Ansible vars_prompt documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_prompts.html
- community.hashi_vault.hashi_vault lookup documentation: https://docs.ansible.com/ansible/latest/collections/community/hashi_vault/hashi_vault_lookup.html
- amazon.aws.secretsmanager_secret lookup documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/secretsmanager_secret_lookup.html

## Issues Found
- The environment variable examples used `ANSIBLE_BECOME_PASSWORD`, but the Ansible sudo become plugin documents `ANSIBLE_BECOME_PASS`. Updated the shell, GitHub Actions, and GitLab CI examples.
- The HashiCorp Vault lookup examples used the older short lookup name `hashi_vault`. Updated them to the current fully qualified collection name `community.hashi_vault.hashi_vault`.
- The AWS Secrets Manager lookup example used `amazon.aws.aws_secret`. Current Ansible documentation redirects this to `amazon.aws.secretsmanager_secret`, so the example now uses the current plugin name.
- The "BAD: Password in ansible.cfg" example used `[privilege_escalation] become_pass`, which is not the documented config location for the sudo become password. Updated it to `[sudo_become_plugin] password`.
- The vault verification example relied on `file` output that varies by platform. Changed it to `head -n 1 group_vars/all/vault.yml`, which directly verifies the `$ANSIBLE_VAULT;...` header.

## Review Notes
- The post uses `ansible_become_pass` in examples. Current Ansible docs list `ansible_become_password` first, but the sudo become plugin also documents `ansible_become_pass` as a valid variable, so no change was required.
- The lookup examples assume the relevant Ansible collections and provider credentials are installed/configured on the controller.
