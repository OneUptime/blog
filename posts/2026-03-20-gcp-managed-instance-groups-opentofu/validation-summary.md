# Validation Summary: How to Create GCP Managed Instance Groups with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Platform (GCP)
- Google Compute Engine Managed Instance Groups (MIGs)
- OpenTofu
- HashiCorp Google provider
- HTTP health checks
- Rolling updates

## Sources Consulted
- HashiCorp Google provider docs for `google_compute_instance_group_manager`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_instance_group_manager.html.markdown
- HashiCorp Google provider docs for `google_compute_region_instance_group_manager`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_region_instance_group_manager.html.markdown
- HashiCorp Google provider docs for `google_compute_health_check`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_health_check.html.markdown
- Google Cloud docs on rolling out updates to managed instance groups: https://cloud.google.com/compute/docs/instance-groups/rolling-out-updates-to-managed-instance-groups
- Google Cloud REST reference for `regionInstanceGroupManagers.patch`: https://cloud.google.com/compute/docs/reference/rest/v1/regionInstanceGroupManagers/patch
- Google Cloud docs on regional MIG distribution behavior: https://cloud.google.com/compute/docs/instance-groups/regional-mig-distribution-shape
- Google Cloud docs on backend services and named ports: https://cloud.google.com/load-balancing/docs/backend-service

## Issues Found
- The rolling update example used `max_unavailable_fixed = 0`, but the Google provider and Compute Engine API document fixed `maxUnavailable` values as positive integers. I changed it to `max_unavailable_fixed = 1`.
- The rolling update example omitted `target_size`, which defaults the managed instance group to `0` instances in the Google provider. I added `target_size = 3` so the example actually provisions instances and matches the deployment-focused explanation.
- The rolling update example and summary described the configuration as "zero-downtime," which was too strong after correcting the update policy. I changed that wording to describe reduced disruption instead.
- The named port comment implied the named port was specifically for health checks. I corrected the comment to reflect its primary use with load balancer backend services.

## Review Notes
The examples use `self_link` for instance templates, which is valid, though the Google provider documentation recommends `self_link_unique` when referencing instance templates in managed instance groups. No change was required for correctness.
