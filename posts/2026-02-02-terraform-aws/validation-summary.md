# Validation Summary: How to Use Terraform with AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.0.0)
- AWS Provider (~> 5.0)
- AWS VPC, Subnets, Internet Gateway, NAT Gateway, Route Tables
- AWS EC2, Security Groups, AMI data source
- AWS RDS (PostgreSQL)
- AWS S3 (versioning, encryption, public access block)
- AWS DynamoDB (state locking)
- HCL (HashiCorp Configuration Language)
- Mermaid diagrams

## Sources Consulted
- Terraform AWS Provider Documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- `aws_instance` resource (user_data vs user_data_base64): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- `aws_eip` resource (domain argument in provider 5.x): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- `aws_db_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- `aws_s3_bucket_versioning`, `aws_s3_bucket_server_side_encryption_configuration`, `aws_s3_bucket_public_access_block` resources
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- AWS RDS supported PostgreSQL versions
- Amazon Linux 2 AMI naming convention: https://docs.aws.amazon.com/linux/al2/ug/amazon-linux-ami.html

## Issues Found
1. **Double base64 encoding of user_data** (ec2.tf): The original code used `user_data = base64encode(templatefile(...))`. The AWS provider's `user_data` argument expects plain text and base64-encodes it internally before passing to EC2. Wrapping `templatefile()` in `base64encode()` and assigning to `user_data` would double-encode the data, causing the boot script to fail. Fixed by removing the `base64encode()` wrapper so `user_data = templatefile(...)`. (If the author wanted to pre-encode, they would assign to `user_data_base64` instead.)

## Review Notes
- The `aws_eip` resource correctly uses `domain = "vpc"` (the modern argument in AWS provider 5.x; the older `vpc = true` has been deprecated).
- The `aws_db_instance` correctly uses `db_name` (the modern argument; older `name` has been deprecated).
- The S3 bucket configuration correctly uses separate resources (`aws_s3_bucket_versioning`, `aws_s3_bucket_server_side_encryption_configuration`, `aws_s3_bucket_public_access_block`) rather than the legacy inline arguments — this matches the AWS provider 4.x+ requirement.
- PostgreSQL `engine_version = "15.4"` is still supported by RDS at the time of review, though newer versions (16.x, 17.x) are now available. Not incorrect, just slightly behind the current release.
- The Amazon Linux 2 AMI filter (`amzn2-ami-hvm-*-x86_64-gp2`) is correct. AWS now recommends Amazon Linux 2023 (`al2023-ami-*-x86_64`) for new deployments, but Amazon Linux 2 is still supported.
- The `aws_security_group` resource uses inline `ingress`/`egress` blocks. This is still fully supported, though HashiCorp now recommends `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule` separate resources for finer-grained management. Not an error.
- The S3 backend uses `dynamodb_table` for state locking. Terraform 1.10+ introduced native S3 state locking via `use_lockfile = true`, but `dynamodb_table` remains supported.
- Some variables referenced in examples (e.g., `var.vpc_cidr`, `var.availability_zones`, `var.admin_cidr`, `var.instance_count`, `var.instance_type`, `var.key_pair_name`, `var.db_instance_class`, `var.db_name`, `var.db_username`, `var.db_password`) are not declared in the shown variable blocks. This is acceptable for a tutorial showing partial snippets, but readers should know these need to be defined.
