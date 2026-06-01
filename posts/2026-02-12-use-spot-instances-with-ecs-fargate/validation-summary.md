# Validation Summary: How to Use Spot Instances with ECS Fargate

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- AWS Fargate and Fargate Spot
- ECS capacity providers
- AWS CLI
- Amazon EventBridge
- Amazon SQS
- AWS Cost Explorer / Boto3
- Python signal handling

## Sources Consulted
- AWS Fargate pricing: https://aws.amazon.com/fargate/pricing/
- Amazon ECS clusters for Fargate and Fargate Spot termination notices: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-capacity-providers.html
- AWS CLI `ecs create-cluster`: https://docs.aws.amazon.com/cli/latest/reference/ecs/create-cluster.html
- AWS CLI `ecs put-cluster-capacity-providers`: https://docs.aws.amazon.com/cli/latest/reference/ecs/put-cluster-capacity-providers.html
- AWS CLI `ecs create-service`: https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- Amazon ECS task definition parameters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon ECS task state change events: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_task_events.html
- AWS CLI `events put-rule`: https://docs.aws.amazon.com/cli/latest/reference/events/put-rule.html
- AWS CLI `events put-targets`: https://docs.aws.amazon.com/cli/latest/reference/events/put-targets.html
- Boto3 Cost Explorer `get_cost_and_usage`: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ce/client/get_cost_and_usage.html
- AWS public pricing offer data for Amazon ECS in us-east-1: https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonECS/current/us-east-1/index.json

## Issues Found
1. **Fargate pricing example omitted memory charges.** The post used `$0.04048/hour` as the full price for a 1 vCPU / 2GB task, but AWS Fargate pricing is based on both requested vCPU and memory. Updated the example to include the `2 * $0.004445/GB-hour` memory component and adjusted the monthly on-demand and Spot estimates.
2. **Invalid ECS task definition revision label.** The service example used `--task-definition web-app:latest`, but ECS task definition references use `family`, `family:revision`, or a full ARN; `latest` is not a valid revision. Changed it to `web-app`, which uses the latest active revision when no revision is specified.
3. **Incorrect Cost Explorer `GroupBy` object.** The Boto3 example used `{'Type': 'USAGE_TYPE', 'Key': ''}`. The API requires `Type` to be `DIMENSION`, `TAG`, or `COST_CATEGORY`, with `USAGE_TYPE` supplied as the `Key`. Updated it to `{'Type': 'DIMENSION', 'Key': 'USAGE_TYPE'}`.

## Review Notes
- The local environment did not have the AWS CLI installed, so command validation was performed against official AWS CLI documentation rather than local `aws --help` output.
- The Python examples are syntactically valid. Some helper functions in the first shutdown example are intentionally illustrative placeholders.
- Fargate Spot prices are variable and region-specific. The corrected pricing example keeps the author's practical estimate but makes the billing dimensions and approximation clear.
