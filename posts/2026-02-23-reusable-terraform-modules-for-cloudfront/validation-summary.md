# Validation Summary: How to Create Reusable Terraform Modules for CloudFront

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform AWS provider
- Amazon CloudFront
- Amazon S3
- AWS Certificate Manager
- AWS WAFv2

## Sources Consulted
- Terraform AWS provider documentation for `aws_cloudfront_distribution`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform AWS provider documentation for `aws_cloudfront_origin_access_control`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_origin_access_control
- AWS CloudFront documentation for restricting access to an Amazon S3 origin with OAC: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- AWS CloudFront documentation for SSL/TLS certificate requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- AWS CloudFront API documentation for associating a WAF web ACL: https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_AssociateDistributionWebACL.html
- AWS CloudFront documentation for standard access logs: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html
- Terraform language documentation for optional object attributes: https://developer.hashicorp.com/terraform/language/expressions/type-constraints

## Issues Found
- The post listed access logging as a module capability, but the Terraform example did not define a logging variable or `logging_config` block. Added a `logging_config` input and a dynamic `logging_config` block using the Terraform AWS provider's CloudFront distribution schema.
- The WAF input was described as a web ACL ID. For current WAFv2 CloudFront associations, AWS expects the web ACL ARN, even though the Terraform CloudFront argument is named `web_acl_id`. Renamed the module variable to `web_acl_arn`, updated the description, and kept the resource argument as `web_acl_id = var.web_acl_arn`.

## Review Notes
Terraform was not installed in the workspace, so `terraform validate` could not be run locally. The snippets were reviewed against the current official Terraform AWS provider documentation and AWS CloudFront documentation. The `logging_config` block configures CloudFront standard logging through the Terraform provider's supported legacy S3 logging fields; S3 bucket ACL requirements for CloudFront log delivery still need to be handled by the caller.
