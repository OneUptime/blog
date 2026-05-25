# Validation Summary: How to Configure Route53 Resolver with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon Route 53 Resolver
- Route 53 Resolver query logging
- Route 53 Resolver DNS Firewall
- Route 53 Resolver endpoints and forwarding rules
- Route 53 Resolver DNSSEC validation
- Amazon CloudWatch metrics and alarms
- Amazon S3
- Amazon VPC

## Sources Consulted
- AWS Route 53 Resolver query logging documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs.html
- AWS Route 53 VPC Resolver availability and scaling documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-availability-scaling.html
- AWS Route 53 Resolver DNS Firewall managed domain lists documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-managed-domain-lists.html
- AWS Route 53 Resolver DNS Firewall domain lists documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-domain-lists.html
- AWS Route 53 Resolver DNS Firewall CloudWatch metrics documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/monitoring-resolver-dns-firewall-with-cloudwatch.html
- AWS CLI v2 route53resolver list-firewall-domain-lists documentation: https://docs.aws.amazon.com/cli/latest/reference/route53resolver/list-firewall-domain-lists.html
- Terraform AWS Provider aws_route53_resolver_endpoint documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_endpoint
- Terraform AWS Provider aws_route53_resolver_firewall_rule documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_firewall_rule
- Terraform AWS Provider aws_route53_resolver_firewall_rule_group_association documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_firewall_rule_group_association
- Terraform AWS Provider aws_route53_resolver_dnssec_config documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_dnssec_config

## Issues Found
- The post said query logging captures every DNS query made within a VPC. AWS documents that Resolver query logging logs unique queries that Resolver processes and does not log repeat queries answered from the Resolver cache. Updated the wording to reflect that cache behavior.
- The managed DNS Firewall domain list example used a hard-coded ID, `rslvr-fdl-managed-malware`, which is not a documented stable managed domain list ID. Replaced it with guidance to look up the region-specific managed list ID with `aws route53resolver list-firewall-domain-lists`.
- Multiple DNS Firewall rules reused the same domain list with different actions. In practice, the earlier matching rule would take effect first, so the later custom-response and alert examples would not behave as described for those domains. Added separate custom-blocked and suspicious domain lists and pointed those rules at them.
- The CloudWatch alarm used `FirewallRuleGroupQueryBlock`, which is not listed in the official Route 53 Resolver DNS Firewall metric documentation. Changed it to the documented `FirewallRuleGroupQueryVolume` metric and updated the alarm name and description to match what the metric measures.

## Review Notes
Terraform is not installed in this environment, so I could not run `terraform validate`. The review checked HCL resource names, arguments, and technical claims against AWS and Terraform provider documentation. The S3 query logging example remains intentionally minimal; production deployments may also add bucket security controls such as encryption, lifecycle rules, and public access blocking.
