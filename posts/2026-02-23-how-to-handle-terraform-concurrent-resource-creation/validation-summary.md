# Validation Summary: How to Handle Terraform Concurrent Resource Creation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform dependency graph and parallelism
- Terraform state locking
- Terraform S3 backend
- Terraform AWS provider
- AWS security groups
- AWS IAM policy attachments
- Terraform time provider

## Sources Consulted
- HashiCorp Terraform apply command documentation: https://developer.hashicorp.com/terraform/cli/commands/apply
- HashiCorp Terraform destroy command documentation: https://developer.hashicorp.com/terraform/cli/commands/destroy
- HashiCorp Terraform dependency graph internals: https://developer.hashicorp.com/terraform/internals/graph
- HashiCorp Terraform CLI environment variables documentation: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- HashiCorp Terraform state locking documentation: https://developer.hashicorp.com/terraform/language/state/locking
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AWS provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS provider `aws_vpc_security_group_ingress_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- Terraform AWS provider `aws_iam_role_policy_attachment` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
- Terraform time provider `time_sleep` documentation: https://registry.terraform.io/providers/hashicorp/time/latest/docs/resources/sleep

## Issues Found
- The provider "sweet spot" table presented specific parallelism ranges as typical findings without authoritative support. Replaced it with provider-specific signals to monitor and guidance to start from Terraform's default parallelism.
- The AWS security group section recommended inline rules as the fix for security group rule conflicts. Current AWS provider documentation says the best practice is to use `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule`, with one CIDR block per rule. Updated the example to use `aws_vpc_security_group_ingress_rule`.
- The IAM policy attachment section stated that concurrent attachments to the same role can fail as a general rule. Updated the language to clarify that concurrent attachments are normally supported, while IAM throttling or eventual consistency can still require targeted serialization.
- The S3 backend example used `dynamodb_table` for state locking. DynamoDB-based S3 backend locking is deprecated in current Terraform. Replaced it with `use_lockfile = true` and updated the lock error example accordingly.

## Review Notes
Terraform was not installed in the local environment, so CLI behavior was verified against official HashiCorp documentation rather than local `terraform --help` output.
