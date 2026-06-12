# Validation Summary: How to Use Terraform with Multiple Cloud Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- HashiCorp AWS Provider (`hashicorp/aws` ~> 5.0)
- HashiCorp Azure Provider (`hashicorp/azurerm` ~> 3.0)
- HashiCorp Google Provider (`hashicorp/google` ~> 5.0)
- HashiCorp google-beta, random, tls providers
- AWS: EC2, VPN Gateway, Customer Gateway, S3, DynamoDB, IAM
- Azure: Linux VM, Blob Storage, Key Vault, Resource Group
- GCP: Compute Engine, HA VPN Gateway, External VPN Gateway, Cloud Router, GCS
- HashiCorp Consul (service mesh example)
- GitHub Dependabot (Terraform ecosystem)

## Sources Consulted
- Terraform AWS provider docs (aws_vpn_gateway, aws_customer_gateway, aws_vpn_connection, aws_vpn_connection_route, aws_instance, default_tags): https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AzureRM provider docs (provider features block, azurerm_linux_virtual_machine, source_image_reference): https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- Terraform Google provider docs (google_compute_ha_vpn_gateway, google_compute_external_vpn_gateway, google_compute_vpn_tunnel, google_compute_router, google_compute_route, google_compute_instance): https://registry.terraform.io/providers/hashicorp/google/latest/docs
- Terraform S3 backend documentation (workspace_key_prefix, dynamodb_table, role_arn): https://developer.hashicorp.com/terraform/language/settings/backends/s3
- Terraform language version constraints (`~>` pessimistic): https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- Terraform terraform_remote_state data source: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform workspaces: https://developer.hashicorp.com/terraform/language/state/workspaces
- Azure VM sizes (Burstable B-series): https://learn.microsoft.com/azure/virtual-machines/sizes-b-series-burstable
- Azure Canonical Ubuntu 22.04 image SKUs (offer `0001-com-ubuntu-server-jammy`, sku `22_04-lts`): Azure Marketplace
- GCP machine types (E2 family): https://cloud.google.com/compute/docs/general-purpose-machines#e2_machines
- GCP Ubuntu public images (`ubuntu-os-cloud/ubuntu-2204-lts`): https://cloud.google.com/compute/docs/images/os-details
- GitHub Dependabot config (terraform ecosystem, groups, version-update:semver-major): https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference

## Issues Found
1. **Workspace state path comment inaccuracy** (around line 811). The example said `env:/production/multi-cloud/terraform.tfstate`, but with `workspace_key_prefix = "env"` (no trailing colon) the path is actually `env/production/multi-cloud/terraform.tfstate`. The colon form only applies with Terraform's default value `env:`. Updated the comment to reflect the correct path and added a clarifying note that we override Terraform's default.

## Review Notes
- The `~> 5.0` constraint comment ("allows 5.0.x through 5.x.x but not 6.0.0") is correct per Terraform's pessimistic constraint semantics. With the AWS provider 6.x series now released, readers may want to evaluate moving to it; the constraint as written intentionally pins to v5.
- The `~> 5.10.0` constraint on `google` matches the post's comment "allow patch updates only" (it permits `5.10.x` but not `5.11.0`). Correct.
- In `aws_customer_gateway`, the `bgp_asn = 65000` comment "GCP's ASN" is slightly misleading - GCP does not have a fixed public ASN; the value here is whatever you configure on the GCP `google_compute_router` BGP block (also 65000 later in the file, so they match). The behavior is harmless given `static_routes_only = true` is set on the VPN connection. Left as-is since the values are consistent and operational.
- With `static_routes_only = true` on `aws_vpn_connection`, BGP isn't actually used, so the matching ASN is cosmetic - not an error, just stylistically odd. Not corrected.
- The Azure SKU `22_04-lts` (Gen 1) is valid for offer `0001-com-ubuntu-server-jammy`. Gen 2 (`22_04-lts-gen2`) is also available; either would work.
- The GCP boot disk image reference `ubuntu-os-cloud/ubuntu-2204-lts` resolves the family in the public image project - valid shorthand accepted by the Compute Engine API.
- The `oneuptime_monitor` / `oneuptime_status_page` resources at the end are illustrative for a third-party provider; their exact schema depends on the OneUptime Terraform provider and is not part of the cross-cloud correctness review.
