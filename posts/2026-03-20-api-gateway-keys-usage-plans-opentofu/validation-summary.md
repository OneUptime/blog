# Validation Summary: How to Configure API Gateway Keys and Usage Plans with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS API Gateway REST APIs
- AWS API Gateway usage plans
- AWS API keys
- HCL

## Sources Consulted
- OpenTofu `tofu output` command: https://opentofu.org/docs/cli/commands/output/
- AWS API Gateway usage plans and API keys: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html
- AWS API Gateway API key setup: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-setup-api-keys.html
- AWS API Gateway API key source: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-key-source.html
- AWS API Gateway deployment and stages: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-deploy-api.html
- Terraform Registry `aws_api_gateway_api_key`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_api_key
- Terraform Registry `aws_api_gateway_deployment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_deployment
- Terraform Registry `aws_api_gateway_method`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_method
- Terraform Registry `aws_api_gateway_stage`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_stage
- Terraform Registry `aws_api_gateway_usage_plan`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_usage_plan
- Terraform Registry `aws_api_gateway_usage_plan_key`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_usage_plan_key

## Issues Found
- The post described API keys and usage plans as access control. AWS documents them as usage-metering and throttling features and explicitly advises not to use API keys for authentication or authorization. I updated the description, introduction, and summary to describe requiring a valid key on selected methods without implying they are an auth mechanism.
- The `aws_api_gateway_deployment` block depended on `aws_api_gateway_integration.root`, which was not defined anywhere in the post. I replaced that reference with a dependency on the method resource used later in the article so the combined configuration is internally consistent.
- The method example referenced `aws_api_gateway_resource.items.id`, but the `/items` resource was never defined. I added the missing `aws_api_gateway_resource` block.
- The `burst_limit` comment called the setting “peak concurrent requests,” which is not how API Gateway documents the field. I changed the comment to describe it as a short-window burst limit.
- The post told readers to run `tofu output client_a_key` after marking the output as sensitive. OpenTofu redacts sensitive outputs in that form. I changed the command to `tofu output -raw client_a_key`, which prints the string value.

## Review Notes
- API Gateway deployments are snapshots. If readers later change methods or integrations after the initial apply, they must ensure a new deployment is created for the stage to pick up those changes.
- AWS documents usage plan throttling and quotas as best-effort rather than hard enforcement. That caveat could be added in a future revision if the post is expanded.
