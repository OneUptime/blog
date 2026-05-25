# Validation Summary: How to Configure SSL Termination on Load Balancer with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Application Load Balancer
- AWS Certificate Manager
- Amazon Route 53
- TLS / SSL policies
- Server Name Indication

## Sources Consulted
- AWS Elastic Load Balancing: Security policies for your Application Load Balancer, https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- AWS Elastic Load Balancing: Listeners for your Application Load Balancer, https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listeners.html
- AWS Elastic Load Balancing: SSL certificates for your Application Load Balancer, https://docs.aws.amazon.com/elasticloadbalancing/latest/application/https-listener-certificates.html
- AWS Elastic Load Balancing: Target groups for your Application Load Balancer, https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- AWS Elastic Load Balancing: Troubleshoot your Application Load Balancers, https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-troubleshooting.html
- AWS Certificate Manager: AWS Certificate Manager public certificates, https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html
- AWS Certificate Manager: Managed certificate renewal, https://docs.aws.amazon.com/acm/latest/userguide/managed-renewal.html
- Terraform Registry: aws_lb_listener resource, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform Registry: aws_acm_certificate_validation resource, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation
- Terraform Registry: aws_route53_record resource, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record

## Issues Found
- The HTTPS listener example used `ELBSecurityPolicy-TLS13-1-2-2021-06` as the main modern policy. AWS now recommends post-quantum TLS policies for Application Load Balancers, so the example was updated to `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09`.
- The SSL policy examples were slightly outdated. The TLS 1.3-only, TLS 1.2/1.3, and FIPS examples were updated to current AWS policy names that include post-quantum key exchange support.
- The additional certificate example attached `aws_acm_certificate.api.arn` directly to the listener without validating the certificate first. DNS validation records and an `aws_acm_certificate_validation` resource were added, and the listener certificate now references `aws_acm_certificate_validation.api.certificate_arn`.

## Review Notes
The core Terraform resource types, listener configuration, Route 53 alias record, ACM DNS validation pattern, SNI explanation, and optional HTTPS target group pattern are technically correct. The target group example intentionally omits target registration, which is acceptable for a focused SSL termination article but would be needed in a complete deployment.
