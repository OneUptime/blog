# Validation Summary: How to Configure Route 53 Geolocation Routing Policy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Route 53 geolocation routing
- AWS CLI Route 53 commands
- Route 53 alias records and health checks
- Terraform AWS provider `aws_route53_record`
- EDNS Client Subnet

## Sources Consulted
- Amazon Route 53 API Reference: GeoLocation - https://docs.aws.amazon.com/Route53/latest/APIReference/API_GeoLocation.html
- AWS CLI Command Reference: `route53 change-resource-record-sets` - https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- AWS CLI Command Reference: `route53 test-dns-answer` - https://docs.aws.amazon.com/cli/latest/reference/route53/test-dns-answer.html
- Amazon Route 53 Developer Guide: Values specific for geolocation records - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-geo.html
- Amazon Route 53 Developer Guide: How Amazon Route 53 uses EDNS0 to estimate the location of a user - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-edns0.html
- Terraform Registry: `aws_route53_record` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Google Public DNS: EDNS Client Subnet guidelines - https://developers.google.com/speed/public-dns/docs/ecs
- Cloudflare 1.1.1.1 FAQ - https://developers.cloudflare.com/1.1.1.1/faq/

## Issues Found
- The health-check failover explanation implied that unhealthy geolocation records are simply skipped through to default. AWS documents that Route 53 looks for a healthy record in larger associated geographic regions, but if all applicable records are unhealthy, it still answers with the smallest geographic match. Updated the section to include that edge case.
- The EDNS Client Subnet limitation named Cloudflare as a major public resolver that helps mitigate resolver-location errors with ECS. Cloudflare's 1.1.1.1 FAQ says it does not send the EDNS Client Subnet header. Updated the text to distinguish resolvers that support ECS, such as Google Public DNS, from Cloudflare 1.1.1.1.

## Review Notes
The AWS CLI examples use current Route 53 fields for geolocation record sets, including `SetIdentifier`, `GeoLocation`, alias targets, `TTL`, and `ResourceRecords`. The Terraform examples use current `geolocation_routing_policy` arguments, including `continent`, `country`, and `country = "*"` for the default record.
