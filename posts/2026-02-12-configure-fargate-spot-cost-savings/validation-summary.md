# Validation Summary: How to Configure Fargate Spot for Cost Savings

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS ECS
- AWS Fargate
- Fargate Spot
- ECS capacity providers
- AWS CloudFormation
- Terraform AWS provider
- AWS CLI
- Node.js signal handling
- Python signal handling
- CloudWatch / EventBridge monitoring concepts

## Sources Consulted
- Amazon ECS clusters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-capacity-providers.html
- AWS::ECS::Service CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ecs-service.html
- AWS::ECS::Service CapacityProviderStrategyItem CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ecs-service-capacityproviderstrategyitem.html
- AWS::ECS::ClusterCapacityProviderAssociations CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ecs-clustercapacityproviderassociations.html
- Amazon ECS task definition parameters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- AWS CLI ecs list-tasks reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/list-tasks.html
- AWS CLI ecs describe-tasks reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/describe-tasks.html
- Viewing Amazon ECS stopped task errors: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/stopped-task-errors.html
- Terraform aws_ecs_cluster_capacity_providers resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster_capacity_providers
- AWS Fargate pricing: https://aws.amazon.com/fargate/pricing/
- AWS Price List API offer file for Amazon ECS us-east-1, publication 2026-05-15: https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonECS/current/us-east-1/index.json

## Issues Found
- The post said `FARGATE_SPOT` comes built into every ECS cluster. AWS documents `FARGATE` and `FARGATE_SPOT` as predefined capacity providers, but they must be associated with a cluster before use in a capacity provider strategy. Updated the explanation and added an `AWS::ECS::ClusterCapacityProviderAssociations` resource to the CloudFormation example.
- The opening described Fargate Spot as "typically 50-70% less" than regular Fargate. AWS documents the discount as "up to 70%." Updated the wording to match the official pricing claim.
- The monitoring command used `describe-services` while saying it checked how many tasks were running on each capacity provider. That command only returns the configured strategy. Replaced it with `list-tasks` plus `describe-tasks` querying each task's `capacityProviderName`.
- The stopped-task command piped default JSON output from `list-tasks` into `xargs`, which would not reliably pass task ARNs to `describe-tasks`. Added `--query 'taskArns[]' --output text`.
- The stopped-task filter used an incorrect Spot interruption stopped reason. AWS documents Fargate Spot interruption events with `stopCode` `SpotInterruption` and `stoppedReason` `Your Spot Task was interrupted.` Updated the query accordingly.

## Review Notes
- The Node.js and Python snippets are syntactically valid as illustrative examples, assuming the surrounding application objects and helper functions exist.
- The cost example uses current AWS Price List API values for Linux/x86 Fargate in `us-east-1` as of the 2026-05-15 Amazon ECS offer file: `$0.04048` per vCPU-hour and `$0.004445` per GB-hour.
- The task definition's `stopTimeout: 120` is valid for Fargate and matches the documented maximum. AWS also documents the default as 30 seconds.
