# Validation Summary: How to Manage AWS ACM Certificates with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Certificate Manager (ACM)
- Terraform AWS provider
- Amazon Route 53
- Amazon CloudFront
- Elastic Load Balancing / Application Load Balancer
- Amazon API Gateway custom domains
- Amazon CloudWatch alarms and ACM metrics

## Sources Consulted
- AWS Certificate Manager DNS validation: https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html
- AWS Certificate Manager pricing: https://aws.amazon.com/certificate-manager/pricing/
- AWS Certificate Manager CloudWatch metrics: https://docs.aws.amazon.com/acm/latest/userguide/cloudwatch-metrics.html
- Amazon CloudFront certificate requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- Amazon CloudFront alternate domain names and HTTPS: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-procedures.html
- AWS API Gateway custom domain certificate region guidance: https://www.repost.aws/knowledge-center/custom-domain-name-amazon-api-gateway
- Terraform AWS provider `aws_acm_certificate` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- Terraform AWS provider `aws_acm_certificate_validation` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation
- Terraform AWS provider `aws_route53_record` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS provider `aws_lb_listener` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform `distinct` function documentation: https://developer.hashicorp.com/terraform/language/functions/distinct

## Issues Found
- The post stated that ACM certificates are free without qualification. Updated this to clarify that ACM public certificates for integrated AWS services are available at no additional cost; AWS now charges for exportable public certificates and private CA usage has separate pricing.
- The wildcard certificate section said the existing `for_each` approach handled apex/wildcard validation without duplicate records. ACM returns the same DNS validation CNAME for `example.com` and `*.example.com`, so a `for_each` keyed by domain name can still attempt duplicate Route 53 records. Updated the explanation and changed the multi-domain example to de-duplicate validation record objects with Terraform's `distinct` function.
- The multi-domain Route 53 example created DNS records but did not include an `aws_acm_certificate_validation` resource. Added it so the example actually waits for SAN certificate validation to complete.
- The region guidance said API Gateway always needs the certificate in the same region as the API. Updated this to distinguish regional custom domains, which need a same-region certificate, from edge-optimized REST API custom domains, which need a certificate in `us-east-1`.

## Review Notes
Terraform is not installed in the local workspace, so I could not run `terraform fmt` or `terraform validate` on extracted snippets. The HCL was reviewed manually against the current Terraform AWS provider and Terraform language documentation.
