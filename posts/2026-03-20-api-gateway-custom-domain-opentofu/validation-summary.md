# Validation Summary: How to Configure API Gateway Custom Domains with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu CLI
- AWS API Gateway REST APIs
- AWS API Gateway HTTP APIs
- AWS Certificate Manager (ACM)
- Amazon Route 53
- HCL with the AWS provider

## Sources Consulted
- OpenTofu CLI overview: https://opentofu.org/docs/cli/commands/
- OpenTofu `init` documentation: https://opentofu.org/docs/cli/init/
- AWS provider `aws_acm_certificate_validation`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation
- AWS provider `aws_api_gateway_domain_name`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_domain_name
- AWS provider `aws_api_gateway_base_path_mapping`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_base_path_mapping
- AWS provider `aws_apigatewayv2_domain_name`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_domain_name
- AWS provider `aws_apigatewayv2_api_mapping`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api_mapping
- API Gateway Regional custom domains: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-regional-api-custom-domain-create.html
- API mappings for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api-mappings.html
- API mappings for HTTP APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-mappings.html
- Route 53 routing to API Gateway: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-api-gateway.html

## Issues Found
- The HTTP API example omitted the Route 53 alias record required to route the custom domain to the API Gateway v2 regional endpoint. I added `aws_route53_record.api_http` using `domain_name_configuration[0].target_domain_name` and `domain_name_configuration[0].hosted_zone_id`, which matches the AWS provider documentation and AWS Route 53 guidance.
- The HTTP API example could be read as an additional step on top of the REST API domain resources, which would be misleading because it is an alternative configuration path. I clarified in the code comment that the `apigatewayv2` resources should be used instead of the REST API resources above.

## Review Notes
- No other technical issues were found in the ACM validation, REST API custom domain, base path mapping, Route 53 alias, or OpenTofu command examples.
- AWS currently recommends routing rules for REST API custom domains when possible, but API mappings and base path mappings remain supported and technically valid for the versioned path setup shown in this post.
- `tofu` was not installed in the workspace, so local CLI help output was not available; command verification was done against the official OpenTofu documentation instead.
