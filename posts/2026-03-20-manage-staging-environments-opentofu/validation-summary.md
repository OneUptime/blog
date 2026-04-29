# Validation Summary: How to Manage Staging Environments with OpenTofu

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- OpenTofu
- HCL
- AWS provider for OpenTofu/Terraform
- Amazon ECS
- Amazon RDS for PostgreSQL
- AWS Lambda
- Amazon EventBridge
- AWS Secrets Manager
- AWS VPC security groups

## Sources Consulted
- OpenTofu settings and `terraform` / `required_providers` documentation: https://opentofu.org/docs/language/settings/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/v1.9/language/settings/backends/s3/
- AWS provider `aws_ecs_service` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ecs_service.html.markdown
- AWS provider `aws_lambda_function` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_function.html.markdown
- AWS provider `aws_lambda_permission` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_permission.html.markdown
- AWS provider `aws_cloudwatch_event_rule` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_event_rule.html.markdown
- AWS provider `aws_cloudwatch_event_target` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_event_target.html.markdown
- AWS provider `aws_security_group_rule` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/security_group_rule.html.markdown
- AWS provider `aws_vpc_security_group_ingress_rule` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/vpc_security_group_ingress_rule.html.markdown
- AWS provider `aws_db_instance` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown
- AWS Lambda environment variables guidance: https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
- AWS Lambda with Secrets Manager guidance: https://docs.aws.amazon.com/lambda/latest/dg/with-secrets-manager.html
- Amazon EventBridge scheduled rule cron syntax: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html
- Amazon RDS for PostgreSQL release notes: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html

## Issues Found
- The post used `aws_security_group_rule` for the staging database ingress rule. Current AWS provider documentation recommends `aws_vpc_security_group_ingress_rule` as the best practice, so I updated the example to use the current resource and argument names.
- The Lambda example set `DB_HOST` to `module.database.endpoint`, but the AWS provider documents `endpoint` as `address:port`, not just a hostname. I renamed the variable to `DB_ENDPOINT` so the example matches the actual value shape.
- The Lambda example set `DB_PASSWORD` to a Secrets Manager ARN. AWS documents environment variables as plain string pairs and recommends Secrets Manager for database credentials, so I renamed the variable to `DB_PASSWORD_SECRET_ARN` to correctly reflect that the function should retrieve the secret at runtime rather than treat the ARN as the password itself.
- The EventBridge example created only an `aws_cloudwatch_event_rule`. That does not invoke Lambda by itself. I added `aws_cloudwatch_event_target` and `aws_lambda_permission`, which are both required for the rule to trigger the function.
- The EventBridge cron comment said "2am daily" without timezone. AWS scheduled EventBridge rules are evaluated in UTC, so I corrected the comment to "2am UTC daily."
- The RDS PostgreSQL example pinned `engine_version = "15.4"`. AWS RDS release notes show 15.4 has reached end of standard support, so I updated the example to a currently available PostgreSQL 15 minor version.

## Review Notes
- The post is technically sound after the fixes above.
- AWS currently describes scheduled EventBridge rules as a legacy scheduling feature and recommends EventBridge Scheduler for new scheduled workloads. The post's corrected `aws_cloudwatch_event_rule` example is still valid, so I kept the author's structure intact rather than rewriting the section around `aws_scheduler_schedule`.
- The provider constraint `version = "~> 5.30"` remains syntactically valid, but it pins an older AWS provider major than the current 6.x line. No change was required for correctness because the resources used in the post remain valid with that constraint.
