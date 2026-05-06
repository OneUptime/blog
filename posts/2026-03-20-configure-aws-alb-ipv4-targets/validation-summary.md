# Validation Summary: How to Configure AWS Application Load Balancer for IPv4 Targets

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS Application Load Balancer (ALB)
- Elastic Load Balancing v2 (ELBv2) AWS CLI
- AWS Certificate Manager (ACM)
- Amazon EC2 target groups
- Amazon S3 access logging for ALB

## Sources Consulted
- AWS CLI `create-target-group`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-target-group.html
- AWS CLI `create-load-balancer`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-load-balancer.html
- AWS CLI `create-listener`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-listener.html
- AWS CLI `create-rule`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-rule.html
- Application Load Balancer overview: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html
- Target groups for your Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- Create an HTTPS listener for your Application Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html
- Security policies for your Application Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- Enable access logs for your Application Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/enable-access-logging.html
- AWS Certificate Manager overview: https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html

## Issues Found
- Several placeholder resource identifiers were not valid AWS-style IDs or ARNs, including subnet IDs, instance IDs, the security group ID, and the ACM certificate ARN account segment. I replaced them with syntactically valid placeholder values so the examples match current AWS identifier formats.
- The EC2 registration example used instance targets while the article focused on IPv4 targets. I clarified the existing comment to note that, for `instance` target groups, ALB routes to the instance's primary private IPv4 address.
- The HTTPS listener example did not note that ACM certificates are regional resources. I updated the certificate comment so it correctly states that the certificate ARN must be from the same Region as the ALB.
- The access log example omitted required prerequisites. I added the missing note that the S3 bucket must be in the same Region and must allow Elastic Load Balancing to write logs via bucket policy.

## Review Notes
- The `/api` target group does not explicitly set `--ip-address-type ipv4`, but this remains technically valid because the current default target group IP address type is IPv4.
- The TLS policy `ELBSecurityPolicy-TLS13-1-2-2021-06` is valid for Application Load Balancer listeners as of May 6, 2026.
