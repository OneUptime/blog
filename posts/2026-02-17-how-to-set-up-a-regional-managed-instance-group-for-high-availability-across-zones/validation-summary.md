# Validation Summary: How to Set Up a Regional Managed Instance Group

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Compute Engine managed instance groups
- Regional managed instance groups
- Instance templates
- Compute Engine health checks and autohealing
- Compute Engine autoscaling
- Cloud Load Balancing
- gcloud CLI
- Debian and nginx startup scripts

## Sources Consulted
- Google Cloud: About regional MIGs - https://docs.cloud.google.com/compute/docs/instance-groups/regional-migs
- Google Cloud: Create a MIG with VMs in multiple zones in a region - https://docs.cloud.google.com/compute/docs/instance-groups/distributing-instances-with-regional-instance-groups
- Google Cloud: Regional MIG target distribution shape - https://docs.cloud.google.com/compute/docs/instance-groups/regional-mig-distribution-shape
- Google Cloud: Set a target distribution shape for VMs in a regional MIG - https://docs.cloud.google.com/compute/docs/instance-groups/regional-mig-set-target-distribution-shape
- Google Cloud: Set up application-based health checks and autohealing - https://docs.cloud.google.com/compute/docs/instance-groups/autohealing-instances-in-migs
- Google Cloud SDK: gcloud compute instance-groups managed create - https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/create
- Google Cloud SDK: gcloud compute instance-groups managed update - https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/update
- Google Cloud SDK: gcloud compute instance-groups managed set-autoscaling - https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/set-autoscaling
- Google Cloud SDK: gcloud compute instance-groups managed rolling-action start-update - https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/rolling-action/start-update
- Google Cloud SDK: gcloud compute instance-groups managed set-named-ports - https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/set-named-ports
- Google Cloud SDK: gcloud compute backend-services create - https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Google Cloud Load Balancing: Set up a global external Application Load Balancer with VM instance group backends - https://docs.cloud.google.com/load-balancing/docs/https/setup-global-ext-https-compute
- Google Cloud Load Balancing: Firewall rules - https://docs.cloud.google.com/load-balancing/docs/firewall-rules

## Issues Found
- The post said a regional MIG distributes instances across "up to three zones." Updated this to say a regional MIG distributes across multiple zones, with three zones selected by default unless explicitly configured otherwise.
- The distribution policy section conflated `EVEN` target distribution shape with proactive instance redistribution. Updated the explanation and command to explicitly set `--target-distribution-shape=even` and use the documented lowercase `--instance-redistribution-type=proactive` value.
- The post described proactive redistribution as moving instances between zones. Updated this to clarify that Compute Engine deletes and recreates instances as needed to rebalance.
- The rolling update command used `--min-ready` with the GA `gcloud compute instance-groups managed rolling-action start-update` command. That flag is only shown for the beta variant, so it was removed from the GA example.
- The load balancer setup omitted named port and firewall configuration. Added `set-named-ports`, an explicit health-check firewall rule for the documented Google Cloud probe ranges, and `--port-name=http` on the backend service.

## Review Notes
The remaining examples are technically plausible for a default VPC and a simple HTTP backend. In production, readers should also consider reserving a static global IP address, using HTTPS, choosing overprovisioning based on required surviving capacity, and checking whether they need IPv6 health-check firewall rules.
