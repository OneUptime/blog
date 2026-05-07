# Validation Summary: How to Set Up API Gateway Stages and Deployments with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- HCL
- AWS API Gateway REST API
- AWS CLI
- Amazon CloudWatch Logs
- AWS X-Ray
- Terraform AWS provider resources for API Gateway

## Sources Consulted
- OpenTofu lifecycle documentation: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- OpenTofu `sha1` function: https://opentofu.org/docs/language/functions/sha1/
- OpenTofu `jsonencode` function: https://opentofu.org/docs/language/functions/jsonencode/
- Terraform Registry: `aws_api_gateway_deployment` https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_deployment
- Terraform Registry: `aws_api_gateway_stage` https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_stage
- Terraform Registry: `aws_api_gateway_method_settings` https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_method_settings
- Terraform Registry: `aws_api_gateway_account` https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_account
- AWS API Gateway Developer Guide: Set up a stage for a REST API https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-stages.html
- AWS API Gateway Developer Guide: Deploy REST APIs in API Gateway https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-deploy-api.html
- AWS API Gateway Developer Guide: Set up CloudWatch logging for REST APIs https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html
- AWS API Gateway Developer Guide: Invoke REST APIs in API Gateway https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-call-api.html
- AWS CLI reference: `get-stage` https://docs.aws.amazon.com/cli/latest/reference/apigateway/get-stage.html
- AWS CLI reference: `get-deployments` https://docs.aws.amazon.com/cli/latest/reference/apigateway/get-deployments.html

## Issues Found
- The introduction described a stage as the snapshot itself. AWS documents a stage as a named reference to a deployment, while the deployment is the snapshot. I corrected that wording.
- The deployment `triggers` example hashed only resource IDs, but the post claimed it would redeploy when API configuration changed. The AWS provider documentation notes ID-only hashing does not capture all future API changes, so I changed the example to hash the dependent resource objects instead.
- The AWS CLI example used `aws apigateway get-stage --query "invokeUrl"`, but the `GetStage` response does not include an `invokeUrl` field. I changed the example to retrieve stage details and documented the correct REST API invoke URL format from AWS.
- The method settings example enabled execution logging but the prerequisites omitted the required API Gateway account-level CloudWatch logging role (`cloudWatchRoleArn`). I added that prerequisite so the logging guidance is operationally correct.
- The conclusion implied stage variables directly pass configuration to Lambda or other backends. I narrowed that claim to the documented behavior: stage variables affect runtime behavior when referenced by integrations or mapping templates.

## Review Notes
- The example uses the REST API resources (`aws_api_gateway_*`). HTTP APIs use different `apigatewayv2` resources and slightly different deployment/stage behavior.
- The sample throttling values (`10000` rate and `5000` burst) are valid examples, but AWS applies throttling on a best-effort basis and stage or method limits cannot exceed account-level quotas.
- Hashing full dependent resources in `triggers` is more accurate than hashing only IDs, but the provider documentation notes it can cause an extra difference immediately after the first implementation before stabilizing.
