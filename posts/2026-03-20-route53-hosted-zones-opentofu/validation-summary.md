# Validation Summary: How to Manage AWS Route 53 Hosted Zones with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu/Terraform
- Amazon Route 53 hosted zones
- Amazon Route 53 DNS records
- Amazon Route 53 health checks
- DNS subdomain delegation

## Sources Consulted
- OpenTofu provider registry protocol: https://opentofu.org/docs/internals/provider-registry-protocol/
- AWS provider `aws_route53_zone` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_zone
- AWS provider `aws_route53_record` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS provider `aws_route53_health_check` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- Amazon Route 53 AliasTarget API reference: https://docs.aws.amazon.com/Route53/latest/APIReference/API_AliasTarget.html
- Amazon Route 53 private hosted zones documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-private.html
- Amazon Route 53 private hosted zone considerations: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-considerations.html
- Amazon Route 53 DNS routing for a new domain: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring-new-domain.html
- Amazon Route 53 weighted routing documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-weighted.html
- Amazon Route 53 health checks in simple configurations: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-simple-configs.html

## Issues Found
- The health-check example attached a Route 53 health check to an alias record for a load balancer. AWS recommends using alias `evaluate_target_health` for supported AWS alias targets such as ELB/ALB/NLB instead of creating a separate Route 53 health check for the load balancer. I changed the example to a non-alias weighted `CNAME` record with a Route 53 health check.
- The health-check example reused `api.${var.domain_name}`, which conflicted with the later `api.${var.domain_name}` subdomain delegation example if the snippets were combined. I changed the health-check record to `app.${var.domain_name}`.
- The health-check example described a single weighted record as active-active. I changed the comment to describe it as one weighted routing record with a health check.
- The best-practice guidance for `evaluate_target_health` was too broad and implied Route 53 would never return unhealthy endpoints. I narrowed it to supported alias targets and described it as target-health-aware DNS answer selection.
- The split-horizon DNS bullet implied a single Route 53 hosted zone could serve both public and private views. I updated it to state that split-view DNS uses separate public and private hosted zones.
- The health-check best-practice bullet was too broad for alias records to load balancers. I clarified that Route 53 health checks are appropriate for critical non-alias endpoints, while load balancer alias records should use target health evaluation.

## Review Notes
- The Route 53 zone, record, private hosted zone, subdomain delegation, and output examples match current AWS provider resource schemas.
- Private hosted zones also require the associated VPC to have DNS support and DNS hostnames enabled for expected resolution behavior.
