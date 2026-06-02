# Validation Summary: How to Create Route 53 Public Hosted Zones

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Route 53 public hosted zones
- AWS CLI for Route 53
- DNS records and delegation
- Route 53 alias records
- Terraform AWS provider

## Sources Consulted
- AWS CLI Command Reference: create-hosted-zone: https://docs.aws.amazon.com/cli/latest/reference/route53/create-hosted-zone.html
- Amazon Route 53 API Reference: CreateHostedZone: https://docs.aws.amazon.com/Route53/latest/APIReference/API_CreateHostedZone.html
- AWS CLI Command Reference: change-resource-record-sets: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- Amazon Route 53 API Reference: ChangeResourceRecordSets: https://docs.aws.amazon.com/Route53/latest/APIReference/API_ChangeResourceRecordSets.html
- Amazon Route 53 Developer Guide: Choosing between alias and non-alias records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html
- Amazon Route 53 Developer Guide: Adding or changing name servers and glue records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-name-servers-glue-records.html
- Amazon Route 53 Developer Guide: Replacing the hosted zone for a domain registered with Route 53: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-replace-hosted-zone.html
- Amazon Route 53 pricing: https://aws.amazon.com/route53/pricing/
- Terraform AWS provider documentation: aws_route53_record: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record

## Issues Found
- The post said Route 53 returns the existing hosted zone if `create-hosted-zone` is run again with the same caller reference. AWS documents this as a `HostedZoneAlreadyExists` error, so the sentence was corrected.
- The post implied Route 53 registrar delegation always happens automatically for Route 53-registered domains after creating a hosted zone. AWS automatically wires delegation for the hosted zone created during domain registration, but replacement hosted zones must be updated on the registered domain. The text was clarified.
- The cost section said public hosted zones cost $0.50 per month per zone without noting the lower additional-zone tier. AWS pricing lists $0.50 per month for the first 25 hosted zones and $0.10 per month for additional hosted zones, so the pricing text was corrected.

## Review Notes
The AWS CLI command shapes, Route 53 change batch JSON, alias record examples, transactional batch-change explanation, delegation propagation timing, Terraform Route 53 record syntax, and alias-query pricing explanation are consistent with the official documentation reviewed.
