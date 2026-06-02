# Validation Summary: How to Configure Route 53 Resolver Endpoints for On-Premises DNS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Route 53 Resolver endpoints
- Route 53 Resolver inbound and outbound endpoints
- Route 53 Resolver forwarding rules
- AWS CLI
- Amazon VPC DNS / AmazonProvidedDNS
- AWS Resource Access Manager (AWS RAM)
- Amazon CloudWatch Logs
- Windows DNS Server conditional forwarders
- BIND DNS forward zones

## Sources Consulted
- AWS CLI Command Reference: create-resolver-endpoint - https://docs.aws.amazon.com/cli/latest/reference/route53resolver/create-resolver-endpoint.html
- AWS CLI Command Reference: create-resolver-rule - https://docs.aws.amazon.com/cli/latest/reference/route53resolver/create-resolver-rule.html
- AWS CLI Command Reference: create-resolver-query-log-config - https://docs.aws.amazon.com/cli/latest/reference/route53resolver/create-resolver-query-log-config.html
- AWS CLI Command Reference: associate-resolver-query-log-config - https://docs.aws.amazon.com/cli/latest/reference/route53resolver/associate-resolver-query-log-config.html
- AWS CLI Command Reference: create-resource-share - https://docs.aws.amazon.com/cli/latest/reference/ram/create-resource-share.html
- Amazon Route 53 Developer Guide: What is Route 53 VPC Resolver? - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver.html
- Amazon VPC User Guide: Understanding Amazon DNS - https://docs.aws.amazon.com/vpc/latest/userguide/AmazonDNS-concepts.html
- Amazon Route 53 Developer Guide: Managing forwarding rules - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-rules-managing.html
- Amazon Route 53 Developer Guide: Resolver query logging - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs.html
- Amazon Route 53 Developer Guide: Quotas on Route 53 VPC Resolver - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/DNSLimitations.html

## Issues Found
- The VPC resolver description said it only handles public domains and private hosted zones. Updated it to include Amazon VPC-specific DNS names and the `169.254.169.253` resolver address, matching AWS documentation.
- The security group planning text implied only inbound CIDR-based DNS rules. Updated it to distinguish inbound endpoint ingress from outbound endpoint egress, while noting the sample relies on the default allow-all egress rule.
- The reverse DNS rule was described as covering on-premises IP ranges while `16.172.in-addr.arpa` only covers the `172.16.0.0/16` reverse zone. Updated the comment and added a note to create equivalent reverse rules for `172.16.0.0/12`.
- The validation test used `dig +trace`, which bypasses normal recursive forwarding behavior and is not a good way to verify Route 53 Resolver forwarding rules. Replaced it with a normal `dig` query.
- The AWS RAM example used non-12-digit account IDs and an explicit permission ARN that was not verified as a current managed permission name. Updated the ARNs to use 12-digit account IDs and removed the explicit permission ARN so AWS RAM uses the default permission for the resource type.
- The query logging example created a Resolver query log configuration but did not associate it with a VPC. Added `associate-resolver-query-log-config`, which AWS documents as required to log queries for a VPC.

## Review Notes
The AWS CLI was not installed in the local environment, so command verification was performed against the current official AWS CLI documentation instead of local `aws --help` output. The examples remain placeholders and require replacing sample VPC, subnet, security group, resolver endpoint, rule, account, and query log configuration IDs before use.
