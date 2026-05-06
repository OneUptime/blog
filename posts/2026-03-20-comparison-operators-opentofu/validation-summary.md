# Validation Summary: How to Use Comparison Operators in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS Provider for Terraform/OpenTofu
- Amazon EC2
- Amazon RDS
- Amazon S3

## Sources Consulted
- OpenTofu: Arithmetic and Logical Operators — https://opentofu.org/docs/language/expressions/operators/
- OpenTofu: Conditional Expressions — https://opentofu.org/docs/language/expressions/conditionals/
- OpenTofu: Custom Conditions — https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu: Input Variables — https://opentofu.org/docs/language/values/variables/
- OpenTofu: `lower` Function — https://opentofu.org/docs/language/functions/lower/
- Terraform Registry: `aws_instance` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform Registry: `aws_db_instance` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform Registry: `aws_s3_bucket_server_side_encryption_configuration` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration

## Issues Found
- The comment in the `aws_instance` equality-comparison example incorrectly described `availability_zone` as “Multi-AZ only in production.” `availability_zone` pins an EC2 instance to a single Availability Zone when set, and leaving it `null` only lets AWS choose an AZ. It does not create Multi-AZ behavior. I changed the comment to `Pin non-production to a specific AZ` to match the code and provider behavior.

## Review Notes
- The OpenTofu language examples are technically correct for equality, ordering, logical composition, validation blocks, lifecycle preconditions/postconditions, and `null` comparisons.
- The AWS resource snippets are illustrative rather than standalone: they assume surrounding provider configuration and some omitted required arguments or variable declarations.
- The RDS example uses currently supported `storage_type` values (`gp3` and `io2`), but exact `iops` rules for RDS can vary by engine and allocated storage thresholds, as documented in the AWS provider and RDS storage docs.
