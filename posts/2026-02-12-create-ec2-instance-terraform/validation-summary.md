# Validation Summary: How to Create an EC2 Instance with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS EC2
- Amazon Linux 2023
- AWS VPC, subnets, route tables, and security groups
- EC2 user data
- Amazon EBS
- Terraform S3 backend and state locking
- AWS CLI

## Sources Consulted
- HashiCorp Terraform install documentation: https://developer.hashicorp.com/terraform/install
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform lifecycle meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider `aws_ami` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Terraform AWS provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS EC2 security groups documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html
- Amazon Linux 2023 EC2 documentation: https://docs.aws.amazon.com/linux/al2023/ug/ec2.html
- AWS EC2 user data documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- AWS CLI `configure` command reference: https://docs.aws.amazon.com/cli/latest/reference/configure/
- AWS CLI `sts get-caller-identity` command reference: https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html

## Issues Found
- The Terraform Homebrew install command used `brew install terraform`, while HashiCorp's official macOS install instructions use the HashiCorp tap. Changed it to `brew tap hashicorp/tap` and `brew install hashicorp/tap/terraform`.
- The Amazon Linux 2023 AMI filter was too broad and could match non-standard Amazon-owned AL2023 images. Narrowed it to the standard AL2023 x86_64 kernel AMI naming pattern.
- The security group section referenced `aws_vpc.main.id` before the custom VPC was introduced, so the snippet would not work as shown. Added a default VPC data source and used it in that section.
- The VPC section said the example created public and private subnets, but the snippet only created a public subnet. Corrected the description.
- The S3 backend example used `dynamodb_table`, which Terraform now documents as deprecated for S3 backend locking. Replaced it with `use_lockfile = true` and updated the explanation.
- The lifecycle section implied `create_before_destroy` alone provides zero-downtime updates and showed it alongside `prevent_destroy` without warning. Clarified that traffic cutover still requires load balancing or a similar mechanism, and noted that `prevent_destroy` must be removed before planned replacements.

## Review Notes
- Terraform and AWS CLI were not installed in the local workspace, so command verification was performed against official CLI documentation rather than local `--help` output.
- The inline `ingress` and `egress` blocks in `aws_security_group` remain valid, but the current AWS provider documentation recommends standalone security group rule resources for more complex production use.
- The post references a OneUptime monitoring guide URL that is plausible for the blog, but it was not an official technical source.
