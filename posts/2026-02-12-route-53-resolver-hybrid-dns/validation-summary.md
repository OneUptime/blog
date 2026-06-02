# Validation Summary: How to Set Up Route 53 Resolver for Hybrid DNS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Route 53 Resolver
- Route 53 Resolver inbound and outbound endpoints
- Route 53 Resolver rules
- Amazon VPC DNS
- AWS CLI
- EC2 security groups
- BIND DNS forwarding
- Windows DNS Server conditional forwarders
- Route 53 Resolver query logging

## Sources Consulted
- AWS Route 53 Resolver endpoint CLI reference: https://awscli.amazonaws.com/v2/documentation/api/2.22.8/reference/route53resolver/create-resolver-endpoint.html
- AWS Route 53 Resolver rule CLI reference: https://docs.aws.amazon.com/cli/latest/reference/route53resolver/create-resolver-rule.html
- AWS Route 53 Resolver outbound endpoint documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-overview-forward-vpc-to-network.html
- AWS Route 53 Resolver endpoint considerations: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-choose-vpc.html
- AWS Route 53 Resolver endpoint security group recommendations: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/best-practices-resolver-endpoint-scaling.html
- AWS Route 53 Resolver query logging documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs.html
- AWS CLI create-resolver-query-log-config reference: https://docs.aws.amazon.com/cli/latest/reference/route53resolver/create-resolver-query-log-config.html
- AWS CLI associate-resolver-query-log-config reference: https://docs.aws.amazon.com/cli/latest/reference/route53resolver/associate-resolver-query-log-config.html
- Amazon VPC DNS attributes documentation: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-dns.html
- Amazon EC2 hostname types documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/hostname-types.html
- Amazon Route 53 pricing: https://aws.amazon.com/route53/pricing/
- Microsoft Add-DnsServerConditionalForwarderZone reference: https://learn.microsoft.com/en-us/powershell/module/dnsserver/add-dnsserverconditionalforwarderzone
- BIND 9 configuration reference: https://bind9.readthedocs.io/en/v9.20.2/reference.html

## Issues Found
- The security group example only added ingress rules. AWS documents that outbound Resolver endpoints need egress rules allowing TCP and UDP access to the DNS port used by the target network, so an explicit outbound DNS rule to the on-premises CIDR was added.
- The BIND forwarding example used `us-east-1.compute.internal`, but AWS EC2 private DNS names in `us-east-1` use the `ec2.internal` suffix. The forwarded zone was changed to `ec2.internal`.
- The Resolver query logging section created a query log configuration but did not associate it with a VPC. AWS requires `AssociateResolverQueryLogConfig` for the VPCs to be logged, so an association command was added.
- The CloudWatch Logs destination ARN for Resolver query logging was updated to include the trailing `:*` form shown in the AWS CLI reference examples for log group destinations.

## Review Notes
The AWS CLI command shapes, Route 53 Resolver inbound/outbound endpoint explanations, resolver rule flow, BIND forward zone syntax, Windows DNS conditional forwarder syntax, and Route 53 Resolver pricing figures were otherwise consistent with current official documentation as of 2026-06-02.
