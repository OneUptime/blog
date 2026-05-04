# Validation Summary: How to Create DigitalOcean VPCs with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- DigitalOcean Provider for Terraform/OpenTofu
- DigitalOcean VPC
- DigitalOcean Droplet
- DigitalOcean Managed Database (PostgreSQL)
- DigitalOcean Kubernetes (DOKS)

## Sources Consulted
- DigitalOcean Terraform Provider source: `digitalocean/terraform-provider-digitalocean` (datasource_vpc.go schema)
- Terraform Registry — `digitalocean_vpc` resource and data source
- Terraform Registry — `digitalocean_droplet`, `digitalocean_database_cluster`, `digitalocean_kubernetes_cluster` resources

## Issues Found
- **`digitalocean_vpc` data source used an invalid argument.** The original "Referencing the Default VPC" example passed both `region = "nyc3"` and `default = true` to the `data "digitalocean_vpc"` block. The data source schema only accepts exactly one of `id`, `name`, or `region` as a filter; `default` is a *computed* (read-only) attribute, not an input. When `region` is supplied, the data source returns the default VPC for that region automatically. Removed the `default = true` line so the example is syntactically and semantically valid.

## Review Notes
- The `digitalocean_vpc` resource arguments (`name`, `region`, `ip_range`, `description`) and outputs (`id`, `urn`) used in the post are correct.
- The Droplet attribute `ipv4_address_private` and argument `vpc_uuid` are correct.
- The `digitalocean_database_cluster` argument `private_network_uuid` is the correct field for placing a managed database into a VPC (rather than `vpc_uuid`, which is used for Droplets/Kubernetes).
- The Kubernetes cluster version `1.32.2-do.0` is plausible for the post's timeframe; readers should always check `doctl kubernetes options versions` for currently supported versions, as DigitalOcean retires older minor versions on a rolling basis.
- The multi-region example uses an inline map indexed by `each.key`; this is valid HCL but slightly awkward. Defining the CIDRs as a separate local would be cleaner — left unchanged as it is not technically incorrect.
- Default VPCs in a region are auto-created by DigitalOcean and cannot be deleted while resources reference them; this caveat could be worth mentioning in a future revision but is not an error.
