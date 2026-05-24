# Validation Summary: How to Handle Database Schema Changes with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS RDS (PostgreSQL)
- AWS CodeBuild
- AWS CodePipeline
- AWS Lambda
- AWS IAM
- AWS SSM Parameter Store
- AWS S3
- AWS Secrets Manager
- Flyway (database migration tool)
- Liquibase (database migration tool)
- Terraform PostgreSQL Provider (cyrilgdn/postgresql)
- PostgreSQL (15.4)

## Sources Consulted
- Terraform AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- aws_db_instance resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- aws_codebuild_project resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codebuild_project
- aws_codepipeline resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codepipeline
- aws_lambda_function resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform PostgreSQL provider docs: https://registry.terraform.io/providers/cyrilgdn/postgresql/latest/docs
- Flyway command-line documentation: https://documentation.red-gate.com/fd/command-line-184127419.html
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS CodeBuild managed images: https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-available.html

## Issues Found
1. **Flyway download URL path was incorrect.** The post used `https://download.red-gate.com/maven/release/com/redgate/flyway/flyway-commandline/10.0.0/...` but the Flyway artifacts are published under the `org.flywaydb` Maven groupId, so the correct path is `org/flywaydb/flyway-commandline`. Fixed the URL to `https://download.red-gate.com/maven/release/org/flywaydb/flyway-commandline/10.0.0/flyway-commandline-10.0.0-linux-x64.tar.gz`. Without this fix, the buildspec install step would fail with a 404.

## Review Notes
- The AWS provider version `~> 5.0`, PostgreSQL 15.4, instance class `db.r6g.large`, storage type `gp3`, CodeBuild image `aws/codebuild/amazonlinux2-x86_64-standard:5.0`, and Lambda runtime `python3.12` are all valid and current for the timeframe of this post.
- The Flyway CLI flag syntax (`-url`, `-user`, `-password`, `-locations`) is correct for Flyway 10.x.
- The `aws_db_instance` configuration correctly pairs `skip_final_snapshot = false` with `final_snapshot_identifier`, which is required when `skip_final_snapshot` is false.
- The `null_resource` with `local-exec` provisioner is a valid pattern, though HashiCorp generally recommends provisioners as a last resort; a separate CI/CD step (as covered later in the post) is the preferred approach.
- The `postgresql_schema` and `postgresql_extension` resource attributes match the cyrilgdn/postgresql provider schema.
- The IAM policy for CodeBuild includes the standard ENI/VPC permissions needed when running inside a VPC, including `ec2:CreateNetworkInterfacePermission` scoped to the ENI ARN — correctly modeled.
- Minor stylistic note (not changed): the `data.aws_caller_identity.current` data source is declared after its usage in the S3 bucket name. Terraform does not require declaration order, so this is functionally correct.
