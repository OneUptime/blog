# Validation Summary: How to Plan IPv4 CIDR Allocation for Multi-Region GCP Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud VPC networking
- IPv4 CIDR planning
- VPC Network Peering
- Shared VPC
- Google Kubernetes Engine (GKE) networking
- `gcloud` CLI
- YAML configuration

## Sources Consulted
- Google Cloud VPC networks documentation: https://cloud.google.com/vpc/docs/vpc
- Google Cloud subnet documentation: https://cloud.google.com/vpc/docs/subnets
- Google Cloud VPC Network Peering documentation: https://cloud.google.com/vpc/docs/vpc-peering
- Google Cloud Shared VPC documentation: https://cloud.google.com/vpc/docs/shared-vpc
- `gcloud compute networks subnets create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/create
- `gcloud compute networks subnets list` reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/list
- GKE VPC-native clusters and alias IP ranges: https://cloud.google.com/kubernetes-engine/docs/concepts/alias-ips
- GKE Pod CIDR and max-pods-per-node planning: https://cloud.google.com/kubernetes-engine/docs/how-to/flexible-pod-cidr

## Issues Found
- The post described the VPC as if it had a single enforced parent CIDR (`10.0.0.0/8`). In Google Cloud custom mode VPCs, the network does not have a single parent CIDR; instead, all primary and secondary subnet ranges must be unique within the VPC. I changed the introduction, allocation example labels, registry example, and conclusion to describe a planned allocation block rather than a VPC-level CIDR.
- The subnet creation example attached GKE secondary ranges to `app-uscentral` with primary range `10.1.2.0/24`, which did not match the earlier `gke-nodes` allocation and did not reflect how GKE uses the cluster subnet's primary range for node IPs. I changed the example and registry entry to `gke-uscentral` with primary range `10.1.10.0/22` and the same Pod and Service secondary ranges.
- The peering example overlapped `prod-vpc: 10.0.0.0/8` with `on-premises: 10.200.0.0/16`, which would violate the non-overlap rules called out in Google Cloud's VPC peering documentation. I changed the prod allocation block to `10.0.0.0/12` so the example is internally consistent.
- The GKE secondary range sizing table understated Pod CIDR requirements and treated Service secondary ranges as universally required. I replaced it with examples that match current GKE documentation for Standard clusters and added the current note that Autopilot 1.27+ and Standard 1.29+ can use the GKE-managed `34.118.224.0/20` Service range by default.

## Review Notes
- The post now correctly treats the top-level block as a planning construct, not a Google Cloud-enforced VPC CIDR.
- The note about the GKE-managed Service range is version-specific: it applies to Autopilot 1.27+ and Standard 1.29+. Older clusters, and environments where you choose user-managed Service ranges, still require explicit Service CIDR planning.
