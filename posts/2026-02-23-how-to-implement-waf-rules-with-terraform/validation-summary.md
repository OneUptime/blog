# Validation Summary: How to Implement WAF Rules with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- AWS WAFv2
- AWS managed rule groups
- AWS WAF rate-based rules
- AWS WAF logging
- Application Load Balancer
- Amazon API Gateway REST APIs
- Amazon CloudFront
- Amazon CloudWatch Logs

## Sources Consulted
- Terraform AWS Provider `aws_wafv2_web_acl` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- Terraform AWS Provider `aws_wafv2_web_acl_association` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl_association
- Terraform AWS Provider `aws_wafv2_web_acl_logging_configuration` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl_logging_configuration
- Terraform AWS Provider `aws_cloudfront_distribution` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- AWS WAF supported resources documentation: https://docs.aws.amazon.com/waf/latest/developerguide/how-aws-waf-works-resources.html
- AWS WAF rate-based rule settings documentation: https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-high-level-settings.html
- AWS API Gateway documentation for using AWS WAF with REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-control-access-aws-waf.html
- AWS WAF managed rule groups documentation: https://docs.aws.amazon.com/waf/latest/developerguide/waf-managed-rule-groups.html
- AWS WAF Bot Control managed rule group documentation: https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-bot.html
- AWS WAF baseline managed rule groups documentation: https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-baseline.html

## Issues Found
- The API Gateway association example used `aws_apigatewayv2_stage.main.arn`. AWS WAF direct association applies to API Gateway REST API stages, and the Terraform `aws_wafv2_web_acl_association` resource documents REST API stages, not API Gateway v2 HTTP/WebSocket stages. Changed the text and example to use `aws_api_gateway_stage.main.arn`.
- The post mentioned CloudFront integration but did not show the Terraform-specific CloudFront association pattern. Added the `web_acl_id = aws_wafv2_web_acl.main.arn` argument inside an `aws_cloudfront_distribution` snippet and noted that CloudFront-scoped WAFv2 Web ACLs must be created through a `us-east-1` provider.
- The Web ACL creation comment said only to use `CLOUDFRONT` for CloudFront distributions. Updated it to include the required `us-east-1` provider caveat.
- The logging section said it logged all WAF decisions, but the example uses a logging filter that keeps only `BLOCK` and `COUNT` actions. Changed the wording to describe configured/filtered WAF logging and corrected the inline comment.

## Review Notes
The remaining Terraform snippets match the documented AWS provider block names and AWS WAF concepts reviewed. Terraform CLI was not installed in the local environment, so the snippets were reviewed against official documentation rather than validated with `terraform validate`.
