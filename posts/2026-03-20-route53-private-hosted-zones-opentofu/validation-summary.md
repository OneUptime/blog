# Validation Summary: How to Configure Route 53 Private Hosted Zones with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS Route 53 private hosted zones
- AWS Route 53 records and alias records
- AWS VPC DNS and Route 53 Resolver
- AWS CLI
- DNS and multicast DNS

## Sources Consulted
- Terraform AWS Provider `aws_route53_zone` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_zone.html.markdown
- Terraform AWS Provider `aws_route53_record` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_record.html.markdown
- Terraform AWS Provider `aws_route53_zone_association` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_zone_association.html.markdown
- Terraform AWS Provider `aws_route53_vpc_association_authorization` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_vpc_association_authorization.html.markdown
- AWS Route 53 private hosted zone creation documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-creating.html
- AWS Route 53 private hosted zone considerations: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-considerations.html
- AWS Route 53 cross-account private hosted zone association documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-associate-vpcs-different-accounts.html
- AWS VPC Amazon DNS documentation: https://docs.aws.amazon.com/vpc/latest/userguide/AmazonDNS-concepts.html
- AWS CLI `get-hosted-zone` command reference: https://docs.aws.amazon.com/cli/latest/reference/route53/get-hosted-zone.html
- AWS CLI `list-vpc-association-authorizations` command reference: https://docs.aws.amazon.com/cli/latest/reference/route53/list-vpc-association-authorizations.html
- OpenTofu lifecycle meta-argument documentation: https://opentofu.org/docs/v1.6/language/meta-arguments/lifecycle/
- OpenTofu CLI command documentation: https://opentofu.org/docs/cli/commands/
- OpenTofu provider configuration and aliases documentation: https://opentofu.org/docs/language/providers/configuration/
- IANA Special-Use Domain Names registry: https://www.iana.org/assignments/special-use-domain-names/special-use-domain-names.xhtml
- RFC 6762, Multicast DNS: https://www.rfc-editor.org/rfc/rfc6762

## Issues Found
- The introduction listed `.local` as a usable private DNS namespace. Changed this to recommend `.internal` and warn against `.local`, because RFC 6762 reserves `.local` for multicast DNS and recommends against using it as a private unicast DNS TLD.
- The `aws_route53_zone` example mixed inline `vpc` blocks with later `aws_route53_zone_association` resources. Added `ignore_changes = [vpc]` because the AWS provider documents that mixing these without ignoring inline VPC association changes causes perpetual plan differences.
- The lifecycle comment said `prevent_destroy` prevents destroying the zone if records exist. Updated the comment because OpenTofu `prevent_destroy` rejects any plan that would destroy the resource while the setting remains in configuration.
- The commented cross-account association example omitted `vpc_region` even though the authorization example used `var.cross_account_region`. Added `vpc_region = var.cross_account_region` for cross-region correctness.
- The verification command used `aws route53 list-vpc-association-authorizations` under "Check zone associations." Replaced it with `aws route53 get-hosted-zone --id <zone-id>`, because `list-vpc-association-authorizations` lists cross-account VPC association authorizations, not the hosted zone's current VPC associations.
- The conclusion referred to Terraform cross-provider configuration in an OpenTofu guide. Updated this to OpenTofu provider aliases.

## Review Notes
The HCL snippets are illustrative and assume the referenced variables and provider aliases are declared elsewhere. The local environment did not have `tofu` or `aws` installed, so CLI behavior was verified against official OpenTofu and AWS CLI documentation instead of local `--help` output.
