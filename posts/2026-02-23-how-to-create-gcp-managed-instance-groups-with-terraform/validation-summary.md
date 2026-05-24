# Validation Summary: How to Create GCP Managed Instance Groups with Terraform

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Terraform (1.0+)
- Terraform Google Provider (hashicorp/google ~> 5.0)
- Google Cloud Platform (GCP)
- GCP Compute Engine
- GCP Managed Instance Groups (zonal and regional)
- GCP Instance Templates
- GCP Health Checks
- GCP Autoscaler (zonal and regional)
- HCL (HashiCorp Configuration Language)
- Debian 12 / nginx (in startup script example)

## Sources Consulted
- Terraform Google Provider docs — `google_compute_instance_template`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_template
- Terraform Google Provider docs — `google_compute_instance_group_manager`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_group_manager
- Terraform Google Provider docs — `google_compute_region_instance_group_manager`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_instance_group_manager
- Terraform Google Provider docs — `google_compute_autoscaler`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_autoscaler
- Terraform Google Provider docs — `google_compute_region_autoscaler`
- Terraform Google Provider docs — `google_compute_health_check`
- GCE API reference for `distributionPolicy.targetShape` enum values

## Issues Found
No technical issues found.

Verified specifically:
- `region` is a valid optional argument on the global `google_compute_instance_template` resource (used to restrict to a region when referencing regional resources).
- `update_policy` fields (`type`, `minimal_action`, `most_disruptive_allowed_action`, `max_surge_fixed`, `max_unavailable_fixed`) and their values are correct.
- `distribution_policy_target_shape = "EVEN"` is a valid value per the underlying GCE API.
- `scale_in_control` block with `max_scaled_in_replicas { fixed = N }` and `time_window_sec` is correctly structured.
- `cpu_utilization.target = 0.6` is in the valid (0, 1] range.
- `google_compute_health_check` fields are valid.
- Canary deployment pattern with two `version` blocks (`stable` + `canary`, each with `target_size.fixed`) is valid syntax for `google_compute_instance_group_manager`.

## Review Notes
- The canary deployment example references `google_compute_instance_template.web_server_canary`, which is not defined in the post. This is acceptable as it is clearly illustrative — readers are expected to provide their own canary template — but a future revision could either define the second template inline or add a one-line note clarifying that the canary template is the reader's responsibility.
- `http_health_check` is functional but the standalone legacy `google_compute_http_health_check` is deprecated in favor of `google_compute_health_check` (which the post correctly uses with a nested `http_health_check` block).
- For regional MIGs, the GCE API requires `max_surge_fixed` to be at least equal to the number of target zones (3 by default); the post's value of 3 satisfies this.
- The `service_account` block uses `scopes = ["cloud-platform"]` without specifying an email, which defaults to the Compute Engine default service account. This works but is broader than necessary in production — a dedicated service account with narrower IAM roles would be more secure. The post's own "minimal permissions" comment is slightly aspirational here, but this is a stylistic refinement rather than a technical error.
