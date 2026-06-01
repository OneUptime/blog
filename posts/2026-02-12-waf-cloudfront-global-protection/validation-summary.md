# Validation Summary: How to Set Up WAF with CloudFront for Global Protection

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- AWS WAF v2
- Amazon CloudFront
- AWS CLI
- AWS Shield Standard
- Elastic Load Balancing / Application Load Balancer
- Amazon EC2 managed prefix lists
- Amazon CloudWatch metrics
- Amazon Data Firehose WAF logging
- Terraform AWS provider

## Sources Consulted
- AWS WAF Developer Guide: Associating or disassociating a web ACL with an AWS resource - https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-associating-aws-resource.html
- AWS WAF Developer Guide: AWS WAF metrics and dimensions - https://docs.aws.amazon.com/waf/latest/developerguide/waf-metrics.html
- AWS WAF Developer Guide: Logging AWS WAF web ACL traffic to Amazon Data Firehose - https://docs.aws.amazon.com/waf/latest/developerguide/logging-kinesis.html
- AWS CLI Command Reference: wafv2 create-web-acl - https://docs.aws.amazon.com/cli/latest/reference/wafv2/create-web-acl.html
- AWS CLI Command Reference: wafv2 update-web-acl - https://docs.aws.amazon.com/cli/latest/reference/wafv2/update-web-acl.html
- AWS CLI Command Reference: wafv2 put-logging-configuration - https://docs.aws.amazon.com/cli/latest/reference/wafv2/put-logging-configuration.html
- AWS CLI Command Reference: cloudfront get-distribution-config - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/get-distribution-config.html
- AWS CLI Command Reference: cloudfront update-distribution - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/update-distribution.html
- Amazon CloudFront Developer Guide: Use the CloudFront managed prefix list - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/LocationsOfEdgeServers.html
- AWS WAF Pricing - https://aws.amazon.com/waf/pricing/
- Terraform Registry: aws_wafv2_web_acl - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- Terraform Registry: aws_cloudfront_distribution - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution

## Issues Found
- Updated the CloudFront network size from "over 450 edge locations" to "750+ points of presence" to match current AWS wording.
- Corrected the existing CloudFront distribution update workflow. `get-distribution-config` returns both an `ETag` and `DistributionConfig`, while `update-distribution` expects the distribution config document and the ETag via `--if-match`.
- Replaced placeholder WAF Web ACL ARN suffixes with a UUID-shaped example to better match AWS WAF ARN format.
- Added a note that dual-stack ALBs also need the IPv6 CloudFront origin-facing managed prefix list when locking down origin access.
- Corrected the CloudWatch WAF metric query to use the configured Web ACL metric name and omit the `Region` dimension for a CloudFront web ACL metric.

## Review Notes
The AWS CLI and Terraform examples otherwise match current AWS WAF v2, CloudFront, CloudWatch, Firehose logging, and Terraform AWS provider resource structures. The cost section reflects standard AWS WAF pricing categories, but exact monthly totals can vary with request volume and optional intelligent threat mitigation rule groups.
