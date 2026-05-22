# Validation Summary: How to Create Reusable Terraform Modules for EC2 Instances

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- Amazon EC2
- Amazon EBS
- Amazon Linux 2023
- AWS IAM instance profiles
- EC2 Instance Metadata Service v2

## Sources Consulted
- HashiCorp AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- HashiCorp AWS provider `aws_ebs_volume` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_volume
- HashiCorp AWS provider `aws_volume_attachment` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/volume_attachment
- HashiCorp AWS provider `aws_ami` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Terraform optional object attribute documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints#optional-object-type-attributes
- Terraform lifecycle `ignore_changes` documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle#ignore_changes
- AWS Amazon Linux 2023 EC2 documentation: https://docs.aws.amazon.com/linux/al2023/ug/ec2.html
- OneUptime linked Terraform module best practices post: https://oneuptime.com/blog/post/2026-02-23-develop-terraform-modules-with-best-practices/view

## Issues Found
- The module checklist said the module handled optional Elastic IP association, but the implementation uses `associate_public_ip_address`, which assigns a regular public IPv4 address rather than an Elastic IP. Changed the wording to "Optional public IP address association."
- The AL2023 AMI lookup used `al2023-ami-*-x86_64`, which was broader than the documented standard Amazon Linux 2023 AMI naming pattern and could match unintended variants. Tightened it to `al2023-ami-2023.*-x86_64`.
- The `aws_instance` example base64-encoded `var.user_data` and assigned it to `user_data`. The AWS provider expects plain UTF-8 user data in `user_data`; base64-encoded data belongs in `user_data_base64`. Updated the example to pass `var.user_data` directly and adjusted the comment.
- The lifecycle comment said it prevented accidental destruction in production. `ignore_changes = [ami]` only ignores later AMI argument changes during update planning; it is not destroy protection. Updated the comment to describe the actual behavior.

## Review Notes
- The additional EBS volume example uses `/dev/nvme1n1` in user data, which is common on Nitro-based instances but can be environment-dependent. Production modules often add more robust device discovery before formatting and mounting a new data volume.
- The module uses optional object attributes with defaults, which is valid in current Terraform, but a real module should include `versions.tf` constraints that require a Terraform version supporting that syntax and a tested AWS provider version range.
