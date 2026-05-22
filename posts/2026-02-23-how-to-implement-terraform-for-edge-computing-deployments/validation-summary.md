# Validation Summary: How to Implement Terraform for Edge Computing Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- AWS CloudFront
- Lambda@Edge
- CloudFront cache policies
- AWS IoT Core things, thing groups, and IoT policies
- Amazon CloudWatch metric alarms

## Sources Consulted
- Terraform AWS provider `aws_cloudfront_distribution` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform AWS provider `aws_cloudfront_cache_policy` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_cache_policy
- Terraform AWS provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS CloudFront Lambda@Edge restrictions: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-at-edge-function-restrictions.html
- AWS CloudFront Lambda@Edge IAM permissions: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-edge-permissions.html
- AWS CloudFront metrics documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/programming-cloudwatch-metrics.html
- AWS CloudFront and edge function metrics documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/viewing-cloudfront-metrics.html
- AWS IoT Core action resources: https://docs.aws.amazon.com/iot/latest/developerguide/iot-action-resources.html
- AWS IoT Core publish/subscribe policy examples: https://docs.aws.amazon.com/iot/latest/developerguide/pub-sub-policy.html

## Issues Found
- The CloudFront distribution examples used the deprecated `forwarded_values` block. I replaced those blocks with `cache_policy_id` references to the cache policies already shown in the post.
- The static cache behavior duplicated TTL settings that are now defined in the `aws_cloudfront_cache_policy.static` resource. I removed the cache behavior TTL values so the cache policy is the single source of truth.
- The AWS IoT policy used a `topic` ARN for `iot:Subscribe`. AWS IoT Core requires `topicfilter` ARNs for `iot:Subscribe`, while `iot:Publish` and `iot:Receive` use `topic` ARNs. I split `iot:Subscribe` into a separate statement with a `topicfilter` resource.
- The OriginLatency alarm used `statistic = "p90"`. Terraform and CloudWatch require percentile statistics to use `extended_statistic`, so I changed it to `extended_statistic = "p90"`.
- The OriginLatency CloudFront alarm did not specify the `us-east-1` provider alias. CloudFront metrics must be retrieved from US East (N. Virginia), so I added `provider = aws.us_east_1`.
- The first monitoring alarm was named as if it measured Lambda@Edge function errors, but it actually alarms on the CloudFront distribution `5xxErrorRate` metric. I renamed the Terraform resource and alarm to describe CloudFront 5xx errors accurately.

## Review Notes
The Lambda@Edge snippets correctly publish numbered Lambda versions and use the `us-east-1` provider alias. The examples still assume supporting resources such as the ALB, ACM certificate, IAM role trust policy, SNS topic, provider aliases, and packaged ZIP files exist elsewhere in the Terraform project.
