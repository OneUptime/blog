# Validation Summary: How to Configure Latency-Based DNS Routing with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon Route 53
- Route 53 latency-based routing
- Route 53 alias records
- Route 53 health checks
- Route 53 failover routing

## Sources Consulted
- AWS Route 53 Developer Guide: Latency-based routing - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-latency.html
- AWS Route 53 Developer Guide: Values specific for latency records - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-latency.html
- AWS Route 53 Developer Guide: Values specific for latency alias records - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-latency-alias.html
- AWS Route 53 Developer Guide: Values that you specify when you create or update health checks - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-creating-values.html
- AWS Route 53 Developer Guide: Creating and managing traffic policies - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/traffic-policies.html
- Terraform Registry: aws_route53_record resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform Registry: aws_route53_health_check resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check

## Issues Found
- The post said latency-based routing measures actual network latency between the user and each AWS region and always directs users to the fastest endpoint. Updated this to match AWS documentation: Route 53 uses AWS latency data between users and AWS regions, and it helps select the fastest available AWS-region endpoint.
- The routing explanation said Route 53 checks the source IP address. Updated this to mention query origin and EDNS Client Subnet data when provided, which more accurately reflects Route 53's documented behavior.
- The examples used private RFC1918 addresses in public DNS and health-check contexts. Replaced them with documentation-range IPv4 addresses and added a prerequisite note that public hosted zones and standard Route 53 health checks require publicly reachable endpoints.
- The alias target health explanation implied all alias targets are skipped the same way. Reworded it to state that Route 53 considers health for supported alias targets and can route to the next-lowest-latency healthy region in a latency record group.
- The section on combining routing policies described this as "nesting" policies. Reworded it to "combine" policies through alias chains, which better matches Route 53 behavior and documentation.

## Review Notes
The Terraform resource arguments shown for `aws_route53_record`, `latency_routing_policy`, `failover_routing_policy`, `alias`, and `aws_route53_health_check` align with the current HashiCorp AWS provider documentation. The ALB alias examples assume the referenced `aws_lb` resources are defined elsewhere.
