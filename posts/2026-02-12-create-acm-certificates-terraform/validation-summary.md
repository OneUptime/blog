# Validation Summary: How to Create ACM Certificates with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Certificate Manager (ACM)
- Terraform AWS Provider
- Amazon Route 53
- Amazon CloudFront
- Elastic Load Balancing / Application Load Balancer
- Amazon CloudWatch
- Amazon API Gateway custom domains

## Sources Consulted
- AWS Certificate Manager DNS validation: https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html
- AWS Certificate Manager DNS renewal validation: https://docs.aws.amazon.com/acm/latest/userguide/dns-renewal-validation.html
- AWS Certificate Manager CloudWatch metrics: https://docs.aws.amazon.com/acm/latest/userguide/cloudwatch-metrics.html
- AWS CloudFront SSL/TLS certificate requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- AWS Elastic Load Balancing ALB certificate documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/https-listener-certificates.html
- AWS Elastic Load Balancing security policies: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- Amazon API Gateway regional custom domain migration documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-regional-api-custom-domain-migrate.html
- Terraform AWS provider aws_acm_certificate documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/acm_certificate.html.markdown
- Terraform AWS provider aws_acm_certificate_validation documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/acm_certificate_validation.html.markdown
- Terraform AWS provider aws_lb_listener documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb_listener.html.markdown

## Issues Found
- Email validation wording was too broad. Changed it to say email validation requires manual approval outside Terraform, matching Terraform AWS provider guidance.
- The wildcard certificate example claimed that keying `for_each` by `dvo.domain_name` deduplicates wildcard/apex validation records. ACM returns the same CNAME for `*.example.com` and `example.com`, so the example now filters to the apex validation option and creates one Route 53 record for the shared validation CNAME.
- The renewal monitoring section omitted that ACM-managed DNS renewal requires the certificate to be in use by an AWS service. Added that condition.
- The wrap-up implied the validation resource has its own ARN. Updated the wording to say the certificate ARN exported by the validation resource should be used to preserve the Terraform dependency.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The snippets were checked against current AWS and Terraform AWS provider documentation instead.
