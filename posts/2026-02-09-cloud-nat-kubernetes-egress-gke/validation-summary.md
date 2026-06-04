# Validation Summary: How to Configure Cloud NAT for Kubernetes Egress Traffic on GKE

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Cloud NAT / Public NAT
- Cloud Router
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- Kubernetes Pods and NetworkPolicy
- Cloud Logging
- Cloud Monitoring
- Workload Identity Federation for GKE
- BigQuery billing export

## Sources Consulted
- Google Cloud NAT overview: https://docs.cloud.google.com/nat/docs/overview
- Google Cloud NAT GKE example: https://docs.cloud.google.com/nat/docs/gke-example
- Google Cloud NAT IP addresses and ports: https://docs.cloud.google.com/nat/docs/ports-and-addresses
- Google Cloud NAT logs and metrics: https://docs.cloud.google.com/nat/docs/monitoring
- Google Cloud NAT pricing: https://cloud.google.com/nat/pricing
- Google Cloud SDK `gcloud compute routers nats create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/nats/create
- Google Cloud SDK `gcloud compute routers nats update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/nats/update
- Google Cloud SDK `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- GKE private cluster / network isolation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/legacy/network-isolation
- GKE Workload Identity Federation concepts: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Terraform Google provider `google_compute_router_nat`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router_nat
- Terraform Google provider `google_compute_firewall`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall

## Issues Found
- Corrected the Cloud Router description. Cloud Router provides Cloud NAT control-plane configuration, but Cloud Routers don't forward packets.
- Changed `--nat-custom-subnet-ip-ranges=my-subnet` to `--nat-custom-subnet-ip-ranges=my-subnet:ALL` so the GKE subnet's primary and secondary ranges are included.
- Replaced the NAT test pod image `curlimages/curl` with `nicolaka/netshoot` because the example uses `nslookup`, which is not reliably available in the curl image.
- Changed the Terraform dynamic port allocation example to set `enable_endpoint_independent_mapping = false`, because Cloud NAT cannot use dynamic port allocation when endpoint-independent mapping is enabled.
- Corrected the Cloud Monitoring metric type from `router.googleapis.com/nat/nat_allocation_failed` to `compute.googleapis.com/nat/nat_allocation_failed`.
- Replaced invalid `gcloud alpha monitoring policies create` threshold flags with the current `gcloud monitoring policies create` flags: `--condition-filter`, `--duration`, and `--if`.
- Replaced the Workload Identity metadata-server firewall example with a Kubernetes NetworkPolicy example. GKE metadata-server traffic stays on the node and is not enabled by Cloud NAT; restrictive NetworkPolicies are the relevant control to adjust.
- Corrected the Cloud NAT pricing bullets to mention NAT gateway usage based on assigned VM instances, data processing, and Public NAT external IP address usage.

## Review Notes
- The local environment did not have `gcloud`, `kubectl`, or `terraform` installed, so CLI and Terraform checks were performed against official documentation rather than local command help.
- The article uses placeholder resources such as `my-vpc`, `my-subnet`, `CHANNEL_ID`, and billing export dataset names. These are appropriate for a tutorial but must be replaced in a real deployment.
