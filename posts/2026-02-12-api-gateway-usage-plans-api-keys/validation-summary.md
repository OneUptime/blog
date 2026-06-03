# Validation Summary: How to Set Up API Gateway Usage Plans and API Keys

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS API Gateway REST APIs
- API Gateway usage plans
- API Gateway API keys
- AWS CLI
- AWS CloudFormation
- Python
- boto3

## Sources Consulted
- AWS API Gateway Developer Guide: Usage plans and API keys for REST APIs in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html
- AWS API Gateway Developer Guide: Set up usage plans for REST APIs in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-usage-plans.html
- AWS API Gateway Developer Guide: Choose an API key source in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-key-source.html
- AWS CLI Command Reference: apigateway update-method: https://docs.aws.amazon.com/cli/latest/reference/apigateway/update-method.html
- AWS CLI Command Reference: apigateway create-api-key: https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-api-key.html
- AWS CLI Command Reference: apigateway create-usage-plan: https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-usage-plan.html
- AWS CLI Command Reference: apigateway create-usage-plan-key: https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-usage-plan-key.html
- AWS CLI Command Reference: apigateway get-usage: https://docs.aws.amazon.com/cli/latest/reference/apigateway/get-usage.html
- AWS CloudFormation Template Reference: AWS::ApiGateway::Method: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigateway-method.html
- AWS CloudFormation Template Reference: AWS::ApiGateway::UsagePlan: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigateway-usageplan.html
- AWS CloudFormation Template Reference: AWS::ApiGateway::ApiKey: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigateway-apikey.html
- AWS CloudFormation Template Reference: AWS::ApiGateway::UsagePlanKey: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigateway-usageplankey.html
- boto3 API Reference: APIGateway.Client.get_usage: https://docs.aws.amazon.com/boto3/latest/reference/services/apigateway/client/get_usage.html

## Issues Found
- The custom API key example used hyphens in the key value, but API Gateway API key values must be alphanumeric and 20-128 characters long. Changed the example value to an alphanumeric value.
- The throttle explanation described `burstLimit` as a maximum concurrent request count. AWS describes it as a target burst request rate, so the wording was corrected.
- The CloudFormation example used `AWS::ApiGateway::ApiKey` `StageKeys`, which AWS marks as deprecated for usage plans, and referenced an undefined `ProdStage` dependency. Removed `StageKeys`, removed the undefined dependencies, and clarified that the excerpt assumes the `prod` stage already exists.
- The boto3 dashboard example summed `get_usage()["items"].values()` incorrectly. The API returns a map from API key value to daily `[used quota, remaining quota]` entries, so the code now extracts the daily entries before summing used quota.
- The client-side usage section said API Gateway can accept API keys as query parameters. Current REST API key sources are `HEADER` or `AUTHORIZER`, so the text now mentions Lambda authorizer as the alternate source.
- The conclusion implied hard enforcement for usage plans. AWS documents throttling and quotas as best-effort targets and warns not to rely on them for cost control, so the conclusion now reflects that caveat.

## Review Notes
The post focuses on REST API usage plans. API Gateway HTTP APIs use a different feature set and are not covered by these examples.
