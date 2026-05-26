# Validation Summary: How to Create CloudFront Distribution with ALB Origin in Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure as Code guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon CloudFront
- AWS Application Load Balancer
- AWS Certificate Manager
- Amazon Route 53
- AWS WAF
- Amazon VPC security groups and AWS-managed prefix lists

## Sources Consulted
- AWS CloudFront Developer Guide: Origin settings, HTTPS origins, origin DNS names, and origin timeout behavior: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html
- AWS CloudFront Developer Guide: Requirements for SSL/TLS certificates with CloudFront: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- AWS CloudFront Developer Guide: Require HTTPS for communication between CloudFront and a custom origin: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-https-cloudfront-to-custom-origin.html
- AWS CloudFront Developer Guide: Managed cache policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- AWS CloudFront Developer Guide: Managed origin request policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html
- AWS CloudFront Developer Guide: Origin request policies and Authorization header cautions: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/add-origin-custom-headers.html
- AWS CloudFront Developer Guide: CloudFront origin-facing managed prefix lists: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/LocationsOfEdgeServers.html
- Terraform AWS Provider documentation: aws_cloudfront_distribution: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform AWS Provider documentation: aws_cloudfront_origin_request_policy: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_origin_request_policy
- Terraform AWS Provider documentation: aws_lb_listener_rule: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_rule
- Terraform AWS Provider documentation: aws_wafv2_web_acl: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl

## Issues Found
- The CloudFront origin used `data.aws_lb.app.dns_name` with `origin_protocol_policy = "https-only"`. CloudFront requires the origin certificate to match the origin domain name, or the forwarded viewer Host header in applicable configurations. An ALB's generated DNS name is not normally covered by an ACM certificate, and some cache behaviors did not forward the viewer Host header. Changed the examples to use `origin.example.com` as the origin domain and added a Route 53 alias record pointing that name to the ALB.
- The static cache behavior attached the managed `Managed-CachingOptimized` cache policy while also setting behavior-level `min_ttl`, `default_ttl`, and `max_ttl`. The managed policy already defines these TTLs, and the behavior-level TTL fields are deprecated in favor of cache policy TTLs. Removed those fields from the behavior and clarified that the managed policy supplies the TTLs.
- The managed prefix list description said it contains all CloudFront edge IP addresses. AWS documents this list as CloudFront origin-facing IP addresses. Updated the wording.
- The custom cache/origin request policy example forwarded all cookies and the `Authorization` header while caching only by selected headers and query strings. That can cause personalized responses to be cached and served to other viewers. Changed the example to avoid forwarding cookies and Authorization for cacheable content.
- The production tip said `origin_read_timeout` can go up to 180 seconds. Current CloudFront and Terraform documentation describes 30 seconds as the default, 60 seconds as available without a quota increase, and higher values as quota-controlled and subject to CloudFront limits. Updated the wording.

## Review Notes
Terraform CLI was not installed in the review environment, so I could not run `terraform validate`. The HCL snippets were reviewed against the current Terraform AWS Provider documentation and AWS CloudFront documentation instead.
