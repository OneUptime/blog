# Validation Summary: How to Use Ansible to Manage AWS Secrets Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Vault
- `community.aws` Ansible collection
- `amazon.aws` Ansible collection
- AWS Secrets Manager
- AWS KMS
- AWS CLI
- boto3 / botocore

## Sources Consulted
- Ansible `community.aws.secretsmanager_secret` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/secretsmanager_secret_module.html
- Ansible `amazon.aws.secretsmanager_secret` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/secretsmanager_secret_lookup.html
- Ansible `community.aws` collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/index.html
- Ansible `amazon.aws` collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/index.html
- AWS CLI `secretsmanager rotate-secret` documentation: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/rotate-secret.html
- AWS CLI `secretsmanager put-resource-policy` documentation: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/put-resource-policy.html
- AWS Secrets Manager encryption documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/security-encryption.html
- AWS Secrets Manager deletion documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/manage_delete-secret.html

## Issues Found
- The prerequisites listed Ansible 2.14+, but current `community.aws` documentation requires ansible-core 2.17 or newer for the latest collection version used by the installation command. Updated the prerequisite to `ansible-core 2.17+`.
- The architecture text said rotation happens automatically on a schedule without qualifying that rotation must be enabled. Updated the sentence to say rotation happens automatically when enabled for a secret.
- The `aws secretsmanager rotate-secret` example configured rotation but omitted AWS CLI's default behavior of rotating immediately. Added `--no-rotate-immediately` and a short explanation so the command matches the section's intent of configuring automatic rotation.
- The cross-account access section implied a Secrets Manager resource policy alone was sufficient. Added the required caveat that the other account's principal also needs IAM permission, and customer managed KMS keys need decrypt access in the key policy.

## Review Notes
The Ansible module examples use supported `community.aws.secretsmanager_secret` options such as `secret`, `kms_key_id`, `recovery_window`, `tags`, and `state`. The lookup example uses the current `amazon.aws.secretsmanager_secret` lookup name. The AWS CLI examples use valid command names and flags.
