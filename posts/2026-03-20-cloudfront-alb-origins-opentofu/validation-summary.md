# Validation Summary: How to Create CloudFront Distributions with ALB Origins in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu HCL
- AWS CloudFront
- AWS Application Load Balancer (ALB)
- AWS WAFv2
- AWS Shield Standard
- AWS Certificate Manager (ACM)

## Sources Consulted
- OpenTofu `init` command docs: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/cli/commands/apply/
- AWS CloudFront custom headers: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/add-origin-custom-headers.html
- AWS CloudFront ALB restriction guide: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/restrict-access-to-load-balancer.html
- AWS CloudFront HTTPS to custom origins: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-https-cloudfront-to-custom-origin.html
- AWS CloudFront managed cache policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- AWS CloudFront managed origin request policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html
- AWS Shield Standard overview: https://docs.aws.amazon.com/waf/latest/developerguide/ddos-standard-summary.html
- AWS provider `aws_cloudfront_distribution` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_distribution.html.markdown
- AWS provider `aws_lb_listener_rule` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb_listener_rule.html.markdown
- AWS provider `aws_wafv2_web_acl_association` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/wafv2_web_acl_association.html.markdown
- AWS provider `aws_cloudfront_cache_policy` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_cache_policy.html.markdown
- AWS provider `aws_cloudfront_origin_request_policy` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_origin_request_policy.html.markdown

## Issues Found
- The post used deprecated CloudFront `forwarded_values` blocks. I replaced them with `aws_cloudfront_cache_policy` and `aws_cloudfront_origin_request_policy` resources because the AWS provider marks `forwarded_values` as deprecated and prefers policies.
- The ALB example said requests without the secret header were blocked, but it only showed an allow rule. I added a catch-all `fixed-response` listener rule that returns `403` so the example actually denies direct requests.
- The WAF example used `aws_wafv2_web_acl_association` with a CloudFront distribution. I replaced that with a `CLOUDFRONT`-scoped `aws_wafv2_web_acl` and associated it through `web_acl_id` on `aws_cloudfront_distribution`, because the AWS provider explicitly says not to use `aws_wafv2_web_acl_association` for CloudFront.
- The original post did not call out the `us-east-1` requirement for CloudFront viewer certificates or CloudFront-scoped WAFv2 resources. I added the certificate note and updated the WAF example to use a `us-east-1` provider alias.

## Review Notes
- The secret-header pattern is valid for ALB origins, but AWS recommends treating both the header name and value as credentials and rotating them periodically.
- For stronger network-layer restriction on a public ALB, AWS also documents limiting the ALB security group with the CloudFront managed prefix list.
