# Validation Summary: How to Transfer a Domain to Route 53

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Route 53 hosted zones
- Amazon Route 53 Domains
- AWS CLI
- DNS records and nameservers
- Domain registrar transfers
- DNSSEC

## Sources Consulted
- AWS CLI Command Reference: `route53domains transfer-domain` - https://docs.aws.amazon.com/cli/latest/reference/route53domains/transfer-domain.html
- AWS CLI Command Reference: `route53domains get-domain-detail` - https://docs.aws.amazon.com/cli/latest/reference/route53domains/get-domain-detail.html
- AWS CLI Command Reference: `route53domains list-operations` - https://docs.aws.amazon.com/cli/latest/reference/route53domains/list-operations.html
- AWS CLI Command Reference: `route53 create-hosted-zone` - https://docs.aws.amazon.com/cli/latest/reference/route53/create-hosted-zone.html
- AWS Route 53 Developer Guide: Transferring registration for a domain to Amazon Route 53 - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-transfer-to-route-53.html
- AWS Route 53 Developer Guide: Resending authorization and confirmation emails - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-click-email-link.html
- AWS Route 53 Developer Guide: Preventing common Route 53 transfer issues - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-transfer-troubleshooting.html
- Amazon Route 53 pricing - https://aws.amazon.com/route53/pricing/
- Amazon Route 53 Pricing for Domain Registration - https://d32ze2gidvkk54.cloudfront.net/Amazon_Route_53_Domain_Registration_Pricing_20140731.pdf

## Issues Found
- The prerequisites omitted DNSSEC handling. Added a step to remove DS records at the current registrar and wait at least 24 hours before transfer, matching AWS guidance.
- The post treated the 60-day restriction as applying only to new or recently transferred domains. Clarified that certain registrant contact changes can also trigger a 60-day transfer restriction.
- The post claimed the hosted-zone-first approach provides "zero downtime" and that DNS switches to Route 53 immediately. Changed this to "minimize downtime" and clarified that resolvers switch as DNS caches expire.
- The TTL guidance implied ordinary record TTL changes alone make clients pick up new nameservers faster. Clarified that existing record TTLs help old DNS answers expire and nameserver TTLs only help where the registrar allows them to be changed.
- Route 53 Domains CLI commands omitted `--region us-east-1`. Added the region to `transfer-domain`, `get-domain-detail`, and `list-operations` examples because AWS documents these domain registration commands as running in `us-east-1`.
- The confirmation step incorrectly implied every transfer requires clicking an AWS transfer approval link. Clarified that verification or authorization emails depend on TLD and account/contact state, and that generic TLDs such as .com, .net, and .org do not require separate transfer authorization.
- The transfer timing was listed as typically 5-7 days. Updated it to AWS's documented timing: generic TLDs can take up to 7 days and geographic TLDs can take up to 10 days after approval.
- The "pending" troubleshooting item was too narrow. Updated it to include pending authorization, verification, or current-registrar processing.
- Pricing was outdated and oversimplified. Updated .com pricing to $15/year, clarified hosted-zone pricing applies to the first 25 zones, and replaced "no separate transfer fee" with the documented TLD-specific transfer price behavior.

## Review Notes
The AWS CLI binary is not installed in this workspace, so command validation was performed against the current official AWS CLI documentation rather than local `--help` output. The post's JSON snippets and Route 53 hosted zone record examples are syntactically valid for the documented AWS CLI/API shapes.
