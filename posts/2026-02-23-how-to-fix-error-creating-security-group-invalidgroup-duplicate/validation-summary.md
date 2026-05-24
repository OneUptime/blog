# Validation Summary: How to Fix Error Creating Security Group InvalidGroup Duplicate

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (HCL configuration language)
- AWS EC2 Security Groups
- AWS VPC
- AWS CLI (`aws ec2` subcommands)
- Terraform AWS Provider (`aws_security_group`, `aws_default_security_group`)
- Terraform S3 backend with DynamoDB locking
- Terraform lifecycle rules (`create_before_destroy`)
- Terraform modules

## Sources Consulted
- AWS EC2 API Error Codes (InvalidGroup.Duplicate): https://docs.aws.amazon.com/AWSEC2/latest/APIReference/errors-overview.html
- AWS CLI Reference for `ec2 describe-security-groups`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-security-groups.html
- AWS CLI Reference for `ec2 describe-network-interfaces`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-interfaces.html
- AWS CLI Reference for `ec2 delete-security-group`: https://docs.aws.amazon.com/cli/latest/reference/ec2/delete-security-group.html
- Terraform AWS Provider docs for `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS Provider docs for `aws_default_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/default_security_group
- Terraform `import` command: https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform S3 backend: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform lifecycle meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- AWS VPC default security group documentation: https://docs.aws.amazon.com/vpc/latest/userguide/default-security-group.html

## Issues Found
No technical issues found.

## Review Notes
- The post's claim that security group names must be unique within a VPC is correct; AWS enforces this and returns `InvalidGroup.Duplicate` (HTTP 400) when violated.
- The `terraform import aws_security_group.my_sg sg-xxx` syntax is current and correct. Note that Terraform 1.5+ also supports declarative `import` blocks as an alternative, but the CLI form remains fully supported.
- The `name_prefix` argument on `aws_security_group` correctly conflicts with `name`; Terraform appends a unique random suffix (up to 6 characters), which combined with the prefix's 32-char limit (vs 255 for `name`) keeps the total under the 255-char AWS limit.
- Pairing `name_prefix` with `create_before_destroy = true` is the canonical pattern in the AWS provider docs for avoiding downtime during replacement, and the post explains this accurately.
- The `aws_default_security_group` example with `ingress { ... self = true }` is valid — the ingress block requires at least one source argument (`cidr_blocks`, `ipv6_cidr_blocks`, `prefix_list_ids`, `security_groups`, or `self`), and `self = true` satisfies this.
- The S3 backend example uses `dynamodb_table` for state locking. This remains supported, though Terraform 1.10+ introduced native S3 locking via `use_lockfile = true` as a newer alternative. The example as written still works and is widely used.
- In the modules example, both `module "web_server"` and `module "api_server"` reference `module.security.web_sg_id`. This is consistent with the surrounding text ("If multiple modules need to reference the same security group") but readers may want to use distinct outputs (e.g., `web_sg_id` and `api_sg_id`) in their own configurations.
- All AWS CLI commands, flags, and JMESPath `--query` expressions are syntactically correct and current.
