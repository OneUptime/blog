# Validation Summary: How to Create Reusable Terraform Modules for DNS Records

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- Amazon Route 53
- DNS records
- Route 53 alias records
- Route 53 weighted routing
- Route 53 health checks

## Sources Consulted
- Terraform AWS provider documentation for `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS provider documentation for `aws_route53_health_check`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- Terraform language documentation for optional object type attributes: https://developer.hashicorp.com/terraform/language/expressions/type-constraints#optional-object-type-attributes
- Amazon Route 53 Developer Guide, supported DNS record types: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html
- Amazon Route 53 Developer Guide, choosing between alias and non-alias records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html
- Amazon Route 53 Developer Guide, weighted alias records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-weighted-alias.html
- Amazon Route 53 API Reference, `AliasTarget` and `EvaluateTargetHealth`: https://docs.aws.amazon.com/Route53/latest/APIReference/API_AliasTarget.html

## Issues Found
- The Terraform variable validation allowed only a subset of the DNS record types currently supported by Route 53 and the AWS provider. Updated the `type` description, validation list, and error message to include the full provider-supported set: `A`, `AAAA`, `CAA`, `CNAME`, `DS`, `HTTPS`, `MX`, `NAPTR`, `NS`, `PTR`, `SOA`, `SPF`, `SRV`, `SSHFP`, `SVCB`, `TLSA`, and `TXT`.
- The alias object defaulted `evaluate_target_health` to `true`, which can make CloudFront alias records invalid because Route 53 does not allow target health evaluation for CloudFront distributions. Changed the default to `false` and added a short note explaining when to enable it for load balancer aliases and when to keep it disabled for CloudFront.

## Review Notes
Terraform was not installed in the workspace, so examples were reviewed statically against official Terraform language documentation, the AWS provider resource documentation, and Amazon Route 53 documentation. The module remains intentionally minimal; production modules may add validation to require non-empty `records` for non-alias records and to prevent unsupported alias record type and target combinations.
