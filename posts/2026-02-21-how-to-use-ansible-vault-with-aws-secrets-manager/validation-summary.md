# Validation Summary: How to Use Ansible Vault with AWS Secrets Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Vault
- amazon.aws Ansible collection
- AWS Secrets Manager
- AWS CLI
- AWS IAM
- AWS KMS
- AWS CloudTrail
- Bash
- YAML
- Jinja2

## Sources Consulted
- Ansible amazon.aws.secretsmanager_secret lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/secretsmanager_secret_lookup.html
- Ansible amazon.aws collection index: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/index.html
- Ansible community.aws.secretsmanager_secret module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/secretsmanager_secret_module.html
- Ansible Vault documentation: https://docs.ansible.com/ansible/2.9/user_guide/vault.html
- AWS CLI create-secret command reference: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/create-secret.html
- AWS CLI get-secret-value command reference: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/get-secret-value.html
- AWS Secrets Manager create secret documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/create_secret.html
- AWS Secrets Manager encryption documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/security-encryption.html
- AWS Secrets Manager CloudTrail documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/cloudtrail_log_entries.html
- AWS Secrets Manager IAM Service Authorization Reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_awssecretsmanager.html

## Issues Found
- The post used `amazon.aws.aws_secret` as the primary lookup name. Current amazon.aws documentation lists `amazon.aws.secretsmanager_secret` as the canonical lookup, with `amazon.aws.aws_secret` as a redirect/alias. Updated the post to use `amazon.aws.secretsmanager_secret` throughout.
- The post included an invalid "module form" example using `amazon.aws.secretsmanager_secret` and `amazon.aws.aws_secret` as modules for retrieval. Current documentation shows `amazon.aws.secretsmanager_secret` is a lookup plugin, while the Secrets Manager management module is in the `community.aws` collection and is not used to retrieve secret values. Replaced the section with a valid lookup-options example using `version_stage` and `on_missing`.
- The dependency install command did not reflect current amazon.aws lookup requirements. Updated the boto dependency command to install `boto3>=1.34.0` and `botocore>=1.34.0`, matching the current lookup documentation.

## Review Notes
- The AWS CLI `create-secret` and `get-secret-value` command examples use valid options.
- The Ansible Vault password script pattern is valid for `--vault-password-file`; newer vault-ID client-script workflows can also use `--vault-id`.
- The IAM policy shape and Secrets Manager ARN pattern are valid for secrets under the `myapp/` prefix, assuming the example account ID and region are replaced with real values.
- In production, consider adding `no_log: true` to tasks that store secret values with `set_fact` so secret values are not exposed through verbose output or callback plugins.
