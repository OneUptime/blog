# Validation Summary: How to Use the amazon.aws Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- AWS EC2
- AWS VPC
- AWS Security Groups
- AWS S3
- AWS IAM
- Ansible dynamic inventory
- boto3 and botocore

## Sources Consulted
- Ansible amazon.aws collection index: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/index.html
- Ansible Amazon Web Services guide: https://docs.ansible.com/ansible/latest/collections/amazon/aws/docsite/guide_aws.html
- Ansible collection installation requirements syntax: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- amazon.aws.ec2_instance module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- amazon.aws.ec2_security_group module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_security_group_module.html
- amazon.aws.ec2_vpc_igw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_igw_module.html
- amazon.aws.ec2_vpc_route_table module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_vpc_route_table_module.html
- amazon.aws.s3_bucket module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/s3_bucket_module.html
- amazon.aws.s3_object module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/s3_object_module.html
- amazon.aws.iam_role module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/iam_role_module.html
- amazon.aws.iam_policy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/iam_policy_module.html
- amazon.aws.aws_ec2 inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html

## Issues Found
- The `requirements.yml` example described a locked-down setup but used `version: ">=7.0.0"`, which allows newer major versions and is not a pin. Changed it to `version: "==10.3.1"` and adjusted the comment to say it pins the collection version.
- The EC2 instance example set `ebs.encrypted: true` under `amazon.aws.ec2_instance.volumes`, but the current module documentation lists supported EBS mapping keys and does not include `encrypted`. Removed that unsupported key.
- The EC2 instance example waited for `public_ip_address` but did not explicitly request a public IP address. Changed the network configuration to use `network_interfaces` with `assign_public_ip: true`, `groups`, and `subnet_id`, matching the current module examples.
- The S3 object upload example used `encryption: "AES256"` with `amazon.aws.s3_object`, but the current module uses `encrypt` and `encryption_mode` for object encryption. Changed it to `encrypt: true` and `encryption_mode: "AES256"`.

## Review Notes
The examples still use placeholder resource names, bucket names, subnet IDs, key pair names, and an example AMI ID. These must be replaced with account-specific values before running in a real AWS account. The installed Ansible CLI was not available in this workspace, so validation was performed against the official Ansible documentation and YAML parsing rather than `ansible-playbook --syntax-check`.
