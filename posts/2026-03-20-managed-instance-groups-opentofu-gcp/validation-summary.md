# Validation Summary: How to Use Managed Instance Groups with OpenTofu on GCP

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- Google Cloud Compute Engine Managed Instance Groups
- Google Cloud autoscaling
- Google Cloud health checks
- Google Cloud Load Balancing
- HashiCorp Google provider

## Sources Consulted
- Google provider `google_compute_instance_template` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_template
- Google provider `google_compute_region_instance_group_manager` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_instance_group_manager
- Google provider `google_compute_region_autoscaler` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_autoscaler
- Google provider `google_compute_backend_service` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service
- Google provider `google_compute_health_check` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_health_check
- Google Cloud docs, autoscaling based on load balancing serving capacity: https://cloud.google.com/compute/docs/autoscaler/scaling-load-balancing
- Google Cloud docs, autoscaling groups of instances: https://cloud.google.com/compute/docs/autoscaler
- Google Cloud docs, application-based health checks and autohealing for MIGs: https://cloud.google.com/compute/docs/instance-groups/autohealing-instances-in-migs
- Google Cloud docs, rolling updates for managed instance groups: https://cloud.google.com/compute/docs/instance-groups/rolling-out-updates-to-managed-instance-groups
- Google Cloud docs, backend services overview: https://cloud.google.com/load-balancing/docs/backend-service
- Google Cloud docs, troubleshooting managed instance groups: https://cloud.google.com/compute/docs/troubleshooting/troubleshooting-migs

## Issues Found
- The startup script created only `/var/www/html/index.html`, but the configured health check probed `/health`. I added `echo "ok" > /var/www/html/health` so the health check endpoint exists and returns a successful response once Nginx is running.
- The regional MIG example set `target_size = 2` while also attaching a `google_compute_region_autoscaler`. Current provider documentation warns that `target_size` fights autoscaler-managed capacity. I removed `target_size` so `min_replicas` and `max_replicas` remain the source of truth for scaling.

## Review Notes
- The article’s snippets assume surrounding network resources already exist. In practice, custom VPC deployments also need firewall rules that allow Google health-check probes to reach the tagged instances on the application port.
- Because the instance template uses a custom subnetwork and installs packages in the startup script, the example assumes outbound package access is available, such as through Cloud NAT or another egress path.
- The provider constraint `~> 5.0` is older than the current `google` provider major release as of `2026-04-29`, but the reviewed resource arguments and resource types used in the post are still valid.
