# Validation Summary: How to Use Ansible to Create AWS EC2 Instances

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- AWS EC2
- EC2 key pairs
- EC2 security groups
- Amazon Linux 2023
- boto3 and botocore

## Sources Consulted
- Ansible amazon.aws.ec2_instance module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- Ansible amazon.aws.ec2_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_key_module.html
- Ansible amazon.aws.ec2_ami_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_ami_info_module.html
- Ansible amazon.aws.ec2_security_group module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_security_group_module.html
- AWS Amazon Linux 2023 package management documentation: https://docs.aws.amazon.com/linux/al2023/ug/package-management.html
- AWS Systems Manager public AMI parameter documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-public-parameters-ami.html

## Issues Found
- The `amazon.aws.ec2_instance` examples used the deprecated `network` parameter. Updated both examples to use `network_interfaces` with `assign_public_ip: true`, matching the current module documentation.
- The basic EC2 example labeled a fixed AMI ID as Amazon Linux 2023. AMI IDs are region-specific and change over time, so the example now uses a placeholder and tells readers to replace it with a current AMI ID for their region.
- The Amazon Linux 2023 `user_data` example used `yum`. Although Amazon Linux 2023 still provides `yum` as a pointer to `dnf`, AWS documents DNF as the default package manager, so the commands were changed to `dnf`.

## Review Notes
The examples are technically valid as tutorial snippets, but users still need real VPC, subnet, security group, key pair, and AMI values for their AWS account and region. For production use, the AMI lookup section is preferable to hard-coded AMI IDs.
