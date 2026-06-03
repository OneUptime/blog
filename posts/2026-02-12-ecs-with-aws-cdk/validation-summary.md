# Validation Summary: How to Set Up ECS with AWS CDK

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- Amazon ECS
- AWS Fargate
- TypeScript
- Amazon ECR
- Application Load Balancer
- AWS Secrets Manager
- Amazon CloudWatch Logs
- AWS Cloud Map
- CDK CLI

## Sources Consulted
- AWS CDK API Reference: ApplicationLoadBalancedFargateService - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs_patterns.ApplicationLoadBalancedFargateService.html
- AWS CDK API Reference: ApplicationLoadBalancedTaskImageProps - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs_patterns.ApplicationLoadBalancedTaskImageProps.html
- AWS CDK API Reference: Cluster and ClusterProps - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.Cluster.html
- AWS CDK API Reference: ContainerInsights - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.ContainerInsights.html
- AWS CDK API Reference: FargateServiceProps - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.FargateServiceProps.html
- AWS CDK API Reference: BaseService.enableCloudMap - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.BaseService.html
- AWS CDK API Reference: CloudMapNamespaceOptions - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.CloudMapNamespaceOptions.html
- AWS CDK API Reference: RetentionDays - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.RetentionDays.html
- AWS CDK CLI deploy command reference - https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-deploy.html
- Local verification with `aws-cdk-lib@2.257.0`, `constructs@10.5.0`, TypeScript, `tsc --noEmit`, and `cdk synth`.
- Referenced OneUptime link verified: https://oneuptime.com/blog/post/2026-02-12-monitor-ecs-container-insights/view

## Issues Found
- The production stack used `containerInsights: true`, which is deprecated in current CDK v2. Updated it to `containerInsightsV2: ecs.ContainerInsights.ENABLED`.
- The production stack used `logs.RetentionDays.THIRTY_DAYS`, which is not a valid CDK enum member. Updated it to `logs.RetentionDays.ONE_MONTH`, the current one-month retention enum.
- The production stack imported `aws-elasticloadbalancingv2` but did not use it. Removed the unused import so the example compiles under common strict TypeScript settings.
- The microservice example enabled Cloud Map service discovery without first defining a cluster Cloud Map namespace. Added `cluster.addDefaultCloudMapNamespace({ name: 'services.local' });` before creating services.
- The deployment command used `cdk deploy EcsProduction --parameters imageTag=v1.2.3`, but `imageTag` is a CDK constructor prop read from `process.env.IMAGE_TAG`, not a CloudFormation parameter. Updated the command to `IMAGE_TAG=v1.2.3 cdk deploy EcsProduction`.

## Review Notes
- The corrected TypeScript snippets compile with current `aws-cdk-lib` and synthesize successfully in a temporary CDK harness.
- `cdk synth` emitted CDK warnings that `minHealthyPercent` is not configured and defaults to 50% for the services. This is not an API error, but a future production-hardening improvement could set `minHealthyPercent` explicitly.
