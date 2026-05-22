# Validation Summary: How to Use the max Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform built-in numeric and collection functions
- Terraform input variable validation
- AWS Auto Scaling
- Amazon RDS
- Amazon EBS
- Amazon ECS Fargate
- Amazon Route 53

## Sources Consulted
- Terraform `max` function documentation: https://developer.hashicorp.com/terraform/language/functions/max
- Terraform function calls and argument expansion documentation: https://developer.hashicorp.com/terraform/language/expressions/function-calls
- Terraform `ceil` function documentation: https://developer.hashicorp.com/terraform/language/functions/ceil
- Terraform `sum` function documentation: https://developer.hashicorp.com/terraform/language/functions/sum
- Terraform validation documentation: https://developer.hashicorp.com/terraform/language/validate
- AWS ECS task definition parameters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon RDS DB instance storage documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- Amazon RDS for PostgreSQL release notes: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- Amazon EBS General Purpose SSD volume documentation: https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html

## Issues Found
- The post called `...` the "splat operator" in the Terraform console example. Terraform documents this as function argument expansion, so the wording was changed to "expansion symbol" and the example comment was updated.
- The RDS example pinned `engine_version = "15.4"`. Amazon RDS now marks PostgreSQL 15.4 as having reached the end of standard support, so the example was changed to `engine_version = "15"` to let RDS choose a recent minor version for PostgreSQL 15.

## Review Notes
Terraform CLI was not installed in the local environment, so examples were reviewed against official documentation rather than executed in `terraform console`. The dynamic `max([... ]...)` examples are correct for non-empty collections; empty collections would fail because `max` requires at least one numeric argument.
