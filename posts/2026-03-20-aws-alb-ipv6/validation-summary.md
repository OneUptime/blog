# Validation Summary: How to Configure AWS ALB with IPv6 (Dualstack)

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS Application Load Balancer (ALB)
- AWS CLI (`elbv2`)
- Amazon Route 53
- Terraform AWS Provider
- IPv6 / dual-stack networking
- `curl`
- `dig`

## Sources Consulted
- AWS Elastic Load Balancing: Update the IP address types for your Application Load Balancer  
  https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-ip-address-type.html
- AWS Elastic Load Balancing: Target groups for your Application Load Balancers  
  https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- AWS CLI: `create-load-balancer`  
  https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-load-balancer.html
- AWS CLI: `set-ip-address-type`  
  https://docs.aws.amazon.com/cli/latest/reference/elbv2/set-ip-address-type.html
- Amazon Route 53: Values specific for simple alias records  
  https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-alias.html
- Amazon Route 53: Choosing between alias and non-alias records  
  https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html
- Amazon Route 53: Routing traffic to an ELB load balancer  
  https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-elb-load-balancer.html
- Elastic Load Balancing: Security policies for your Application Load Balancer  
  https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- curl man page  
  https://curl.se/docs/manpage.html

## Issues Found
- The Route 53 section incorrectly said an `A` alias record to the ALB would automatically create `AAAA` coverage. Route 53 alias records still answer only for the record type you create, so I corrected the comments to require separate `A` and `AAAA` alias records for a custom dual-stack hostname.
- The HTTPS verification command targeted the ALB DNS name directly. With a normal ACM certificate for `www.example.com`, that causes a TLS hostname mismatch. I replaced it with a hostname-based IPv6 test and a `curl --resolve` example that preserves the correct hostname and SNI while forcing a specific ALB IPv6 address.
- The sample AWS identifiers were not realistic in a few places (`subnet-pub-a`, `subnet-pub-b`, and a 9-digit account ID in the ALB ARN). I replaced them with syntactically plausible AWS IDs so the examples better reflect working input formats.
- The create flow did not retain the newly created load balancer ARN for the later verification step. I updated the create example to capture `LoadBalancerArn` directly from the AWS CLI output.

## Review Notes
- The post’s main technical explanation is correct: a dual-stack ALB accepts IPv4 and IPv6 client traffic, and backend target communication depends on the target group's IP address type.
- AWS requires the ALB VPC subnets to have associated IPv6 CIDR blocks before you can use `dualstack`; I added that prerequisite as an inline command comment.
- The TLS policy `ELBSecurityPolicy-TLS13-1-2-2021-06` is current and valid for an Application Load Balancer as of May 7, 2026.
