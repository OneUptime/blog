# Validation Summary: How to Configure TLS 1.3 on AWS Load Balancers

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- AWS Application Load Balancer
- AWS Network Load Balancer
- AWS Elastic Load Balancing security policies
- TLS 1.3
- AWS CLI
- Terraform AWS provider
- OpenSSL
- curl
- Amazon CloudFront
- Amazon CloudWatch
- Amazon Athena / SQL

## Sources Consulted
- AWS Elastic Load Balancing: Security policies for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- AWS Elastic Load Balancing: Security policies for Network Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/describe-ssl-policies.html
- AWS Elastic Load Balancing: Listeners for Network Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-listeners.html
- AWS CLI Command Reference: elbv2 create-listener: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-listener.html
- AWS CLI Command Reference: cloudfront update-distribution: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/cloudfront/update-distribution.html
- AWS CloudFront: Distribution settings and viewer TLS policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesGeneral.html
- Terraform Registry: aws_lb_listener resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3: https://www.rfc-editor.org/rfc/rfc8446

## Issues Found
- The post said TLS 1.3 provides zero round trips for resumed connections in this AWS load balancer context. AWS documents that ALB and NLB support TLS 1.3 session resumption, but the 0-RTT data / early_data feature is not implemented. I changed the wording to describe session resumption without claiming 0-RTT support for ALB/NLB.
- The policy table and examples treated `ELBSecurityPolicy-TLS13-1-2-2021-06` as the primary recommended policy. Current AWS ELB documentation recommends the post-quantum TLS policy `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09` or its FIPS variant. I updated the recommendation and examples to use `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09`, while keeping the 2021 policy listed as a valid TLS 1.3 option.
- The strict TLS 1.3 example used the older `ELBSecurityPolicy-TLS13-1-3-2021-06` policy. I updated it to the current PQ-TLS strict policy `ELBSecurityPolicy-TLS13-1-3-PQ-2025-09` and kept the older strict policy in the policy table as a valid option.
- The post said `ELBSecurityPolicy-2016-08` was simply the default. AWS now documents different defaults depending on creation method: the console defaults to `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09`, while non-console methods default to `ELBSecurityPolicy-2016-08`. I updated the note to avoid overgeneralizing.
- The post stated that TLS 1.3 only supports three cipher suites. RFC 8446 defines five TLS 1.3 cipher suites, while AWS ELB TLS 1.3 policies commonly expose the three listed suites. I changed the section to describe AWS ELB policy behavior and added the RFC caveat.
- The CloudFront `update-distribution` example supplied only a partial distribution config. AWS CLI documentation states that CloudFront updates replace the full distribution configuration and require the current ETag / `--if-match`. I rewrote the example to fetch the existing config, update `ViewerCertificate.MinimumProtocolVersion` with `jq`, and submit the full updated distribution config with the ETag.

## Review Notes
The AWS CLI commands for ELBv2 listener creation/modification, OpenSSL tests, curl TLS version pinning, Terraform `aws_lb_listener` snippets, ALB access-log Athena query, and CloudWatch `NewConnectionCount` example are technically plausible. The local environment did not have `aws` or `terraform` installed, so CLI and Terraform validation was performed against official documentation rather than local command help.
