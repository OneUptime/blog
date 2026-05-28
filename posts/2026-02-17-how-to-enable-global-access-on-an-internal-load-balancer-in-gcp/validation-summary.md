# Validation Summary: How to Enable Global Access on an Internal Load Balancer in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Load Balancing
- Internal passthrough Network Load Balancer
- Regional internal Application Load Balancer
- VPC networking and VPC Network Peering
- Cloud DNS private zones
- gcloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud: Internal passthrough Network Load Balancer overview - https://docs.cloud.google.com/load-balancing/docs/internal
- Google Cloud: Set up an internal passthrough Network Load Balancer with VM instance group backends - https://docs.cloud.google.com/load-balancing/docs/internal/setting-up-internal
- Google Cloud: Internal Application Load Balancer overview - https://docs.cloud.google.com/load-balancing/docs/l7-internal
- Google Cloud: Set up a regional internal Application Load Balancer with VM instance group backends - https://docs.cloud.google.com/load-balancing/docs/l7-internal/setting-up-l7-internal
- Google Cloud SDK: gcloud compute forwarding-rules update - https://docs.cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/update
- Google Cloud VPC pricing - https://cloud.google.com/vpc/pricing
- Terraform Registry: google_compute_forwarding_rule - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_forwarding_rule

## Issues Found
- The post said global access for an existing internal HTTP(S) load balancer could be enabled with `gcloud compute forwarding-rules update`. Google Cloud documentation says regional internal Application Load Balancer forwarding rules cannot be modified to enable or disable global access after creation. I changed this to instruct readers to create a replacement forwarding rule with `--allow-global-access` and delete the old rule.
- The cost section said same-region internal traffic is free. Current Google Cloud pricing is more nuanced: global access adds cross-region data transfer charges when the client and load balancer are in different regions, while same-region traffic can still incur normal internal load balancer or VPC data transfer charges depending on topology. I updated the wording accordingly.

## Review Notes
The passthrough internal Network Load Balancer commands and Terraform `allow_global_access` field are consistent with current documentation. The example commands assume prerequisite resources such as backend services, target proxies, subnets, firewall rules, and proxy-only subnets already exist.
