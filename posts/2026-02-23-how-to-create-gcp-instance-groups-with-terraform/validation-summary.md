# Validation Summary: How to Create GCP Instance Groups with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- HashiCorp Google provider (~> 5.0)
- Google Cloud Platform (GCP) Compute Engine
- Managed Instance Groups (MIGs) — regional and zonal
- Unmanaged Instance Groups
- Instance Templates
- Compute Autoscalers (CPU, load balancing, custom metrics)
- Compute Health Checks
- Compute Backend Services (External Managed load balancing)
- Shielded VM
- IAM Service Accounts

## Sources Consulted
- Terraform google provider — `google_compute_instance_template`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_template
- Terraform google provider — `google_compute_region_instance_group_manager`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_instance_group_manager
- Terraform google provider — `google_compute_instance_group_manager`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_group_manager
- Terraform google provider — `google_compute_region_autoscaler`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_autoscaler
- Terraform google provider — `google_compute_health_check`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_health_check
- Terraform google provider — `google_compute_backend_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service
- Terraform google provider — `google_compute_instance_group`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_group
- GCP Compute Engine docs — Instance groups overview: https://cloud.google.com/compute/docs/instance-groups
- GCP Compute Engine docs — Canary updates on MIGs: https://cloud.google.com/compute/docs/instance-groups/rolling-out-updates-to-managed-instance-groups

## Issues Found
- **Canary deployment `version` blocks missing `name`.** The two-version `google_compute_region_instance_group_manager.web_canary` resource defined two `version` blocks without `name`. The GCP API requires unique `versions[].name` values when a MIG has multiple versions, so the apply would fail. Added `name = "primary"` and `name = "canary"` to the respective blocks.

## Review Notes
- The `region` argument on `google_compute_instance_template` is valid (the resource itself is global, but `region` restricts it to a region when regional resources are referenced). Verified — left as-is.
- The post uses `self_link_unique` which exists on `google_compute_instance_template` but does NOT exist on `google_compute_region_instance_template`. If a reader switches to the regional template resource, they would need to use `self_link` instead. Not a current issue but a future-proofing caveat.
- `distribution_policy_target_shape = "EVEN"` is valid; other valid values are `BALANCED`, `ANY`, `ANY_SINGLE_ZONE`.
- All `update_policy` action values (`PROACTIVE`, `REPLACE`, `SUBSTITUTE`) are valid.
- Autoscaler `metric.type = "DELTA_PER_SECOND"` and `scale_in_control` block structure are correct per current provider schema.
- `load_balancing_scheme = "EXTERNAL_MANAGED"` (global external Application Load Balancer / regional external Application Load Balancer) is valid.
- The legacy `http_health_check` block on the modern `google_compute_health_check` resource is correct (not to be confused with the deprecated `google_compute_http_health_check` standalone resource).
- The post references `google_compute_network.main` and `google_compute_subnetwork.web` without defining them, but explicitly frames each snippet as a focused example, so this is acceptable for a guide of this scope.
