# Validation Summary: How to Manage IPv6 DNS Records with Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- AWS Route 53
- Cloudflare DNS
- Google Cloud DNS
- Google Cloud Load Balancing
- DNS AAAA records
- `dig`
- `curl`

## Sources Consulted
- AWS Route 53 alias records for ELB load balancers: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-elb-load-balancer.html
- AWS Route 53 alias record type guidance: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-alias.html
- AWS Terraform provider `aws_lb` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- AWS Terraform provider `aws_route53_record` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Cloudflare Terraform DNS resource docs: https://developers.cloudflare.com/api/terraform/resources/dns
- Cloudflare Terraform zone data source docs: https://developers.cloudflare.com/api/terraform/resources/zones/
- Cloudflare Terraform v5 migration/stability note: https://developers.cloudflare.com/changelog/post/2026-04-24-tf-migrate-tool-released/
- Google Cloud DNS record management docs: https://docs.cloud.google.com/dns/docs/records
- Google Cloud IPv6 load balancing docs: https://docs.cloud.google.com/load-balancing/docs/ipv6
- Google Cloud forwarding rule overview: https://docs.cloud.google.com/load-balancing/docs/forwarding-rule-concepts
- Google Cloud static external IPv6 address docs: https://docs.cloud.google.com/vpc/docs/reserve-static-external-ip-address
- Terraform CLI `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Local CLI help output: `dig -h`
- Local CLI help output: `curl --help all`

## Issues Found
- The Cloudflare examples used outdated Terraform provider v4 resource syntax (`cloudflare_record`, `value`, and the old zone lookup shape). I updated them to the current documented resource and field names: `cloudflare_dns_record`, `content`, and `data "cloudflare_zone"` with a `filter` block.
- The Cloudflare examples used short record names (`api`, `app`) even though the current Cloudflare Terraform docs specify complete record names including the zone. I changed them to fully qualified names (`api.example.com`, `app.example.com`).
- The reusable multi-provider module referenced `var.route53_zone_id` and `var.cloudflare_zone_id` without declaring those variables, which made the module example incomplete. I added the missing variable declarations.
- The module derived the Cloudflare record name with `split(".", var.hostname)[0]`, which breaks for multi-label hostnames and does not match the current Cloudflare v5 expectation of a complete record name. I changed it to use `var.hostname` directly.

## Review Notes
- AWS Route 53 and Google Cloud DNS examples were technically sound against current documentation and did not require changes.
- `terraform apply`, `dig AAAA ...`, and `curl -6 ...` are valid examples. Terraform CLI was verified against HashiCorp documentation because the `terraform` binary was not installed in the local environment.
- Cloudflare syntax is version-sensitive. The post now matches the current Cloudflare Terraform v5 documentation; users pinned to older v4 provider versions would need the older resource names and arguments.
