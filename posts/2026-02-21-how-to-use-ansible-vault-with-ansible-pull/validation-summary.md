# Validation Summary: How to Use Ansible Vault with ansible-pull

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Vault
- ansible-pull
- AWS EC2 Instance Metadata Service
- AWS Secrets Manager
- cloud-init
- systemd timers and services
- cron

## Sources Consulted
- Ansible ansible-pull CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-pull.html
- Ansible Vault documentation: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault.html
- Ansible Vault encrypted content documentation: https://docs.ansible.com/ansible/latest/vault_guide/vault_encrypting_content.html
- AWS EC2 Instance Metadata Service documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- AWS EC2 instance metadata categories: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html
- AWS Secrets Manager CLI retrieval documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieving-secrets_cli.html
- cloud-init write_files examples: https://docs.cloud-init.io/en/latest/reference/yaml_examples/write_files.html
- cloud-init package installation examples: https://docs.cloud-init.io/en/latest/reference/yaml_examples/package_update_upgrade.html
- systemd.service documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd.exec Environment documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html

## Issues Found
- The AWS Secrets Manager vault password scripts used IMDSv1-style metadata access for `placement/region`. Updated both examples to request and pass an IMDSv2 token, matching current AWS EC2 metadata guidance.
- The example playbook loaded `vars/common.yml` but did not load `vars/vault.yml`, so the referenced `vault_*` variables would be undefined unless loaded elsewhere. Added `vars/vault.yml` to `vars_files`.
- The complete bootstrap script installed `boto3` but invoked the `aws` CLI. Updated the package installation to install `awscli` and removed the unused `boto3` install.
- The cloud-init example ran `pip3 install ansible` and `ansible-pull` without ensuring `python3-pip` and `git` were installed. Added `package_update` and `packages` entries for those dependencies.

## Review Notes
- The environment-variable and user-data examples are technically valid, but they expose secrets through local service or instance provisioning data. The post already frames these as tradeoffs and recommends cloud secrets services and IAM-based access for dynamic environments.
- The Ansible CLI options used in the post, including `-U`, `-i`, `--vault-password-file`, and `ansible-vault view`, match current Ansible documentation.
