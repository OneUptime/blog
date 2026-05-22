# Validation Summary: How to Use Resource Meta-Arguments in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform resource meta-arguments: `count`, `for_each`, `depends_on`, `provider`, and `lifecycle`
- AWS Terraform provider resources including EC2, S3, RDS, WAFv2, Lambda, IAM, and ACM
- Amazon CloudFront ACM certificate region requirements

## Sources Consulted
- Terraform meta-arguments overview: https://developer.hashicorp.com/terraform/language/meta-arguments
- Terraform `count` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terraform `for_each` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform `depends_on` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on
- Terraform `provider` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/provider
- Terraform `lifecycle` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_lambda_function` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS provider `aws_wafv2_web_acl` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- Amazon CloudFront SSL/TLS certificate requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html

## Issues Found
- The `aws_db_instance` lifecycle example omitted required arguments for a new RDS instance. Added `allocated_storage`, `username`, and `password` so the snippet matches the AWS provider requirements unless restoring from a snapshot or creating a replica.
- The lifecycle section labeled its list as "Lifecycle arguments" even though current Terraform documentation includes additional lifecycle rule blocks beyond the four listed. Changed the heading to "Common lifecycle arguments" to keep the post accurate without expanding its scope.

## Review Notes
- The Terraform resource meta-argument descriptions match the current Terraform documentation.
- The CloudFront ACM certificate region note is correct for viewer certificates: ACM certificates used with CloudFront distributions must be requested or imported in `us-east-1`.
- The AWS snippets are illustrative and still depend on surrounding variables, provider configuration, IAM roles, package files, and account-specific prerequisites that are outside the scope of this post.
