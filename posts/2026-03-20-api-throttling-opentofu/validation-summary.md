# Validation Summary: How to Configure API Throttling with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- AWS API Gateway (REST APIs and HTTP APIs)
- AWS WAF
- Amazon CloudWatch
- Azure API Management

## Sources Consulted
- Terraform Registry: `aws_apigatewayv2_stage` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_stage
- Terraform Registry: `aws_api_gateway_method_settings` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_method_settings
- Terraform Registry: `aws_api_gateway_usage_plan` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_usage_plan
- Terraform Registry: `aws_api_gateway_stage` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_stage
- AWS API Gateway: HTTP API throttling - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html
- AWS API Gateway: HTTP API CloudWatch metrics - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-metrics.html
- AWS API Gateway: REST API CloudWatch metrics and dimensions - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-metrics-and-dimensions.html
- AWS API Gateway: Use AWS WAF to protect REST APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-control-access-aws-waf.html
- AWS CLI: `wafv2 associate-web-acl` - https://docs.aws.amazon.com/cli/latest/reference/wafv2/associate-web-acl.html
- Azure API Management: `rate-limit` policy - https://learn.microsoft.com/en-us/azure/api-management/rate-limit-policy
- Azure API Management: `rate-limit-by-key` policy - https://learn.microsoft.com/en-us/azure/api-management/rate-limit-by-key-policy
- Azure API Management: `quota` policy - https://learn.microsoft.com/en-us/azure/api-management/quota-policy
- Azure API Management: `quota-by-key` policy - https://learn.microsoft.com/en-us/azure/api-management/quota-by-key-policy
- Azure API Management: policy expressions - https://learn.microsoft.com/en-us/azure/api-management/api-management-policy-expressions
- Google Cloud API Gateway: quotas overview - https://cloud.google.com/api-gateway/docs/quotas-overview

## Issues Found
- The post claimed GCP coverage in the tags, description, and introduction, but the body contained no GCP implementation or OpenTofu configuration. I removed the GCP references so the published scope matches the actual content.
- The AWS WAF example created a Web ACL but did not attach it to a protected resource. I added an `aws_wafv2_web_acl_association` resource so the rate-based rule is enforced on the REST API stage.
- The Azure API Management example used `rate-limit` with an incomplete `<api>` child element and used `quota` at API scope, even though `quota` is product-scope only. I replaced those with API-scope-valid `rate-limit` and `quota-by-key` policies, moved `<base />` to the start of the `inbound` section, and guarded the subscription-based quota counter so it does not fail on non-subscription traffic.
- The REST method settings example enabled caching without enabling a stage cache cluster. I removed the cache-only fields because that snippet is about throttling, not API caching.
- The CloudWatch section mixed HTTP API and REST API metrics. I changed the HTTP API alarm to use the `4xx` metric with `ApiId` and `Stage`, changed the REST request-volume example to use the REST `Count` metric with `SampleCount` and REST dimensions, and updated the prose so it no longer implies API Gateway exposes a dedicated native throttling metric.

## Review Notes
- `rate-limit-by-key` and `quota-by-key` have Azure API Management tier limitations and are not available in every APIM tier.
- API Gateway throttling is best-effort. For throttling-specific alerting, access-log-derived `429` metrics are more precise than generic `4xx` alarms.
