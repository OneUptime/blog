# Validation Summary: How to Configure the DNS Provider in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- `hashicorp/dns` provider
- DNS
- RFC 2136
- TSIG
- GSS-TSIG

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu provider configuration: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu `tofu init`: https://opentofu.org/docs/cli/init/
- OpenTofu `tofu validate`: https://opentofu.org/docs/v1.9/cli/commands/validate/
- OpenTofu `tofu plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/
- DNS provider overview: https://raw.githubusercontent.com/hashicorp/terraform-provider-dns/main/docs/index.md
- `dns_a_record_set` resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-dns/main/docs/resources/a_record_set.md
- `dns_cname_record` resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-dns/main/docs/resources/cname_record.md
- `dns_txt_record_set` resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-dns/main/docs/resources/txt_record_set.md
- RFC 2136: https://datatracker.ietf.org/doc/html/rfc2136
- RFC 2845: https://datatracker.ietf.org/doc/html/rfc2845
- RFC 3645: https://datatracker.ietf.org/doc/html/rfc3645

## Issues Found
- The post used a placeholder provider source (`hashicorp/example`) and fictional resources (`example_project`, `example_team`, `example_alert`, `example_backup_policy`) that do not exist for DNS management. I replaced them with the real `hashicorp/dns` provider and valid `dns_a_record_set`, `dns_cname_record`, and `dns_txt_record_set` examples from the provider documentation.
- The authentication section used nonexistent environment variables (`PROVIDER_API_KEY`, `PROVIDER_TOKEN`, `PROVIDER_ORG`). I replaced them with the documented DNS provider variables `DNS_UPDATE_KEYNAME`, `DNS_UPDATE_KEYALGORITHM`, and `DNS_UPDATE_KEYSECRET`, which are the correct inputs for TSIG-based RFC 2136 updates.
- The prerequisites incorrectly implied a generic API-based SaaS provider. I corrected them to match the actual DNS provider requirements: access to an authoritative DNS server that accepts RFC 2136 updates and TSIG or GSS-TSIG credentials when authenticated updates are required.
- The advanced configuration example described unrelated monitoring and backup resources. I replaced that section with a valid alternate provider configuration using OpenTofu's `alias` meta-argument plus documented `transport`, `timeout`, and `retries` settings.
- The outputs and conclusion referred to generic project objects and overstated the provider's scope. I corrected them to output real DNS record FQDNs and to describe the provider accurately as managing RFC 2136-compatible DNS records as code.
- The common issues section included an inaccurate rate-limiting recommendation. I replaced it with a real DNS provider caveat from the documentation: the `zone` value must be a fully qualified domain name with a trailing dot, and CNAME targets should be fully qualified.

## Review Notes
- `tofu` and `terraform` were not installed in the workspace, so command behavior was verified against official OpenTofu documentation rather than by local CLI execution.
- The examples assume `var.dns_zone` includes the trailing dot required by the DNS provider schema, such as `example.com.`.
