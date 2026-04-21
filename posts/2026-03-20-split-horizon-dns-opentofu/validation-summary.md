# Validation Summary: How to Set Up Split-Horizon DNS with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL configuration
- AWS Route 53 public and private hosted zones
- Route 53 split-view / split-horizon DNS
- AWS VPC DNS settings and private hosted zone associations
- AWS provider resources: `aws_route53_zone`, `aws_route53_record`, `aws_route53_zone_association`
- AWS ALB alias records
- Amazon RDS, ElastiCache, and VPC endpoint DNS names

## Sources Consulted
- AWS Route 53 Developer Guide, Working with private hosted zones: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-private.html
- AWS Route 53 Developer Guide, Considerations when working with a private hosted zone: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-considerations.html
- AWS VPC User Guide, DNS attributes for your VPC: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-dns.html
- AWS Route 53 Developer Guide, Associating more VPCs with a private hosted zone: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-associate-vpcs.html
- AWS Route 53 Developer Guide, Associating a VPC and private hosted zone across different accounts: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-associate-vpcs-different-accounts.html
- AWS Route 53 API Reference, `CreateVPCAssociationAuthorization`: https://docs.aws.amazon.com/Route53/latest/APIReference/API_CreateVPCAssociationAuthorization.html
- AWS Route 53 API Reference, `AssociateVPCWithHostedZone`: https://docs.aws.amazon.com/Route53/latest/APIReference/API_AssociateVPCWithHostedZone.html
- HashiCorp AWS Provider documentation source, `aws_route53_zone`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_zone.html.markdown
- HashiCorp AWS Provider documentation source, `aws_route53_record`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_record.html.markdown
- HashiCorp AWS Provider documentation source, `aws_route53_zone_association`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_zone_association.html.markdown
- HashiCorp AWS Provider documentation source, `aws_route53_vpc_association_authorization`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_vpc_association_authorization.html.markdown
- HashiCorp AWS Provider documentation source, `aws_db_instance`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- HashiCorp AWS Provider documentation source, `aws_elasticache_replication_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/elasticache_replication_group.html.markdown
- HashiCorp AWS Provider documentation source, `aws_vpc_endpoint`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc_endpoint.html.markdown
- OpenTofu dynamic blocks documentation: https://opentofu.org/docs/language/expressions/dynamic-blocks/
- OpenTofu resource lifecycle documentation: https://opentofu.org/docs/language/resources/behavior/

## Issues Found
- The introduction said OpenTofu keeps the public and private hosted zones "in sync." OpenTofu manages declared resources, but it does not automatically synchronize public and private records. Changed the wording to say that OpenTofu lets you keep records synchronized in code.
- The architecture diagram claimed the internal ALB has "No TLS termination overhead." Split-horizon DNS does not inherently remove TLS termination, and internal ALBs can still terminate TLS. Changed the label to "Private traffic path."
- The private hosted zone example showed dynamic inline VPC associations while also using `ignore_changes = [vpc]` and later showing `aws_route53_zone_association`. The AWS provider documentation warns that inline VPC associations and standalone association resources for the same zone can cause perpetual plan diffs unless `ignore_changes` is used, and `ignore_changes` means later inline VPC changes are ignored. Removed the dynamic inline additional VPC block and kept the standalone association pattern.
- The private hosted zone example did not mention the required VPC DNS attributes. AWS documentation requires `enableDnsHostnames` and `enableDnsSupport` to be true for private hosted zones. Added that requirement to the code comments and best practices.
- The public zone defined `app.example.com`, but the private zone with the same domain did not. AWS Route 53 Resolver does not fall back to the public zone when a matching private hosted zone exists but the record is missing; it returns NXDOMAIN. Added an `app_private` record and updated the best-practice guidance to mirror public records that VPC clients need.
- The additional VPC association snippet used `aws_route53_vpc_association_authorization` for a generic peered VPC. AWS and provider documentation define that authorization as a cross-account association step; same-account additional VPC associations only need `aws_route53_zone_association`. Simplified the snippet to the same-account association resource.
- The shared private zone module used generic `endpoint` outputs for RDS, ElastiCache, and SQS. RDS `endpoint` commonly includes `address:port`, and SQS queue endpoints can be URLs, neither of which is valid as a CNAME target. Updated the example to use DNS-name/address-style outputs: `module.rds.address`, `module.elasticache.primary_endpoint_address`, and `module.sqs_vpc_endpoint.dns_name`.
- The TTL best-practice bullet applied to all private records, but Route 53 alias records have a fixed TTL and the provider requires omitting `ttl` for alias records. Changed the guidance to refer to non-alias private records.

## Review Notes
- The corrected examples still assume the surrounding resources and variables exist, including `aws_vpc.main`, `aws_lb.external`, `aws_lb.internal`, RDS, ElastiCache, and module outputs.
- Cross-account private hosted zone associations are still supported, but they require an authorization in the hosted-zone account and the association call from the VPC-owning account. That flow is intentionally not shown in the simplified same-account association snippet.
- The OpenTofu and Terraform CLIs were not installed in this workspace, so validation was performed against official AWS, OpenTofu, and AWS provider documentation rather than local `tofu validate` or `terraform validate`.
