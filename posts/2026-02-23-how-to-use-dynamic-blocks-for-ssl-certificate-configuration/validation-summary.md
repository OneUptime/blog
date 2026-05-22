# Validation Summary: How to Use Dynamic Blocks for SSL Certificate Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Certificate Manager (ACM)
- Amazon Route 53
- Elastic Load Balancing / Application Load Balancer
- Amazon CloudFront
- Amazon CloudWatch

## Sources Consulted
- Terraform AWS Provider documentation for `aws_acm_certificate`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- Terraform AWS Provider documentation for `aws_acm_certificate_validation`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation
- Terraform AWS Provider documentation for `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS Provider documentation for `aws_lb_listener`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform AWS Provider documentation for `aws_lb_listener_certificate`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_certificate
- Terraform AWS Provider documentation for `aws_cloudfront_distribution`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform AWS Provider documentation for `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS Certificate Manager CloudWatch metrics documentation: https://docs.aws.amazon.com/acm/latest/userguide/cloudwatch-metrics.html
- AWS Application Load Balancer SSL policy documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- AWS CloudFront viewer certificate documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-distribution-viewercertificate.html
- AWS CloudFront managed cache policy documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- AWS CloudFront managed origin request policy documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html

## Issues Found
- The post described the Terraform examples as using dynamic blocks, but the examples use `for_each` expressions, for-expressions, and dynamic resource generation rather than Terraform `dynamic` nested blocks. Updated the title, tags, description, introduction, and ACM section wording to describe `for_each` accurately.
- The CloudFront example used the deprecated `forwarded_values` block. Replaced it with the current `cache_policy_id` and `origin_request_policy_id` arguments using AWS-managed policy IDs for `Managed-CachingDisabled` and `Managed-AllViewer`.

## Review Notes
- Terraform was not installed in the local environment, so validation was performed by comparing the snippets against current official Terraform AWS Provider and AWS service documentation.
- The CloudFront certificate guidance is correct that ACM certificates for CloudFront must be in `us-east-1`.
- The ACM `DaysToExpiry` CloudWatch metric is valid and uses the `CertificateArn` dimension, but ACM publishes this metric twice per day; alarm timing should account for that cadence.
