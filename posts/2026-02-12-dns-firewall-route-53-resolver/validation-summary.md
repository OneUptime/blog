# Validation Summary: How to Use DNS Firewall with Route 53 Resolver

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Route 53 Resolver
- Route 53 Resolver DNS Firewall
- AWS CLI
- Terraform
- HashiCorp AWS Provider
- Amazon VPC
- Amazon CloudWatch Logs
- Amazon CloudWatch alarms
- Amazon S3
- Amazon Kinesis Data Firehose

## Sources Consulted
- AWS Route 53 Resolver DNS Firewall overview: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-overview.html
- AWS Route 53 Resolver DNS Firewall domain lists documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-domain-lists.html
- AWS Route 53 Resolver DNS Firewall rule actions documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-rule-actions.html
- AWS Route 53 Resolver DNS Firewall VPC configuration documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-vpc-configuration.html
- AWS CLI create-firewall-rule command reference: https://docs.aws.amazon.com/cli/latest/reference/route53resolver/create-firewall-rule.html
- AWS CLI update-firewall-domains command reference: https://docs.aws.amazon.com/cli/latest/reference/route53resolver/update-firewall-domains.html
- AWS CLI import-firewall-domains command reference: https://docs.aws.amazon.com/cli/latest/reference/route53resolver/import-firewall-domains.html
- AWS CLI create-resolver-query-log-config command reference: https://docs.aws.amazon.com/cli/latest/reference/route53resolver/create-resolver-query-log-config.html
- AWS Route 53 Resolver query logging documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs.html
- AWS Route 53 Resolver query log format documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs-format.html
- Terraform AWS Provider aws_route53_resolver_firewall_domain_list documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_firewall_domain_list
- Terraform AWS Provider aws_route53_resolver_firewall_rule documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_firewall_rule
- Terraform AWS Provider aws_route53_resolver_firewall_rule_group documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_firewall_rule_group
- Terraform AWS Provider aws_route53_resolver_firewall_rule_group_association documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_firewall_rule_group_association

## Issues Found
- The Mermaid diagram showed Route 53 Resolver before DNS Firewall, while AWS describes DNS Firewall as evaluating queries associated with the VPC Resolver before normal resolution proceeds. Updated the diagram so DNS Firewall evaluates the query and passes allowed or alerting queries to Route 53 Resolver.
- The post described `OVERRIDE` block responses as returning a custom IP. AWS documents DNS Firewall override responses as custom DNS records whose record type must be `CNAME`. Updated the text to say custom CNAME response.
- The CloudWatch Logs destination ARN example omitted the documented `:*` suffix for a CloudWatch Logs log group ARN in `create-resolver-query-log-config`. Updated the ARN to `arn:aws:logs:us-east-1:111111111111:log-group:/aws/route53/dns-firewall:*`.
- The fail-open section stated that DNS Firewall fails open by default and showed `--firewall-fail-open DISABLED` as setting fail-close mode. AWS documents the default as fail open disabled, meaning fail closed. Updated the explanation and command to show enabling fail-open mode with `--firewall-fail-open ENABLED`.

## Review Notes
The AWS CLI and Terraform binaries are not installed in this environment, so I could not run local command help or `terraform validate`. I verified the CLI flags, DNS Firewall behavior, query log fields, and Terraform resource arguments against official AWS and HashiCorp documentation. The sample AWS-managed domain list IDs remain placeholders where the post already shows how to discover managed list IDs with `list-firewall-domain-lists`.
