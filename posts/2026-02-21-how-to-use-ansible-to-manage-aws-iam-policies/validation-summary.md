# Validation Summary: How to Use Ansible to Manage AWS IAM Policies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- AWS IAM managed policies and inline policies
- AWS IAM policy JSON
- AWS S3, DynamoDB, EC2, CloudWatch Logs, ECR, ECS, RDS, and Organizations permissions
- Jinja2 templates

## Sources Consulted
- Ansible `amazon.aws.iam_managed_policy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/iam_managed_policy_module.html
- Ansible `amazon.aws.iam_policy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/iam_policy_module.html
- Ansible `amazon.aws.iam_role` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/iam_role_module.html
- Ansible `amazon.aws` collection index and supported ansible-core versions: https://docs.ansible.com/ansible/latest/collections/amazon/aws/index.html
- AWS IAM managed policies and inline policies documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html
- AWS Service Authorization Reference for Amazon CloudWatch Logs: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatchlogs.html
- AWS Service Authorization Reference for Amazon EC2: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- AWS Service Authorization Reference for Amazon S3: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
- AWS Service Authorization Reference for Amazon RDS: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonrds.html

## Issues Found
- The prerequisites listed Ansible 2.14+, but the current `amazon.aws` collection documentation lists ansible-core 2.17+ support. Updated the prerequisite to `ansible-core 2.17+`.
- The prerequisites mentioned only boto3, while the current modules require both boto3 and botocore. Updated the prerequisite wording to include both.
- The post installed the `amazon.aws` collection but used `community.aws.iam_managed_policy` in managed policy examples. Updated those examples to `amazon.aws.iam_managed_policy`, which matches the installed collection and current documentation.
- The CloudWatch Logs read-only policy grouped `logs:DescribeLogGroups`, `logs:DescribeLogStreams`, `logs:FilterLogEvents`, and `logs:GetLogEvents` under one log-group ARN. AWS authorization data shows `DescribeLogGroups` requires `Resource: "*"`, `GetLogEvents` uses log-stream resources, and the other read/list actions can use log-group resources. Split the policy into separate statements with the correct resource scopes.
- The deny policy used `aws:ResourceTag/Environment` for `s3:DeleteBucket`. The S3 authorization reference does not list that condition key for `DeleteBucket`, so the S3 deny was separated into a bucket-name ARN pattern while retaining tag-based denial for RDS deletion.
- The `amazon.aws.iam_role` example used `state: present` without `assume_role_policy_document`, which the module requires. Added an example trust policy lookup.

## Review Notes
- Ansible was not installed in the local workspace, so module behavior was verified against official Ansible documentation rather than local `ansible-doc` output.
- Some example policies are intentionally broad for tutorial readability, especially the CI/CD example. They are syntactically valid but should be narrowed further for production use.
