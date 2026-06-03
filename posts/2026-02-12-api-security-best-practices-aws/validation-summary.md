# Validation Summary: How to Implement API Security Best Practices on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS API Gateway REST APIs
- Amazon Cognito user pools and app clients
- API Gateway Cognito and Lambda authorizers
- API Gateway request validation and JSON Schema models
- API Gateway usage plans, throttling, method settings, and CloudWatch metrics
- AWS WAFv2 web ACLs, managed rule groups, rate-based rules, and API Gateway stage associations
- AWS Lambda proxy responses in Python
- Terraform AWS provider resources
- AWS CloudFormation CloudWatch alarms

## Sources Consulted
- Amazon API Gateway documentation: Use AWS WAF to protect your REST APIs in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-control-access-aws-waf.html
- Amazon API Gateway documentation: Output from an API Gateway Lambda authorizer: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-lambda-authorizer-output.html
- Amazon API Gateway documentation: Request validation for REST APIs in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-request-validation.html
- Amazon API Gateway documentation: Set up basic request validation in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-validation-set-up.html
- Amazon API Gateway documentation: Amazon API Gateway dimensions and metrics: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-metrics-and-dimensions.html
- Amazon API Gateway documentation: Integrate a REST API with an Amazon Cognito user pool: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-enable-cognito-user-pool.html
- Amazon Cognito documentation: Managing user existence error responses: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-managing-errors.html
- Amazon Cognito documentation: Advanced security with threat protection: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-settings-threat-protection.html
- AWS WAF API Reference: AWSManagedRulesBotControlRuleSet: https://docs.aws.amazon.com/waf/latest/APIReference/API_AWSManagedRulesBotControlRuleSet.html
- AWS WAF documentation: AWS WAF Bot Control rule group: https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-bot.html
- Terraform AWS provider documentation: `aws_api_gateway_method`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_method
- Terraform AWS provider documentation: `aws_api_gateway_usage_plan`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_usage_plan
- Terraform AWS provider documentation: `aws_api_gateway_method_settings`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_method_settings
- Terraform AWS provider documentation: `aws_wafv2_web_acl_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl_association

## Issues Found
- The architecture diagram showed `CloudFront + WAF`, but the WAF example associates a Regional WAFv2 web ACL directly with an API Gateway REST API stage. The diagram was changed to `AWS WAF` so it matches the implementation shown.
- The Cognito user pool comment said `user_pool_add_ons` prevented user enumeration. Amazon Cognito controls user-existence error suppression on the user pool app client with `PreventUserExistenceErrors`, while `advanced_security_mode` enables threat protection. The comment was corrected and an `aws_cognito_user_pool_client` with `prevent_user_existence_errors = "ENABLED"` was added.
- The Lambda authorizer admin policy used a broad stage wildcard ARN. It was changed to the documented execute-api ARN shape with method and resource wildcards, and a default explicit deny was added for users without a recognized role.
- The request validation snippet created a model and request validator but did not attach them to an API Gateway method. A `POST` method example was added with `request_validator_id` and `request_models` so validation is actually applied.
- The WAF Bot Control managed rule group omitted the required Bot Control inspection-level configuration. Added `managed_rule_group_configs` with `inspection_level = "COMMON"`.
- The response-security Python snippet used `json.dumps` without importing `json`, referenced an undefined `context`, accepted an unused `message` parameter, and attempted to set a `Server` header while claiming not to expose server information. The snippet now imports `json`, accepts an optional Lambda context, guards access to `context.aws_request_id`, and omits the `Server` header.

## Review Notes
The Python snippets were checked locally with Python AST parsing. Terraform was not installed in the local environment, so Terraform validation was performed against the current Terraform AWS provider reference and AWS service documentation rather than `terraform validate`. The OAuth scope example remains technically valid, but a complete production Cognito setup would also define the corresponding Cognito resource server scopes and app client OAuth settings.
