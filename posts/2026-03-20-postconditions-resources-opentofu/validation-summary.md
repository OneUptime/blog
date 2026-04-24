# Validation Summary: How to Add Postconditions to Resources in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu custom conditions and lifecycle blocks
- HCL configuration syntax
- AWS provider resources and data sources used in OpenTofu
- AWS services referenced by the examples: EC2, S3, Elastic Load Balancing, Security Groups, RDS, IAM, Lambda, and VPC

## Sources Consulted
- OpenTofu Custom Conditions: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu Data Sources: https://opentofu.org/docs/language/data-sources/
- AWS provider `aws_instance` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- AWS provider `aws_s3_bucket` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket.html.markdown
- AWS provider `aws_s3_bucket_versioning` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_versioning.html.markdown
- AWS provider `aws_lb` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb.html.markdown
- AWS provider `aws_db_instance` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- AWS provider `aws_iam_role` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_role.html.markdown
- AWS provider `aws_lambda_function` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_function.html.markdown
- AWS provider `aws_vpc` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/vpc.html.markdown
- AWS Lambda `CreateFunction` API docs: https://docs.aws.amazon.com/lambda/latest/api/API_CreateFunction.html
- AWS Lambda Node.js runtimes docs: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html

## Issues Found
- The S3 bucket example used `self.region` to validate the bucket's actual region. Current AWS provider documentation exposes the bucket's region as `bucket_region`, so I changed the condition and error message to use `self.bucket_region`.
- The RDS example set `skip_final_snapshot = var.environment != "prod"`, which makes production use `skip_final_snapshot = false`. The AWS provider requires `final_snapshot_identifier` when `skip_final_snapshot` is `false`, so I added `final_snapshot_identifier = var.environment == "prod" ? "myapp-db-final" : null`.
- The explanation of preconditions and postconditions was too broad. OpenTofu documents them in terms of when the object is evaluated and frames the distinction as assumptions versus guarantees, so I updated the introduction, the inline comments, and the conclusion to match the documented behavior more closely.

## Review Notes
- `nodejs20.x` is still a valid Lambda runtime as of 2026-04-24, but AWS lists its deprecation date as April 30, 2026, its block-function-create date as August 31, 2026, and its block-function-update date as September 30, 2026. The example is valid today but will become outdated soon.
- Several postconditions in the post check values that are also explicitly configured, such as `self.internal == false` and `self.timeout <= 300`. These examples are technically valid, but postconditions are usually most valuable when they verify provider-computed or externally derived state.
