# Validation Summary: How to Configure API Gateway Canary Deployments with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS API Gateway REST API
- AWS CLI
- Amazon CloudWatch
- Amazon EventBridge
- AWS Lambda stage-variable routing

## Sources Consulted
- AWS API Gateway Developer Guide: Set up an API Gateway canary release deployment - https://docs.aws.amazon.com/apigateway/latest/developerguide/canary-release.html
- AWS API Gateway Developer Guide: Create a canary release deployment - https://docs.aws.amazon.com/apigateway/latest/developerguide/create-canary-deployment.html
- AWS API Gateway Developer Guide: Update a canary release - https://docs.aws.amazon.com/apigateway/latest/developerguide/update-canary-deployment.html
- AWS API Gateway Developer Guide: Promote a canary release - https://docs.aws.amazon.com/apigateway/latest/developerguide/promote-canary-deployment.html
- AWS API Gateway Developer Guide: Turn off a canary release - https://docs.aws.amazon.com/apigateway/latest/developerguide/delete-canary-deployment.html
- AWS API Gateway Developer Guide: Amazon API Gateway dimensions and metrics - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-metrics-and-dimensions.html
- AWS API Gateway Developer Guide: Set up CloudWatch logging for REST APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html
- Terraform Registry: `aws_api_gateway_stage` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_stage
- Terraform Registry: `aws_api_gateway_deployment` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_deployment

## Issues Found
- The `aws_api_gateway_stage` example enabled `access_log_settings` without the required `format` field. I added a valid `jsonencode(...)` log format that includes `$context.requestId`, which AWS requires for access logging.
- The prerequisites omitted the API Gateway CloudWatch Logs account role requirement for CloudWatch logging. I added that prerequisite so the logging example matches AWS's documented requirements.
- The monitoring step described the alarm as a canary-only error-rate alarm, but the example dimensions (`ApiName` and `Stage`) are stage-level metrics. I corrected the wording to describe it as rollout monitoring and added `treat_missing_data = "notBreaching"` to avoid false alarms during idle periods.
- The promotion commands were incomplete and partially incorrect. Promoting a canary in API Gateway requires copying the canary deployment ID to the stage deployment ID, copying any canary stage variable overrides to stage variables, and resetting canary traffic to `0.0`. I replaced the command with the documented `update-stage` patch operations.
- The post used `aws apigateway delete-stage-canary-settings`, which is not an AWS CLI command. I replaced it with the documented `update-stage` command that removes `/canarySettings`.
- The text said that setting canary traffic to `100` was a full rollout. That only routes all traffic to the canary temporarily; it does not promote the canary to the base stage deployment. I corrected the description.
- Step 5 claimed to automate progression "with Lambda" but only defined an EventBridge rule. I corrected the heading and comment so the snippet accurately describes what it creates.

## Review Notes
- The post targets API Gateway REST APIs. The `aws_api_gateway_*` resources and `aws apigateway` CLI commands shown here do not apply to API Gateway HTTP APIs (`apigatewayv2`).
- API Gateway creates canary-specific access and execution log groups with a `/Canary` suffix when logging is enabled. Those logs are useful for canary-only analysis even though the example alarm in the post uses stage-level CloudWatch metrics.
