# Validation Summary: How to Use Host-Based Routing with Application Load Balancer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Application Load Balancer
- Elastic Load Balancing listener rules
- AWS CLI
- Amazon Route 53 alias records
- AWS Certificate Manager
- Terraform AWS provider
- TLS/SNI

## Sources Consulted
- AWS Elastic Load Balancing: Condition types for listener rules: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-condition-types.html
- AWS Elastic Load Balancing: Quotas for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-limits.html
- AWS CLI Command Reference: elbv2 create-rule: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-rule.html
- AWS CLI Command Reference: route53 change-resource-record-sets: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- AWS General Reference: Elastic Load Balancing endpoints and Route 53 hosted zone IDs: https://docs.aws.amazon.com/general/latest/gr/elb.html
- AWS Elastic Load Balancing: SSL certificates for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/https-listener-certificates.html
- AWS Certificate Manager: Request a public certificate: https://docs.aws.amazon.com/acm/latest/userguide/acm-public-certificates.html
- AWS CLI Command Reference: acm request-certificate: https://docs.aws.amazon.com/cli/latest/reference/acm/request-certificate.html
- AWS Elastic Load Balancing: Security policies for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- AWS Elastic Load Balancing: CloudWatch metrics for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- AWS Elastic Load Balancing: Access logs for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html
- Terraform AWS provider: aws_lb_listener_rule: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_rule

## Issues Found
- The ACM wildcard certificate comment said it covered "all subdomains." AWS wildcard certificates protect only one subdomain level, so the comment was changed to "the apex domain and first-level subdomains."
- The wildcard host rule used `*.api.example.com` while the explanation referenced tenants under `app.example.com`. The rule was changed to `*.app.example.com` and forwarded to `$APP_TG` so the example matches the stated tenant hostnames.
- The Terraform section called the snippet a "complete" setup even though it omits referenced resources such as target groups, certificates, subnets, and security groups. The wording was changed to describe it as the listener and host-routing setup.
- The monitoring guidance said to track request metrics per host. ALB CloudWatch metric dimensions do not provide a host-header dimension, so the guidance was changed to use access logs and per-target-group metrics.
- The rule limits listed "Maximum 5 conditions per rule." AWS documents this as 5 match evaluations per rule and 6 wildcard characters per rule, with specific condition-type constraints. The limits were corrected.

## Review Notes
The AWS CLI examples use current ELBv2 condition/action field names, valid redirect and fixed-response action syntax, and valid host-header/path-pattern/source-ip condition structures. The Route 53 alias hosted zone ID shown is valid for Application Load Balancers in us-east-1, but readers deploying in other regions must use that region's ELB hosted zone ID.
