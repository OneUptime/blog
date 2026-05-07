# Validation Summary: How to Configure AWS Route 53 for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon Route 53
- AWS CLI
- Terraform AWS Provider
- DNS
- IPv6
- AAAA records
- Route 53 alias records
- Elastic Load Balancing (ALB/NLB)
- `dig`

## Sources Consulted
- Amazon Route 53 Developer Guide, Supported DNS record types: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html
- AWS CLI Command Reference, `change-resource-record-sets`: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- AWS CLI Command Reference, `list-resource-record-sets`: https://docs.aws.amazon.com/cli/latest/reference/route53/list-resource-record-sets.html
- Amazon Route 53 Developer Guide, Values that you specify when you create or update health checks: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-creating-values.html
- AWS CLI Command Reference, `create-health-check`: https://docs.aws.amazon.com/cli/latest/reference/route53/create-health-check.html
- Amazon Route 53 Developer Guide, Values that are common for alias records for all routing policies: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-alias-common.html
- Amazon Route 53 Developer Guide, Routing traffic to an ELB load balancer: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-elb-load-balancer.html
- Terraform Registry, `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform Registry, `aws_route53_health_check`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- Terraform Registry, `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform Registry, `aws_lb`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- BIND 9 manual, `dig - DNS lookup utility`: https://bind9.readthedocs.io/en/v9.18.2/manpages.html
- RFC 1035, Domain names - implementation and specification: https://www.rfc-editor.org/rfc/rfc1035
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 5156, Special-Use IPv6 Addresses: https://www.rfc-editor.org/rfc/rfc5156.html

## Issues Found
- The CLI examples used `ZONE_ID="/hostedzone/..."`. AWS CLI Route 53 examples and option docs use the hosted zone ID itself, such as `Z...`, for `--hosted-zone-id`. I changed the example to `ZONE_ID="ZABCDEFGHIJKLMN"` to match current Route 53 CLI usage.
- The introduction overstated IPv6 health-check behavior. AWS documents that domain-name-based Route 53 health checks use only IPv4, while IPv6 health checks require specifying the endpoint by IPv6 address. I corrected the explanation to reflect that limitation.
- The Terraform health check example used the documentation prefix `2001:db8::1` as the actual `ip_address`. Route 53 health checks cannot probe special-use or non-routable IPv6 ranges, and `2001:db8::/32` is reserved for documentation. I changed the example to use `aws_instance.web.ipv6_addresses[0]` and aligned the `fqdn`/tag with that example endpoint.
- The verification section suggested `dig www.example.com A AAAA` to check both record types in one query. DNS questions carry a single QTYPE, and `dig` expects one query type per lookup. I replaced that with separate `dig A ...` and `dig AAAA ...` commands.

## Review Notes
- The remaining AAAA record examples intentionally use `2001:db8::/32`, which is the RFC 3849 documentation prefix. That is appropriate for sample DNS records in documentation, but readers must replace those values with real routable IPv6 addresses in production.
- CloudFront AAAA alias records are valid only when IPv6 is enabled on the distribution. The post's conclusion is acceptable after correction because it already scopes alias behavior to the target resource's configuration.
- AWS currently documents Route 53 HTTPS health checks as requiring the endpoint to support TLS v1.0, v1.1, or v1.2. If AWS updates that requirement later, this post should be rechecked.
