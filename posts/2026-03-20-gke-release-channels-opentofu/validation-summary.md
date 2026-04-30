# Validation Summary: How to Configure GKE Release Channels with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE release channels
- GKE maintenance windows and exclusions
- OpenTofu / HCL
- Google Cloud Terraform provider (`google_container_cluster`, `google_container_node_pool`)

## Sources Consulted
- GKE docs: About release channels - https://cloud.google.com/kubernetes-engine/docs/concepts/release-channels
- GKE docs: Use release channels - https://cloud.google.com/kubernetes-engine/docs/how-to/release-channels
- GKE docs: Maintenance windows and exclusions - https://cloud.google.com/kubernetes-engine/docs/concepts/maintenance-windows-and-exclusions
- GKE REST reference: ReleaseChannel - https://cloud.google.com/kubernetes-engine/docs/reference/rest/Shared.Types/ReleaseChannel
- Terraform Registry: `google_container_cluster` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Terraform Registry: `google_container_node_pool` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_node_pool

## Issues Found
- The overview incorrectly described GKE as having only Rapid, Regular, Stable, and None/manual. I corrected this to include `Extended` and clarified that `no channel` is separate from release channels and still auto-upgrades over time.
- The `release_channel` comment labeled `UNSPECIFIED` as manual version management. I changed this to `UNSPECIFIED (no channel)` to match current GKE and provider behavior.
- The comment saying not to specify `min_master_version` when using a release channel was too strong. I replaced it with a more accurate note that GKE manages versions within the selected channel and that version pinning should only be used when a specific starting version is needed.
- The maintenance-window language implied upgrades are guaranteed to happen only inside configured windows. I changed that wording to reflect GKE's documented caveat that emergency or mandatory upgrades can occur outside maintenance windows and exclusions.
- The node-pool auto-upgrade example implied `auto_upgrade = true` is a discretionary toggle for release-channel clusters. I clarified in the comment that node auto-upgrade is enabled by default for clusters subscribed to a release channel.

## Review Notes
- The HCL examples are syntactically valid for the current Google provider schema, including `recurring_window`, `maintenance_exclusion`, and node-pool `management` blocks.
- `Extended` is part of the current GKE release-channel model and can incur pay-per-use costs when a cluster's minor version enters extended support.
- The recurring maintenance window example uses RFC3339 UTC timestamps and an RFC5545 `RRULE`, which matches current provider requirements.
