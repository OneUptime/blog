# Validation Summary: How to Use Terraform with AWS CDK Side by Side

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS CDK v2
- AWS CloudFormation
- AWS Systems Manager Parameter Store
- Amazon VPC
- Amazon ECS and AWS Fargate
- Amazon SQS and Amazon SNS
- AWS Lambda
- Amazon Aurora PostgreSQL
- GitHub Actions

## Sources Consulted
- AWS CDK v2 Developer Guide: Get a value from Systems Manager Parameter Store: https://docs.aws.amazon.com/cdk/v2/guide/get-ssm-value.html
- AWS CDK v2 API Reference: `aws_ec2.Vpc.fromLookup`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.Vpc.html
- AWS CDK v2 Developer Guide: `Vpc.fromLookup()` environment requirements: https://docs.aws.amazon.com/cdk/v2/guide/resources.html
- AWS CDK v2 API Reference: ECS `ClusterProps` and `containerInsightsV2`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.ClusterProps.html
- AWS CDK v2 API Reference: ECS `ContainerInsights`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.ContainerInsights.html
- AWS CDK v2 API Reference: ECS `FargateService`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.FargateService.html
- AWS CDK v2 API Reference: SSM `SecureStringParameterAttributes`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ssm.SecureStringParameterAttributes.html
- AWS CDK v2 CLI Reference: `cdk deploy --require-approval`: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-deploy.html
- AWS Systems Manager Parameter Store API Reference: parameter types: https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_Parameter.html
- Terraform AWS provider documentation: `aws_cloudformation_export` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/cloudformation_export
- Terraform AWS provider documentation: `aws_rds_cluster` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform CLI documentation: `terraform apply -auto-approve`: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform AWS VPC module registry page: https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest
- Amazon Aurora PostgreSQL release calendar: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/aurorapostgresql-release-calendar.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- AWS credentials action for GitHub Actions: https://github.com/aws-actions/configure-aws-credentials
- HashiCorp setup-terraform action: https://github.com/hashicorp/setup-terraform

## Issues Found
- The CDK ECS cluster example used the deprecated `containerInsights` boolean property. Changed it to `containerInsightsV2: ecs.ContainerInsights.ENABLED`, which is the current AWS CDK v2 API.
- The first CDK example assigned the Fargate service to an unused `fargateService` variable. Changed it to instantiate the service without storing the unused value, avoiding TypeScript `noUnusedLocals` failures.
- The API stack imported `aws-ec2` but did not use it. Removed the unused import to avoid TypeScript `noUnusedLocals` failures.
- The Aurora PostgreSQL example pinned `engine_version = "15.4"`, an old minor release. Updated it to `15.10`, the Aurora PostgreSQL 15 long-term support release listed in AWS documentation.
- The GitHub Actions workflow ran Terraform and CDK without configuring AWS credentials. Added OIDC permissions and `aws-actions/configure-aws-credentials@v6.1.0` steps to both jobs so the AWS provider and CDK CLI can authenticate.

## Review Notes
- The Terraform Lambda and RDS snippets are partial examples and assume supporting resources and variables such as `aws_iam_role.lambda_role`, `lambda.zip`, and `var.db_password` exist elsewhere.
- `Vpc.fromLookup()` and `StringParameter.valueFromLookup()` perform synthesis-time lookups and require an explicit AWS environment and valid AWS credentials; their values are cached in `cdk.context.json`.
- Terraform-managed `SecureString` values are still recorded in Terraform state, so production use should protect remote state and consider Secrets Manager or managed master user passwords where appropriate.
