# Validation Summary: How to Use Ansible with AWS SSM Session Manager (No SSH)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- AWS Systems Manager Session Manager
- AWS SSM Agent
- AWS CLI
- Amazon EC2
- AWS IAM
- Amazon S3
- AWS CloudFormation
- AWS CloudTrail
- Amazon CloudWatch Logs
- AWS KMS

## Sources Consulted
- Ansible `amazon.aws.aws_ssm` connection plugin documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/aws_ssm_connection.html
- Ansible `amazon.aws.aws_ec2` inventory plugin documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- Ansible AWS EC2 dynamic inventory guide: https://docs.ansible.com/ansible/latest/collections/amazon/aws/docsite/aws_ec2_guide.html
- AWS Systems Manager Session Manager overview: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html
- AWS Session Manager plugin installation documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html
- AWS Session Manager plugin macOS installation documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/install-plugin-macos-overview.html
- AWS Session Manager plugin version verification documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/plugin-version-history.html
- AWS SSM Agent installation documentation for Ubuntu Server: https://docs.aws.amazon.com/systems-manager/latest/userguide/agent-install-ubuntu.html
- AWS Systems Manager instance permissions documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-instance-permissions.html
- AWS Systems Manager VPC endpoint documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html
- AWS Systems Manager session activity logging documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-auditing.html

## Issues Found
- The prerequisites said only SSM Agent was required on target instances. Added `curl` because the Ansible `amazon.aws.aws_ssm` connection plugin requires `curl` on remote Linux instances for S3-based transfers.
- The post implied Ubuntu 20.04+ always has SSM Agent preinstalled. Changed this to say AWS-provided Ubuntu AMIs usually include it, matching AWS documentation's "in most cases" wording.
- The playbook section described the remote user as `ssm-user` or root. Corrected this for Ansible: the `amazon.aws.aws_ssm` connection plugin does not honor `ansible_user` or `remote_user`, and commands often run as `ssm-agent`; `become_user` should be used when a specific user is needed.
- The S3 permissions example omitted `s3:GetBucketLocation`, which the Ansible connection plugin documentation lists as required for the controller credentials. Added it to the bucket-level permissions.
- The file transfer section said both the Ansible controller and EC2 instance need IAM access to the transfer bucket. Corrected this: the controller needs S3 IAM permissions, while the EC2 instance needs network connectivity to S3 because the plugin uses presigned URLs passed to the target.
- The security section said all session activity is logged in CloudTrail. Clarified that CloudTrail logs Session Manager API activity, while command/session content logging must be configured separately to Amazon S3 or CloudWatch Logs.

## Review Notes
- The `aws_ssm` short connection name appears in official Ansible examples, though the fully qualified `amazon.aws.aws_ssm` plugin name is also documented and may be preferable for clarity.
- The dynamic inventory filename `inventory/aws_ec2.yml` satisfies the Ansible plugin requirement that the file end in `aws_ec2.yml` or `aws_ec2.yaml`.
- The AWS CLI and CloudFormation examples are syntactically valid for the described use case.
