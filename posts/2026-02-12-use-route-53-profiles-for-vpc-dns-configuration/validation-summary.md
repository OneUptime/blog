# Validation Summary: How to Use Route 53 Profiles for VPC DNS Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Route 53 Profiles
- Amazon VPC DNS configuration
- Route 53 private hosted zones
- Route 53 Resolver rules
- Route 53 Resolver DNS Firewall
- AWS Resource Access Manager (AWS RAM)
- AWS CLI
- Terraform AWS provider
- AWS CloudTrail

## Sources Consulted
- AWS Route 53 Developer Guide: What are Amazon Route 53 Profiles? https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/profiles.html
- AWS Route 53 Developer Guide: High-level steps for using Route 53 Profiles https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/profile-high-level-steps.html
- AWS Route 53 Developer Guide: Associate a Route 53 Profile to VPCs https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/profile-associate-vpcs.html
- AWS Route 53 Developer Guide: Associate private hosted zones to a Route 53 Profile https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/profile-associate-private-hz.html
- AWS Route 53 Developer Guide: Associate Resolver rules to a Route 53 Profile https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/profile-associate-resolver-rules.html
- AWS Route 53 Developer Guide: Associate DNS Firewall rule groups to a Route 53 Profile https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/profile-associate-dns-firewall.html
- AWS CLI Command Reference: route53profiles create-profile https://docs.aws.amazon.com/cli/latest/reference/route53profiles/create-profile.html
- AWS CLI Command Reference: route53profiles associate-resource-to-profile https://docs.aws.amazon.com/cli/latest/reference/route53profiles/associate-resource-to-profile.html
- AWS CLI Command Reference: route53profiles associate-profile https://docs.aws.amazon.com/cli/latest/reference/route53profiles/associate-profile.html
- AWS CLI Command Reference: route53profiles list-profile-resource-associations https://docs.aws.amazon.com/cli/latest/reference/route53profiles/list-profile-resource-associations.html
- AWS CLI Command Reference: route53profiles list-profile-associations https://docs.aws.amazon.com/cli/latest/reference/route53profiles/list-profile-associations.html
- AWS CLI Command Reference: route53resolver create-resolver-rule https://docs.aws.amazon.com/cli/latest/reference/route53resolver/create-resolver-rule.html
- AWS CLI Command Reference: route53resolver create-firewall-rule-group https://docs.aws.amazon.com/cli/latest/reference/route53resolver/create-firewall-rule-group.html
- AWS CLI Command Reference: route53resolver create-firewall-rule https://docs.aws.amazon.com/cli/latest/reference/route53resolver/create-firewall-rule.html
- AWS CLI Command Reference: AWS RAM create-resource-share https://docs.aws.amazon.com/cli/latest/reference/ram/create-resource-share.html
- Terraform Registry: aws_route53profiles_resource_association https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53profiles_resource_association
- Terraform Registry: aws_route53profiles_association https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53profiles_association

## Issues Found
- Removed `resource-properties` with `HostedZoneName` from private hosted zone profile association examples. AWS CLI documentation only defines resource properties for DNS Firewall rule group priority; private hosted zone profile associations only need the hosted zone ARN.
- Added `--creator-request-id` to the `create-resolver-rule` example because the AWS CLI marks it as required.
- Added `--creator-request-id` to the `create-firewall-rule` example to make the idempotency behavior explicit and align with current CLI examples.
- Changed DNS Firewall profile association resource properties from `{"Priority": 100}` to `{"priority": 100}` because AWS examples use the lowercase `priority` key and return `{"priority":102}`.
- Replaced placeholder VPC names such as `vpc-production` with VPC-ID-shaped placeholders because `associate-profile --resource-id` expects a VPC ID.
- Corrected the "Layered Profiles" pattern because AWS allows only one Route 53 Profile association per VPC. The revised example composes shared and team-specific resources into each applicable profile.
- Removed unsupported `resource_properties` from the Terraform private hosted zone resource association example.

## Review Notes
The article covers the core resources Route 53 Profiles support, but AWS also now lists interface VPC endpoints and VPC Resolver query logging configurations as supported profile resources. The omission is not technically incorrect for this focused tutorial, but it could be mentioned in a future expansion.
