# Validation Summary: How to Use Terraform with Ansible for Configuration Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Ansible
- AWS EC2
- AWS IAM
- AWS RDS
- Amazon ElastiCache
- Ansible dynamic inventory
- CI/CD shell scripting

## Sources Consulted
- Terraform `terraform_data` resource documentation: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- Terraform provisioners and `local-exec` documentation: https://developer.hashicorp.com/terraform/language/provisioners
- HashiCorp Null provider `null_resource` documentation: https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource
- Terraform AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider `aws_iam_instance_profile` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_instance_profile
- Terraform AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_elasticache_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_cluster
- Terraform `yamlencode` function documentation: https://developer.hashicorp.com/terraform/language/functions/yamlencode
- Ansible `amazon.aws.aws_ec2` inventory plugin documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- Ansible AWS EC2 dynamic inventory guide: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/docsite/aws_ec2_guide.html
- Ansible inventory documentation: https://docs.ansible.com/ansible/latest/user_guide/intro_inventory.html
- Ansible extra variables documentation: https://docs.ansible.com/ansible/6/user_guide/playbooks_variables.html

## Issues Found
- The Terraform provisioner example used `null_resource`. Current Terraform documentation recommends the built-in `terraform_data` resource for this pattern on Terraform 1.4 and later. Changed the example to `resource "terraform_data"` and replaced `triggers` with `triggers_replace`.
- The Ansible control node example referenced `aws_iam_instance_profile.ansible.name` but did not define an `aws_iam_instance_profile` resource. Added the missing instance profile resource with the IAM role attached.
- The IAM role comment said the controller could "discover and manage instances" while the attached `AmazonEC2ReadOnlyAccess` policy only grants read/discovery permissions. Updated the comment to "discover instances."
- The control node bootstrap installed Ansible packages globally with `pip3 install`, which can fail on modern externally managed Python environments. Updated the example to install Ansible, boto3, and botocore in a Python virtual environment and expose the Ansible commands via `/usr/local/bin`.

## Review Notes
The remaining examples are illustrative and assume surrounding variables and resources such as security groups, VPCs, subnets, and RDS/ElastiCache resources exist elsewhere in the Terraform configuration. The AWS dynamic inventory file name `aws_ec2.yml`, tag filters, `keyed_groups`, `hostnames`, and `compose` usage match the documented Ansible inventory plugin options.
