# Validation Summary: How to Use AWS CDK with the CLI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- AWS CDK CLI
- TypeScript
- AWS CloudFormation
- Amazon VPC
- Amazon ECS Fargate
- Elastic Load Balancing
- Amazon RDS for PostgreSQL
- GitHub Actions

## Sources Consulted
- AWS CDK v2 Developer Guide: Getting started with the AWS CDK - https://docs.aws.amazon.com/cdk/v2/guide/getting-started.html
- AWS CDK v2 Developer Guide: AWS CDK CLI reference - https://docs.aws.amazon.com/cdk/v2/guide/cli.html
- AWS CDK v2 Developer Guide: AWS CDK CLI command reference - https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd.html
- AWS CDK v2 Developer Guide: Work with the AWS CDK library - https://docs.aws.amazon.com/cdk/v2/guide/work-with.html
- AWS CDK API Reference: ApplicationLoadBalancedFargateService - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs_patterns.ApplicationLoadBalancedFargateService.html
- AWS CDK API Reference: DatabaseInstance and PostgreSQL engine APIs - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.DatabaseInstance.html
- AWS CDK API Reference: assertions.Template - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions.Template.html
- OneUptime blog URL referenced in the post - https://oneuptime.com/blog/post/2026-02-12-use-aws-cloudformation-with-the-aws-cli/view

## Issues Found
- The post showed deprecated CDK v1 construct package installation commands (`@aws-cdk/aws-ec2`, `@aws-cdk/aws-ecs`, `@aws-cdk/aws-ecs-patterns`, and `@aws-cdk/aws-rds`) immediately before a CDK v2 code sample. Updated the install instructions to use `aws-cdk-lib` and `constructs`, which match the current CDK v2 imports used in the article.
- The context example used `props?.stage`, but `cdk.StackProps` does not define a `stage` property. Updated the snippet to read `stage` with `this.node.tryGetContext('stage')`, matching the `cdk deploy -c stage=production` command shown in the post.

## Review Notes
- The main TypeScript stack example was tested in a fresh CDK v2 TypeScript project using `aws-cdk-lib` 2.257.0 and CDK CLI 2.1125.0. It compiled and synthesized successfully.
- The assertion tests from the post were run in the same fresh project and passed.
- `cdk synth`, `cdk diff`, `cdk deploy`, `cdk destroy`, `cdk list`, `--json`, `--all`, `--require-approval never`, `--parameters Stack:Key=Value`, `--profile`, and `-c/--context` were checked against AWS CDK CLI documentation and local `cdk deploy --help` output.
- CDK emitted advisory warnings during synthesis about ECS deployment circuit breaker and minimum healthy percent defaults. These are useful production hardening notes, but they do not make the example technically incorrect.
