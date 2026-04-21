# Validation Summary: How to Troubleshoot DNS Resolution Issues in OpenTofu

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTofu
- AWS Route 53
- AWS CLI
- DNS resolution and `dig`
- HashiCorp AWS provider resources and data sources
- HashiCorp Time provider

## Sources Consulted
- OpenTofu import command documentation: https://opentofu.org/docs/v1.9/cli/import/usage/
- HashiCorp AWS provider `aws_route53_record` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_record.html.markdown
- HashiCorp AWS provider `aws_route53_zone` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_zone.html.markdown
- HashiCorp AWS provider `aws_route53_zone` data source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/route53_zone.html.markdown
- HashiCorp AWS provider `aws_route53_zone_association` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_zone_association.html.markdown
- HashiCorp Time provider `time_sleep` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-time/main/docs/resources/sleep.md
- AWS CLI `route53 list-resource-record-sets` documentation: https://docs.aws.amazon.com/cli/latest/reference/route53/list-resource-record-sets.html
- AWS CLI `route53 list-hosted-zones` documentation: https://docs.aws.amazon.com/cli/latest/reference/route53/list-hosted-zones.html
- AWS CLI `route53 get-hosted-zone` documentation: https://docs.aws.amazon.com/cli/latest/reference/route53/get-hosted-zone.html
- AWS CLI `route53 list-vpc-association-authorizations` documentation: https://docs.aws.amazon.com/cli/latest/reference/route53/list-vpc-association-authorizations.html
- AWS Route 53 simple record values and TTL documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-basic.html
- AWS Route 53 alias record documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-alias.html
- AWS Route 53 private hosted zone documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-private.html
- AWS Route 53 private hosted zone considerations and split-view DNS documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-considerations.html
- Local `dig -h` output and `dig example.com` output from BIND 9.18.39.

## Issues Found
- The first command block was marked as `bash` but also contained an HCL `aws_route53_record` resource. Split it into separate `bash` and `hcl` fences so the examples are syntactically correct.
- The TTL check used `dig api.example.com | grep "TTL"`, but default `dig` output does not include the literal string `TTL`. Changed it to `dig api.example.com +noall +answer`, which shows the TTL column.
- The `dig @8.8.8.8` comment claimed it forced a DNS cache bypass. Public resolvers can still serve cached answers, so the comment now says it queries a public resolver instead of the local resolver.
- The private hosted zone description was too narrow. Updated it to mention Route 53 Resolver in associated VPCs, inbound Resolver endpoints for hybrid networks, and the VPC DNS support requirement.
- The VPC association command used `list-vpc-association-authorizations`, which lists VPCs authorized for cross-account association, not the VPCs currently associated with the hosted zone. Replaced it with `get-hosted-zone --query "VPCs"`.
- The private zone example mixed an inline `vpc` block with `aws_route53_zone_association` without ignoring inline VPC association changes, which the provider documents as causing a perpetual diff. Added a `lifecycle` block with `ignore_changes = [vpc]`.
- The split-horizon hosted zones were named `api.example.com`, which would require public delegation of that subdomain zone. Changed both public and private hosted zones to `example.com` while keeping the `api.example.com` records.
- The private split-horizon `A` record used an ALB DNS name in `records`, but non-alias `A` records require IPv4 address values. Replaced it with an alias record and removed `ttl`, because alias records conflict with `ttl` and `records`.
- The public split-horizon example pointed at `aws_eip.nat.public_ip`, which implied inbound API DNS traffic should target a NAT EIP. Renamed the illustrative EIP reference to `aws_eip.api.public_ip`.

## Review Notes
- `time_sleep` is a valid resource for fixed delays, but the provider documentation treats it as a workaround. A purpose-built downstream resource or retry-aware provider behavior is preferable when available.
- AWS CLI, OpenTofu, and Terraform binaries were not installed in the local environment, so AWS CLI and OpenTofu behavior was validated against official documentation. `dig` behavior was validated locally.
