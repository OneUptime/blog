# Validation Summary: How to Use depends_on with Data Sources in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform data sources
- Terraform `depends_on` meta-argument
- Terraform modules
- AWS Terraform Provider
- AWS S3, IAM, KMS, VPC, Security Groups, Subnets, and Lambda

## Sources Consulted
- Terraform data sources documentation: https://developer.hashicorp.com/terraform/language/data-sources
- Terraform meta-arguments documentation: https://developer.hashicorp.com/terraform/language/meta-arguments
- Terraform AWS Provider `aws_s3_bucket` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/s3_bucket
- Terraform AWS Provider `aws_kms_alias` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/kms_alias
- Terraform AWS Provider `aws_security_groups` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/security_groups
- Terraform AWS Provider `aws_subnets` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets
- Terraform AWS Provider `aws_iam_policy` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy
- Terraform AWS Provider `aws_lambda_function` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS Lambda runtime support documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html

## Issues Found
- The S3 data source example described looking up buckets by name prefix, but `aws_s3_bucket` looks up a specific bucket by exact `bucket` name. Updated the comment to say it looks up the bucket by name.
- The post stated that adding `depends_on` to a data source always defers it to apply and makes all attributes known after apply. Current Terraform documentation is more precise: Terraform may defer data source reads when dependencies or arguments cannot be known during planning, including when an explicit dependency has pending changes. Updated the wording to include the pending-change condition.
- The post implied Terraform only detects direct resource attribute references. Terraform documentation says it can also detect dependencies through expressions such as local values. Updated the explanation to avoid incorrectly excluding indirect expression-based dependencies.
- The Lambda example used `nodejs18.x`, which AWS lists as deprecated as of September 1, 2025. Updated the example to `nodejs24.x`, a currently supported Lambda Node.js runtime.
- The IAM role examples referenced an undefined `data.aws_iam_policy_document.assume.json`. Replaced those references with inline `jsonencode` assume-role policies so the examples are self-contained and syntactically valid.

## Review Notes
Some examples still depend on surrounding infrastructure that is intentionally omitted for brevity, such as provider configuration, VPC definitions, and deployable Lambda package contents. The Terraform and AWS provider concepts are correct after the fixes above.
