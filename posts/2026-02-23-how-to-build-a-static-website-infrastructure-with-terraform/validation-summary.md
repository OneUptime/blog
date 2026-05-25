# Validation Summary: How to Build a Static Website Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS S3
- Amazon CloudFront
- AWS Certificate Manager
- Amazon Route 53
- CloudFront Origin Access Control

## Sources Consulted
- Terraform AWS Provider documentation: aws_cloudfront_origin_access_control - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_origin_access_control
- Terraform AWS Provider documentation: aws_cloudfront_distribution - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform AWS Provider documentation: aws_cloudfront_response_headers_policy - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_response_headers_policy
- Terraform AWS Provider documentation: aws_acm_certificate_validation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation
- Terraform AWS Provider documentation: aws_route53_record - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Amazon CloudFront Developer Guide: Restrict access to an Amazon S3 origin - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- Amazon CloudFront Developer Guide: Requirements for using SSL/TLS certificates with CloudFront - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- Amazon CloudFront Developer Guide: Enable IPv6 for CloudFront distributions - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-enable-ipv6.html
- Amazon Route 53 Developer Guide: Routing traffic to an Amazon CloudFront distribution by using your domain name - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-cloudfront-distribution.html

## Issues Found
- The S3 section said to use an Origin Access Identity, but the Terraform snippet correctly used CloudFront Origin Access Control. Updated the prose to say Origin Access Control, which is the current recommended approach for private S3 origins.
- The CloudFront distribution enabled IPv6, but the Route 53 section only created A alias records. Added AAAA alias records for both the apex domain and www subdomain so IPv6 viewer traffic works with the custom domain.

## Review Notes
The Terraform snippets are guide-level examples and assume provider aliases, variables, and AWS credentials are defined elsewhere. The CloudFront security headers policy uses X-XSS-Protection, which CloudFront still supports, although modern browsers mostly ignore that legacy header.
