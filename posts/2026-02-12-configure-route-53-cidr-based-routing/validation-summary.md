# Validation Summary: How to Configure Route 53 CIDR-Based Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Route 53
- Route 53 IP-based routing / CIDR collections
- AWS CLI
- Terraform AWS Provider
- Route 53 health checks
- Amazon CloudWatch metrics
- EDNS Client Subnet

## Sources Consulted
- AWS Route 53 Developer Guide: IP-based routing: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-ipbased.html
- AWS Route 53 Developer Guide: Creating a CIDR collection with CIDR locations and blocks: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating-cidr-collection.html
- AWS Route 53 API Reference: CidrRoutingConfig: https://docs.aws.amazon.com/Route53/latest/APIReference/API_CidrRoutingConfig.html
- AWS CLI Command Reference: create-cidr-collection: https://docs.aws.amazon.com/cli/latest/reference/route53/create-cidr-collection.html
- AWS CLI Command Reference: change-cidr-collection: https://docs.aws.amazon.com/cli/latest/reference/route53/change-cidr-collection.html
- AWS CLI Command Reference: test-dns-answer: https://docs.aws.amazon.com/cli/latest/reference/route53/test-dns-answer.html
- AWS CLI Command Reference: create-health-check: https://docs.aws.amazon.com/cli/latest/reference/route53/create-health-check.html
- AWS Route 53 Developer Guide: Route 53 quotas: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/DNSLimitations.html
- AWS Route 53 Developer Guide: Monitoring hosted zones with CloudWatch: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/monitoring-hosted-zones-with-cloudwatch.html
- AWS Route 53 Developer Guide: EDNS0 / EDNS Client Subnet: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-edns0.html
- Terraform AWS Provider: aws_route53_record: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS Provider: aws_route53_cidr_collection: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_cidr_collection
- Terraform AWS Provider: aws_route53_cidr_location: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_cidr_location
- Google Public DNS EDNS Client Subnet Guidelines: https://developers.google.com/speed/public-dns/docs/ecs
- Cloudflare 1.1.1.1 FAQ: https://developers.cloudflare.com/1.1.1.1/faq/

## Issues Found
- The sample CIDR collection ID used `collection-id-0123456789abcdef0`, but Route 53 CIDR collection IDs are UUIDs. Replaced examples with a UUID-shaped ID.
- The verification section said to use `dig` with a specific source IP, but the command did not specify a source address and normal `dig` cannot simulate Route 53 CIDR routing from arbitrary client networks. Updated the wording and used `test-dns-answer` with `--resolver-ip`, `--edns0-client-subnet-ip`, and `--edns0-client-subnet-mask`.
- The health check example used a private IP address (`10.1.1.100`). Route 53 health checkers cannot check local, private, non-routable, or multicast IP ranges. Updated the example to use a public endpoint.
- The CloudWatch metrics command omitted the required `us-east-1` region for Route 53 hosted zone metrics. Added `--region us-east-1`.
- The limitations section listed 5,000 CIDR blocks per collection and 100 locations per collection. Current Route 53 quotas list 1,000 CIDR blocks per collection and 5 CIDR collections per account by default. Updated the quota bullets.
- The CIDR range bullet said IPv4 `/0` to `/24` and IPv6 `/0` to `/48`; AWS docs state `/1` to `/24` and `/1` to `/48`, with the default `"*"` location used for zero-bit blocks. Updated the limitation.
- The post implied hosted zones are regional for management. Route 53 is a global service, while hosted zone CloudWatch metrics are queried in `us-east-1`. Replaced the inaccurate bullet.
- The post stated most public DNS resolvers, including Cloudflare 1.1.1.1, support ECS. Cloudflare documents that 1.1.1.1 does not send ECS for normal queries. Updated the ECS wording.
- The internal routing wording could imply IP-based routing works in private hosted zones. AWS documents that IP-based routing is not supported for private hosted zones. Adjusted the internal-use wording and added the limitation.

## Review Notes
Terraform resource names and arguments for `aws_route53_cidr_collection`, `aws_route53_cidr_location`, and `aws_route53_record.cidr_routing_policy` match the current Terraform AWS Provider documentation. The AWS CLI was not installed locally, so CLI validation was performed against AWS official command reference documentation.
