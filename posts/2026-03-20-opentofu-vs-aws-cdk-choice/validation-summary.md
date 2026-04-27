# Validation Summary: OpenTofu vs AWS CDK: Choosing the Right IaC Tool - Choice

## Status
validated

## Post Type
Comparison / Decision Guide

## Technologies Covered
- OpenTofu (HCL-based IaC)
- HashiCorp Configuration Language (HCL)
- AWS CDK (Cloud Development Kit)
- AWS CloudFormation
- TypeScript (CDK)
- AWS ECS (Cluster, Fargate Service)
- Amazon S3 (bucket, versioning, server-side encryption)
- AWS SSM Parameter Store
- CDK construct levels (L1/L2/L3)
- `tofu test` (OpenTofu native testing)
- CDK assertions library (Jest/pytest based testing)

## Sources Consulted
- OpenTofu documentation: https://opentofu.org/docs/
- Terraform AWS provider — `aws_ecs_cluster`, `aws_s3_bucket`, `aws_s3_bucket_versioning`, `aws_s3_bucket_server_side_encryption_configuration`, `aws_ssm_parameter` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- OpenTofu testing reference (`run`/`assert` blocks): https://opentofu.org/docs/cli/commands/test/
- AWS CDK API Reference (aws-cdk-lib): https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme.html
- AWS CDK ECS module (`Cluster`, `FargateService`): https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs-readme.html
- AWS CDK ECS Patterns (`ApplicationLoadBalancedFargateService`): https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs_patterns-readme.html
- AWS CDK S3 module (`Bucket`, `CfnBucket`, `BucketEncryption`): https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3-readme.html
- AWS Prescriptive Guidance — CDK construct layers (L1/L2/L3): https://docs.aws.amazon.com/prescriptive-guidance/latest/aws-cdk-layers/
- AWS Solutions Constructs (separate from aws-cdk-lib): https://aws.amazon.com/solutions/constructs/

## Issues Found
1. **Fictional CDK L3 construct (`patterns.StaticWebsite`)** — The L3 example used `new patterns.StaticWebsite(this, 'Site', { domainName: 'example.com' })`, but no such construct exists in `aws-cdk-lib`. AWS publishes L3 patterns either inside specific modules (e.g., `aws-cdk-lib/aws-ecs-patterns`) or in the separate AWS Solutions Constructs library. A reader would not be able to import `patterns.StaticWebsite`. Replaced the example with the canonical, verifiable L3 pattern `ApplicationLoadBalancedFargateService` from `aws-cdk-lib/aws-ecs-patterns`, preserving the educational intent of showing a multi-resource pattern.

## Review Notes
- The CDK `Cluster` example uses `containerInsights: true`, which is still supported in current CDK. Newer CDK versions also expose `containerInsightsV2: ContainerInsights.ENABLED` for finer-grained control (e.g., enhanced observability), but the boolean form remains valid.
- The OpenTofu S3 example correctly uses the post-AWS-provider-4.x split resources (`aws_s3_bucket_versioning`, `aws_s3_bucket_server_side_encryption_configuration`) rather than the deprecated inline blocks on `aws_s3_bucket`.
- The "3,000+ providers" figure is conservative; the public registry now lists more than 4,000, but the lower bound remains accurate.
- The `setting { name = "containerInsights" value = "enabled" }` syntax for `aws_ecs_cluster` is correct — the `name` here intentionally matches the AWS API casing rather than Terraform's usual snake_case.
- The `tofu test` block syntax (`run "name" { assert { condition = ..., error_message = ... } }`) and the CDK assertions usage (`template.hasResourceProperties(...)`) are both consistent with current documentation.
