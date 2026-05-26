# Validation Summary: How to Use Ansible to Manage AWS IAM Roles

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- AWS IAM roles
- AWS IAM instance profiles
- AWS IAM managed and inline policies
- AWS Lambda execution roles
- Amazon ECS task and task execution roles
- AWS STS AssumeRole

## Sources Consulted
- Ansible amazon.aws.iam_role module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/iam_role_module.html
- Ansible amazon.aws.iam_instance_profile module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/iam_instance_profile_module.html
- Ansible amazon.aws.iam_policy module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/iam_policy_module.html
- Ansible amazon.aws.iam_role_info module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/iam_role_info_module.html
- Ansible Amazon Web Services Guide: https://docs.ansible.com/ansible/latest/collections/amazon/aws/docsite/guide_aws.html
- AWS IAM instance profile documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html
- AWS IAM permissions boundaries documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
- AWS IAM cross-account role documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_update-role-trust-policy.html
- AWS Lambda execution role documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html
- Amazon ECS task IAM role documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html
- Amazon ECS task execution IAM role documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html

## Issues Found
- The prerequisites listed only `amazon.aws` without a minimum collection version, but the post uses `amazon.aws.iam_instance_profile`, which was added in `amazon.aws` 6.2.0. Updated the prerequisite to `amazon.aws` collection 6.2.0+.
- The prerequisites listed Python boto3 without a version and omitted botocore. Current `amazon.aws` IAM modules require boto3 and botocore 1.34.0+. Updated the prerequisite accordingly.
- The `iam_role_info` example referenced `role_info.iam_roles[0].attached_policies`, but the documented current return key is `managed_policies`. Updated the debug message to use `managed_policies`.
- The cross-account role explanation omitted the trusted account's identity-based policy requirement. Added a sentence noting that principals in the trusted account also need permission to call `sts:AssumeRole` on the role.

## Review Notes
The examples are illustrative and use placeholder account IDs, bucket names, table names, and resource ARNs. They were reviewed for module parameter correctness and IAM policy structure, but not executed against AWS because that would require live AWS credentials and test resources.
