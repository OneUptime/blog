# Validation Summary: How to Deploy Highly Available Applications with OpenTofu on GCP

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Google Cloud Compute Engine
- Regional Managed Instance Groups (MIGs)
- Google Cloud autoscaling
- Google Cloud health checks and MIG autohealing
- Google Cloud backend services / HTTP(S) load balancing
- OpenTofu / Terraform-style HCL

## Sources Consulted
- Google Cloud: About regional MIGs: https://cloud.google.com/compute/docs/instance-groups/regional-migs
- Google Cloud: Create a MIG with VMs in multiple zones in a region: https://cloud.google.com/compute/docs/instance-groups/distributing-instances-with-regional-instance-groups
- Google Cloud: Automatically apply VM configuration updates in a MIG: https://cloud.google.com/compute/docs/instance-groups/rolling-out-updates-to-managed-instance-groups
- Google Cloud: Set up an application-based health check and autohealing: https://cloud.google.com/compute/docs/instance-groups/autohealing-instances-in-migs
- Google Cloud: Autoscaling groups of instances: https://cloud.google.com/compute/docs/autoscaler
- Google Cloud: Scaling based on load balancing serving capacity: https://cloud.google.com/compute/docs/autoscaler/scaling-load-balancing
- Google Cloud: Backend services overview: https://cloud.google.com/load-balancing/docs/backend-service
- Terraform Google provider: `google_compute_region_instance_group_manager`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_region_instance_group_manager.html.markdown
- Terraform Google provider: `google_compute_region_autoscaler`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_region_autoscaler.html.markdown
- Terraform Google provider: `google_compute_backend_service`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_backend_service.html.markdown
- Terraform Google provider: `google_compute_health_check`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_health_check.html.markdown

## Issues Found
- The post said a regional MIG "spans all zones in the region automatically." That is not how regional MIGs behave by default. Google Cloud documents that a regional MIG uses 3 zones by default unless you explicitly select more or fewer zones. I corrected the prose and inline comment to match the documented behavior.
- The `google_compute_region_instance_group_manager` example set `target_size` while also attaching a regional autoscaler. The provider documentation warns that `target_size` will fight autoscaler-managed sizes unless Terraform ignores later changes. I added `lifecycle.ignore_changes = [target_size]` so the initial size can seed creation without conflicting with autoscaling.
- The backend service example was missing `port_name`. The Terraform Google provider requires `port_name` when the backend service uses the default `EXTERNAL` load balancing scheme with instance group backends. I added `port_name = "http"` to match the MIG's named port.
- The summary misdescribed `initial_delay_sec` as a window in which failed health checks trigger replacement. Google Cloud documents the opposite: unsuccessful health checks are ignored during the initial delay so new instances are not recreated prematurely. I corrected that explanation.
- The summary said `connection_draining_timeout_sec` "ensures" in-flight requests complete. That overstates the behavior. Connection draining gives existing requests time to finish while new connections are stopped; it does not guarantee completion beyond the configured timeout. I corrected the wording.
- The overview overstated the scope of the shown code by implying it provisions the complete HA stack. The code in the post provisions the regional MIG, health checks, autoscaling, and backend service components; I narrowed the wording to match what is actually shown.

## Review Notes
- The post uses one `google_compute_health_check` resource for both load balancing and autohealing. That is supported, but Google Cloud recommends using a more conservative health check for autohealing than for load balancing to reduce the chance of premature VM recreation.
- The backend service uses `balancing_mode = "UTILIZATION"` together with autoscaling on load-balancing utilization. This is supported, but readers should define backend serving-capacity targets carefully when adapting the example to production traffic patterns.
- OpenTofu/Terraform CLI validation was not run in this workspace because neither `tofu` nor `terraform` is installed here. The review was performed against current Google Cloud and Terraform Google provider documentation.
