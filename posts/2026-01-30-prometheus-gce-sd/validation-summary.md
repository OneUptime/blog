# Validation Summary: How to Build Prometheus GCE SD (Google Cloud Service Discovery)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (service discovery)
- Google Cloud Platform / Google Compute Engine
- Node Exporter
- Terraform (Google provider)
- gcloud CLI
- systemd
- GKE Workload Identity

## Sources Consulted
- Prometheus `gce_sd_config` reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#gce_sd_config
- Prometheus GCE discovery source code: https://github.com/prometheus/prometheus/blob/main/discovery/gce/gce.go
- GitHub issue documenting zone URL format: https://github.com/prometheus/prometheus/issues/3042
- Google Cloud Compute Engine REST API reference (`instances.list`, Instance resource): https://cloud.google.com/compute/docs/reference/rest/v1/instances
- Google Cloud IAM Compute Engine roles (`roles/compute.viewer`): https://cloud.google.com/compute/docs/access/iam
- gcloud CLI reference for `iam service-accounts` and `compute firewall-rules`: https://cloud.google.com/sdk/gcloud/reference

## Issues Found

1. **`zone` parameter incorrectly described as optional.** The original "Discovering All Zones in a Project" section claimed Prometheus would discover instances across all zones when `zone` was omitted, and mentioned a non-existent `zones` (regex) parameter. The Prometheus source enforces that `zone` is required (`UnmarshalYAML` rejects configs without it) and only a single `zone` field exists. I rewrote the section to state `zone` is required and to recommend enumerating zones with multiple `gce_sd_configs` entries. I also referenced the real `filter` parameter (which is passed through to the GCE `instances.list` API) as the actual way to reduce returned instances.

2. **`__meta_gce_zone` value format misdescribed.** The meta-label table described the zone label as e.g. `us-central1-a`, but per the Prometheus discovery code (`gceLabelZone: model.LabelValue(inst.Zone)`) and the GCE API, this is actually the full zone URL (e.g. `https://www.googleapis.com/compute/v1/projects/PROJECT/zones/us-central1-a`). Updated the table entry. For consistency, I also clarified that `__meta_gce_network` and `__meta_gce_subnetwork` are URLs (matching how the GCE API returns them).

3. **Region-extraction relabel regex would not match.** The original regex `([a-z]+-[a-z0-9]+)-[a-z]` would never match because Prometheus relabel regexes are fully anchored and `__meta_gce_zone` is a full URL. Replaced with `.*/zones/([a-z]+-[a-z0-9]+)-[a-z]` and added a parallel snippet that overwrites the `zone` label with the short zone name using `.*/zones/(.+)`. Applied the same fix to the production configuration block.

4. **Production config missing required `zone` field.** The "Complete Production Configuration" `gce_sd_configs` entries omitted `zone`, so they would fail validation when Prometheus loads the config. Added explicit zones to all three jobs (`node-exporter`, `app-metrics`, `database-exporters`).

5. **Missing `__meta_gce_interface_ipv4_<name>` label.** Added this label to the meta-label table — it is set by the Prometheus GCE discovery code for each named network interface and is useful for multi-NIC instances.

6. **`__meta_gce_tags` format clarified.** The discovery code wraps the joined tag list with `tag_separator` on both ends, which is why the regex examples elsewhere in the post use `.*,prometheus-target,.*`. Clarified this in the meta-label table so the regex pattern makes sense to readers.

## Review Notes

- Node Exporter 1.7.0 (Nov 2023) is somewhat dated as of mid-2026, but the download URL and install steps are still valid. Left as-is — not a technical error.
- The "Setting the Instance Label" example copies `__meta_gce_zone` directly into a `zone` label, which preserves the full URL. The updated meta-label table now warns readers about the URL format, and the relabel section that immediately follows shows the correct extraction pattern, so I did not modify this snippet.
- The `gce_sd_configs` block also supports `filter` and `tag_separator` fields per the official reference. Only `filter` is mentioned (in the new all-zones note); `tag_separator` was not part of the original post and was not added to avoid scope creep.
- The OneUptime `remote_write` snippet is illustrative; the URL/auth scheme were not validated against OneUptime's API docs since this is product-marketing content and not the focus of the technical review.
- Workload Identity binding command syntax (`iam service-accounts add-iam-policy-binding` with `roles/iam.workloadIdentityUser` and the `PROJECT.svc.id.goog[NS/KSA]` member format) is current and correct.
