# Validation Summary: How to Configure GCP Managed Instance Groups with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-style HCL
- Google Cloud Compute Engine
- Managed Instance Groups (regional MIGs)
- Instance templates
- Autoscaling
- Health checks
- Backend services / load balancing

## Sources Consulted
- Google provider docs: `google_compute_instance_template`  
  https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_instance_template.html.markdown
- Google provider docs: `google_compute_region_instance_group_manager`  
  https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_region_instance_group_manager.html.markdown
- Google provider docs: `google_compute_region_autoscaler`  
  https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_region_autoscaler.html.markdown
- Google provider docs: `google_compute_backend_service`  
  https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_backend_service.html.markdown
- Google Cloud: Autoscaling groups of instances  
  https://cloud.google.com/compute/docs/autoscaler
- Google Cloud: Scale based on Monitoring metrics  
  https://cloud.google.com/compute/docs/autoscaler/scaling-cloud-monitoring-metrics
- Google Cloud: Automatically apply VM configuration updates in a MIG  
  https://cloud.google.com/compute/docs/instance-groups/rolling-out-updates-to-managed-instance-groups
- Google Cloud: Stateful managed instance groups  
  https://cloud.google.com/compute/docs/instance-groups/stateful-migs
- Google Cloud: Configuring stateful persistent disks in MIGs  
  https://cloud.google.com/compute/docs/instance-groups/configuring-stateful-disks-in-migs

## Issues Found
- The regional MIG example set `target_size` while also attaching an autoscaler. Provider documentation notes that `target_size` fights autoscaler-managed size on later applies. I kept the initial size and added `lifecycle.ignore_changes = [target_size]` so autoscaling can own the steady-state replica count.
- The `stateful_disk` example was technically inconsistent. The value `/dev/sdb` is a guest OS path, not the MIG disk `device_name`, and the surrounding update policy (`replacement_method = "SUBSTITUTE"` with surge capacity) does not match Google Cloud guidance for stateful MIG rolling updates. I removed the `stateful_disk` block from this otherwise stateless rolling-update example.
- The autoscaler custom metric example used `target` for a queue-depth metric. Google Cloud documents queue-like metrics as a single-instance-assignment use case because they represent total work for the group rather than per-instance utilization. I changed the example to use `single_instance_assignment` and a selective Monitoring filter.
- The canary section described a traffic split, but MIG versions split instances updated to each template, not Layer 7 traffic directly. I changed the wording to describe an instance rollout and added the platform caveat that percentage target sizes require a MIG with at least 10 instances.

## Review Notes
- The updated custom metric example assumes the exported metric includes a `group_name` label that can be used to select a single TimeSeries for the MIG.
- The post remains technically valid as a guide, but a production implementation would still need surrounding resources such as subnetworks, service accounts, and the rest of the load balancer stack.
