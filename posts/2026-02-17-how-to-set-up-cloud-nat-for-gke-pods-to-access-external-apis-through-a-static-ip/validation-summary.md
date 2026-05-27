# Validation Summary: How to Set Up Cloud NAT for GKE Pods to Access External APIs Through a Static IP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud NAT
- Google Kubernetes Engine (GKE)
- Cloud Router
- Google Cloud CLI (`gcloud`)
- Kubernetes CLI (`kubectl`)
- Terraform Google provider
- Cloud Monitoring and Cloud Logging

## Sources Consulted
- Google Cloud NAT overview: https://docs.cloud.google.com/nat/docs/overview
- Google Cloud NAT IP addresses and ports: https://docs.cloud.google.com/nat/docs/ports-and-addresses
- Google Cloud NAT logs and metrics: https://docs.cloud.google.com/nat/docs/monitoring
- Google Cloud NAT tuning guide: https://docs.cloud.google.com/nat/docs/tune-nat-configuration
- Google Cloud NAT troubleshooting: https://docs.cloud.google.com/nat/docs/troubleshooting
- Google Cloud Public NAT with GKE: https://docs.cloud.google.com/nat/docs/gke-example
- Google Cloud Public NAT documentation: https://docs.cloud.google.com/nat/docs/public-nat
- GKE private cluster / network isolation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/legacy/network-isolation
- `gcloud compute routers nats create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/routers/nats/create
- `gcloud compute routers nats update` reference: https://cloud.google.com/sdk/gcloud/reference/compute/routers/nats/update
- `gcloud alpha monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create
- Terraform `google_compute_router_nat` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router_nat

## Issues Found
- The architecture description incorrectly showed Cloud Router as part of the packet data path and said it directs outbound traffic to Cloud NAT. Updated the diagram and text to clarify that Cloud Router hosts the Cloud NAT configuration, while Cloud NAT performs the address translation.
- The post said all outbound pod traffic goes through Cloud NAT. Updated this to outbound internet traffic from covered GKE subnet and pod ranges, which matches Cloud NAT scope.
- The Cloud NAT creation commands later relied on NAT logs but did not enable logging. Added `--enable-logging` and `--log-filter=ERRORS_ONLY` to the `gcloud compute routers nats create` examples.
- The port capacity wording described each NAT IP as supporting about 64,000 concurrent connections. Updated it to about 64,000 source ports, which is the more accurate Cloud NAT model.
- The NAT log query filtered `resource.labels.router_id` by router name, but Cloud NAT resource `router_id` is an ID, not the router name. Updated the query to filter by `jsonPayload.gateway_identifiers.router_name` and `jsonPayload.gateway_identifiers.gateway_name`.
- The Cloud Monitoring alert command used unsupported flags (`--condition-threshold-value` and `--condition-threshold-comparison`) for `gcloud alpha monitoring policies create`. Replaced it with the documented `--condition-display-name`, `--condition-filter`, `--duration`, and `--if` flags.
- The alert example used the `router.googleapis.com/nat/port_usage` metric with a fractional `0.8` threshold, but the documented metric is a port count rather than a utilization ratio. Updated the alert to use `router.googleapis.com/nat/nat_allocation_failed` with a threshold of `> 0`.
- The private cluster section implied Cloud NAT is required for all API/package access. Updated wording to specify public internet destinations, because Google API access can also depend on Private Google Access and related configuration.

## Review Notes
The remaining examples are region and network-name placeholders and assume a VPC-native GKE cluster whose pod ranges are included in the Cloud NAT configuration. The Terraform snippet references an existing `google_compute_network.vpc` resource that is not shown, which is acceptable for a focused excerpt but should be called out if the post is expanded into a fully copy-pasteable Terraform module.
