# Validation Summary: How to Create a GCP VPC Network with Custom IPv4 Subnets

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Google Cloud Platform (GCP)
- GCP Virtual Private Cloud (VPC)
- gcloud CLI (`gcloud compute networks`, `gcloud compute networks subnets`)
- IPv4 networking / CIDR
- Private Google Access
- BGP routing modes (global vs regional)

## Sources Consulted
- gcloud reference: `gcloud compute networks create` — https://cloud.google.com/sdk/gcloud/reference/compute/networks/create
- gcloud reference: `gcloud compute networks subnets create` — https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/create
- gcloud reference: `gcloud compute networks subnets update` — https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- gcloud reference: `gcloud compute networks subnets expand-ip-range` — https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/expand-ip-range
- GCP VPC overview — https://cloud.google.com/vpc/docs/vpc
- GCP MTU documentation — https://cloud.google.com/vpc/docs/mtu (default 1460 confirmed)
- Private Google Access docs — https://cloud.google.com/vpc/docs/private-google-access

## Issues Found
No technical issues found. All gcloud commands, flags, and option values are correct:
- `--subnet-mode=custom` is the correct value for custom mode VPCs.
- `--bgp-routing-mode=global` is a valid option.
- `--mtu=1460` is GCP's default MTU value.
- `--enable-private-ip-google-access` is the correct flag for `subnets update`.
- `expand-ip-range --prefix-length=23` syntax is correct, and the constraint that the new range must be a superset of the old one is accurate.
- The cross-cloud comparison table is accurate: GCP VPCs are global with regional subnets, AWS VPCs are regional with AZ-scoped subnets, and Azure VNets are regional with regional subnets.

## Review Notes
- GCP also supports MTUs of 1500 and 8896 (jumbo frames) in addition to 1460; the post's choice to explicitly pass `--mtu=1460` is fine but is also the implicit default if omitted.
- The `--filter="network:prod-vpc"` syntax filters by partial match on the network field; for an exact match users may prefer `--network=prod-vpc` (also a supported flag on `subnets list`). Both are valid.
- The post does not cover firewall rules, which are often a necessary follow-up step to make a VPC usable, but this is out of scope for the post's stated focus on creating the VPC and subnets.
