# Validation Summary: How to Use Ansible to Manage AWS AMI Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- `amazon.aws` Ansible collection
- `community.aws` Ansible collection
- Amazon EC2 AMIs
- Amazon EBS snapshots
- AWS KMS
- YAML playbooks

## Sources Consulted
- Ansible `amazon.aws.ec2_ami` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_ami_module.html
- Ansible `amazon.aws.ec2_ami_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_ami_info_module.html
- Ansible `amazon.aws.ec2_snapshot` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_snapshot_module.html
- Ansible `community.aws.ec2_ami_copy` module documentation: https://docs.ansible.com/ansible/latest/collections/community/aws/ec2_ami_copy_module.html
- Ansible `amazon.aws` collection index: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/index.html
- Ansible `community.aws` collection index: https://docs.ansible.com/ansible/latest/collections/community/aws/index.html
- AWS EC2 documentation for sharing AMIs with specific accounts: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/sharingamis-explicit.html
- AWS EBS documentation for sharing snapshots: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-modifying-snapshot-permissions.html

## Issues Found
- The prerequisites listed only the `amazon.aws` collection, but the AMI copy module is provided by `community.aws` in current Ansible collection documentation. Updated the prerequisites and install command to include both `amazon.aws` and `community.aws`.
- The AMI copy examples used `amazon.aws.ec2_ami_copy`, which is not the current fully qualified collection name. Changed both examples to `community.aws.ec2_ami_copy`.
- The snapshot-sharing task used `modify_attribute: createVolumePermission`, which is not the current `amazon.aws.ec2_snapshot` parameter. Changed it to `modify_create_vol_permission: true`.
- The post stated that encrypted AMI sharing requires sharing the underlying EBS snapshots. AWS EC2 documentation says snapshots do not need to be shared for another account to launch from a shared AMI, but KMS key access is required for encrypted snapshots; snapshot permissions are needed for copying the shared AMI. Updated the task label and explanatory paragraph accordingly.
- The permissions list omitted permissions needed by examples that tag AMIs and delete snapshots. Added `ec2:CreateTags` and `ec2:DeleteSnapshot`.

## Review Notes
The playbooks are examples and still require environment-specific IAM scoping, KMS key policy management for encrypted AMIs, and a real `cleanup-amis-tasks.yml` implementation for the final pipeline snippet.
