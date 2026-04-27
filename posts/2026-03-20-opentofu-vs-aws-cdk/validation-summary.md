# Validation Summary: OpenTofu vs AWS CDK: Choosing the Right IaC Tool

## Status
validated

## Post Type
Comparison / Guide

## Technologies Covered
- OpenTofu (HCL, `.tfstate`, modules)
- AWS CDK v2 (`aws-cdk-lib`)
- AWS Lambda (`aws-cdk-lib/aws-lambda`)
- AWS ECS Patterns (`aws-cdk-lib/aws-ecs-patterns`, `ApplicationLoadBalancedFargateService`)
- AWS CloudFormation (synthesis target, rollback semantics)
- CDK assertions library (`aws-cdk-lib/assertions`, `Template`)
- Terratest (`github.com/gruntwork-io/terratest`)
- `terraform-aws-modules/ecs/aws` Terraform Registry module

## Sources Consulted
- AWS CDK v2 API Reference — https://docs.aws.amazon.com/cdk/api/v2/
- AWS CDK Developer Guide (supported languages) — https://docs.aws.amazon.com/cdk/v2/guide/languages.html
- `aws-cdk-lib/aws-lambda` Runtime constants — https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Runtime.html
- `aws-cdk-lib/assertions` Template API — https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions.Template.html
- `aws-cdk-lib/aws-ecs-patterns.ApplicationLoadBalancedFargateService` — https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs_patterns.ApplicationLoadBalancedFargateService.html
- OpenTofu documentation — https://opentofu.org/docs/
- Terraform Registry: `terraform-aws-modules/ecs/aws` — https://registry.terraform.io/modules/terraform-aws-modules/ecs/aws/latest
- Terratest `terraform.Options` reference — https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform#Options
- AWS CDK GitHub repository (Apache 2.0 license) — https://github.com/aws/aws-cdk
- OpenTofu GitHub repository (MPL 2.0 license) — https://github.com/opentofu/opentofu

## Issues Found
1. **Incorrect CDK assertions package name.** The comparison matrix listed the CDK testing module as `aws-cdk-assert`, which is not a valid package name. CDK v1 used `@aws-cdk/assert` (deprecated) and CDK v2 ships assertions as the `aws-cdk-lib/assertions` submodule with the `Template` class. Updated the matrix entry to `aws-cdk-lib/assertions` to match the v2 API the rest of the post uses.
2. **Incomplete list of CDK-supported languages.** Both the introduction and the comparison matrix listed only "TypeScript, Python, Go, Java", which omits JavaScript and C#/.NET — both of which are officially supported, stable language bindings for AWS CDK v2. Updated both locations to "TypeScript, JavaScript, Python, Java, C#, Go" for accuracy.

## Review Notes
- All other code samples were verified against current docs: the Lambda HCL resource, `lambda.Function` with `Runtime.NODEJS_20_X`, `ApplicationLoadBalancedFargateService` props (`cluster`, `taskImageOptions`, `desiredCount`, `publicLoadBalancer`), the `Template.fromStack` / `hasResourceProperties` assertion API, and the Terratest `TerraformBinary: "tofu"` option (supported since Terratest v0.41+).
- The `terraform-aws-modules/ecs/aws//modules/service` reference at `~> 5.0` is correct — the v4+ rewrite split the module into `cluster` and `service` submodules, and the 5.x line is current.
- License claims (OpenTofu MPL 2.0, AWS CDK Apache 2.0) are correct.
- The Node.js 20 Lambda runtime is supported but Node.js 22 is now also available via `Runtime.NODEJS_22_X`; the 20.x example remains valid and is not deprecated yet, but a future refresh could move to 22.x.
