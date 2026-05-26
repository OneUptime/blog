# Validation Summary: How to Use Ansible to Manage AWS IAM Users

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- AWS IAM users, groups, policies, access keys, and console passwords
- AWS CLI
- YAML

## Sources Consulted
- Ansible `amazon.aws.iam_user` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/iam_user_module.html
- Ansible `amazon.aws.iam_access_key` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/iam_access_key_module.html
- Ansible `amazon.aws.iam_access_key_info` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/iam_access_key_info_module.html
- Ansible `amazon.aws.iam_group` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/iam_group_module.html
- Ansible `amazon.aws.iam_policy` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/iam_policy_module.html
- Ansible `amazon.aws.iam_user_info` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/iam_user_info_module.html
- AWS CLI `iam add-user-to-group` command reference: https://docs.aws.amazon.com/cli/latest/reference/iam/add-user-to-group.html

## Issues Found
- Fixed the registered return path for `amazon.aws.iam_user`. The module returns user details under `user`, so `user_result.iam_user.user.arn` was changed to `user_result.user.arn`.
- Replaced the console login example with `amazon.aws.iam_user` using `password` and `password_reset_required`. The referenced `community.aws.iam_user_login_profile` module is not available in the current collection docs, while `amazon.aws.iam_user` directly supports setting IAM user passwords.
- Added `purge_users: true` to the IAM group examples because the module only removes users omitted from `users` when `purge_users` is enabled.
- Replaced the bulk group membership shell command with `amazon.aws.iam_group` so the example uses the Ansible collection module instead of a non-idempotent command task.
- Corrected access key lifecycle examples to use the `iam_access_key_info` return key `access_key` instead of `iam_access_keys`.
- Corrected access key update/delete examples to pass the key ID with the `id` parameter instead of the unsupported `access_key_id` parameter.
- Updated the offboarding wording and task name because the example deletes access keys before deleting the user rather than merely deactivating them.

## Review Notes
The access key example intentionally displays the secret for demonstration, but production playbooks should avoid printing secrets and should use Ansible Vault, AWS Secrets Manager, or another controlled secret store.
