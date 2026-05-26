# Validation Summary: How to Create AWS EC2 Dynamic Inventory in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- AWS EC2 dynamic inventory
- AWS CLI credentials and STS
- boto3 and botocore
- IAM policies
- YAML inventory configuration

## Sources Consulted
- Ansible amazon.aws.aws_ec2 inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- Ansible aws_ec2 dynamic inventory guide: https://docs.ansible.com/projects/ansible/9/collections/amazon/aws/docsite/aws_ec2_guide.html
- Ansible constructed inventory plugin documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/constructed_inventory.html
- Amazon AWS collection repository documentation and aws_ec2 plugin source: https://github.com/ansible-collections/amazon.aws
- AWS CLI describe-instances documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI describe-availability-zones documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-availability-zones.html
- AWS CLI configure documentation: https://docs.aws.amazon.com/cli/latest/reference/configure/
- AWS CLI sts get-caller-identity documentation: https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html
- Boto3 quickstart documentation: https://docs.aws.amazon.com/boto3/latest/guide/quickstart.html

## Issues Found
- The post incorrectly stated that the EC2 inventory plugin uses the instance ID as the default hostname. The official plugin behavior is to use the public DNS name when available, otherwise the private DNS name. Updated the hostname explanation.
- The post showed a commented `hostnames_filter` option, but this is not a documented option for `amazon.aws.aws_ec2`. Removed the invalid commented configuration.
- The `ansible_user` composition example checked whether `image_id` starts with `ami-ubuntu`, but AMI IDs do not encode the operating system that way. Replaced it with a tag-based `ansible_user` expression and an Amazon Linux default.
- The minimal IAM policy omitted `ec2:DescribeAvailabilityZones`, which the current plugin uses to populate availability-zone metadata. Added that read-only action.

## Review Notes
- The main configuration patterns for `plugin`, `regions`, `filters`, `exclude_filters`, `hostnames`, `keyed_groups`, `compose`, `groups`, and inventory caching matched the current official Ansible documentation.
- Local verification with `ansible-inventory`, `ansible-galaxy`, and `aws` CLI could not be run because those commands are not installed in this environment; CLI syntax was checked against official command documentation instead.
