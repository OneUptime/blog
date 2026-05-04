# Validation Summary: How to Configure Ovh Provider with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- OVHcloud `ovh/ovh` provider
- HCL configuration
- DNS (`ovh_domain_zone_record`)

## Sources Consulted
- OVHcloud Terraform Provider repository: https://github.com/ovh/terraform-provider-ovh
- OVH provider on the Terraform Registry: https://registry.terraform.io/providers/ovh/ovh/latest/docs
- `ovh_domain_zone_record` resource documentation: https://registry.terraform.io/providers/ovh/ovh/latest/docs/resources/domain_zone_record
- OVHcloud blog "Infrastructure as Code (IaC) on OVHcloud - part 1: Terraform / OpenTofu": https://blog.ovhcloud.com/infrastructure-as-code-iac-on-ovhcloud-part-1-terraform-opentofu/

## Issues Found
The original post was filled with placeholder content (`provider_name`, `provider-namespace/provider-name`, `PROVIDER_API_KEY`, `provider_example_resource`) instead of OVH-specific configuration. Replaced the placeholders with the real OVH provider setup:

- **Provider Installation**: changed `source` to `ovh/ovh` (the official provider published by OVHcloud) and pinned to `~> 2.0` to match the current 2.x major (latest is v2.13.1 as of April 2026).
- **Authentication**: replaced the generic `PROVIDER_API_KEY`/`PROVIDER_API_SECRET` block with the four real OVH environment variables — `OVH_ENDPOINT`, `OVH_APPLICATION_KEY`, `OVH_APPLICATION_SECRET`, `OVH_CONSUMER_KEY` — and pointed the reader at the OVHcloud token creation URL.
- **Provider block**: renamed to `provider "ovh"` with a comment explaining credentials come from the `OVH_*` env vars.
- **Example Resource**: replaced the made-up `provider_example_resource` with `ovh_domain_zone_record`, using the documented required arguments (`zone`, `subdomain`, `fieldtype`, `ttl`, `target`). Note: the OVH provider's resources do not accept a generic `tags` map, so the original `tags` block was dropped.
- **Variables / Outputs**: added a `zone` variable for the DNS zone and changed the output to reference `ovh_domain_zone_record.main.id`.

## Review Notes
- The `~> 2.0` version pin tracks the current 2.x major; bump to `~> 3.0` if/when OVH cuts a new major.
- Authentication via the four `OVH_*` env vars is the documented approach, but the provider also supports OAuth2 client credentials (`OVH_CLIENT_ID` / `OVH_CLIENT_SECRET`) on supported endpoints — out of scope for an introductory post but worth knowing.
- `ovh-eu` is the EU endpoint; readers in other regions should use `ovh-us`, `ovh-ca`, `kimsufi-eu`, `kimsufi-ca`, or `soyoustart-eu`/`soyoustart-ca` as appropriate.
- The example uses a documentation IP (`203.0.113.10` from RFC 5737) so readers won't accidentally point a record at a real address.
