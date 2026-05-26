# Validation Summary: How to Set Up AWS Credentials for Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- AWS IAM
- AWS STS
- AWS CLI
- Boto3 / Botocore
- AWS IAM Identity Center / SSO
- AWX credentials

## Sources Consulted
- Ansible amazon.aws collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/
- amazon.aws.s3_bucket module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/s3_bucket_module.html
- amazon.aws.s3_bucket_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/s3_bucket_info_module.html
- amazon.aws.ec2_instance_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_info_module.html
- amazon.aws.sts_assume_role module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/sts_assume_role_module.html
- Boto3 credentials guide: https://docs.aws.amazon.com/boto3/latest/guide/credentials.html
- AWS CLI `configure sso` command reference: https://docs.aws.amazon.com/cli/latest/reference/configure/sso.html
- AWS CLI IAM `create-role` command reference: https://docs.aws.amazon.com/cli/latest/reference/iam/create-role.html
- AWS IAM service role and instance profile documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-service.html
- AWX credentials documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/credentials.html

## Issues Found
- The STS example passed temporary credentials with `security_token`. Current `amazon.aws` documentation uses `session_token`; the old `security_token` alias has been removed from the latest collection documentation. Updated the example to use `session_token`.
- The credential precedence diagram did not match Boto3's documented lookup order. Updated the diagram to include assume-role providers, IAM Identity Center, shared credentials, console-login credentials, config files, container credentials, and EC2 instance metadata in the documented order.
- The environment variable warning said credentials are visible in process listings. Shell exports are more accurately exposed through shell history and process environment inspection, so the wording was corrected.
- The AWX section referred to a non-existent `sts_token` input and described the example as role assumption. AWX documents the AWS credential token field as `security_token` for temporary STS credentials, so the text, example comment, and example name were corrected.

## Review Notes
The examples use broad AWS managed policies and placeholder access keys for demonstration. They are technically valid, but production playbooks should use narrower IAM policies and avoid static long-lived access keys where IAM roles or short-lived credentials are available.
