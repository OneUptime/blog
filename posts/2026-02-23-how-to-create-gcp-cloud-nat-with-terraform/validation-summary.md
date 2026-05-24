# Validation Summary: How to Create GCP Cloud NAT with Terraform

## Status
validated

## Post Type
Tutorial / Technical How-To Guide

## Technologies Covered
- Terraform (HashiCorp Google provider ~> 5.0)
- Google Cloud Platform (GCP) Cloud NAT
- GCP Cloud Router
- GCP VPC Networks and Subnetworks
- GCP Compute Engine (static external IP addresses)
- GCP Cloud Monitoring (alert policies)
- Google Kubernetes Engine (GKE) — secondary IP ranges for pods/services

## Sources Consulted
- Terraform Registry — google_compute_router_nat: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router_nat
- Terraform Registry — google_compute_router: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router
- Terraform Registry — google_compute_subnetwork: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork
- Terraform Registry — google_compute_address: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_address
- Terraform Registry — google_monitoring_alert_policy: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy
- GCP Cloud NAT Overview: https://cloud.google.com/nat/docs/overview
- GCP Cloud NAT Monitoring (metrics and logs): https://cloud.google.com/nat/docs/monitoring
- GCP Cloud NAT Ports and Connections: https://cloud.google.com/nat/docs/ports-and-addresses

## Issues Found
No technical issues found.

All resource names, attribute names, enum values, and defaults match the current Terraform Google provider documentation and GCP Cloud NAT documentation:

- `google_compute_router_nat` attributes (`nat_ip_allocate_option`, `source_subnetwork_ip_ranges_to_nat`, `nat_ips`, `min_ports_per_vm`, `max_ports_per_vm`, `enable_dynamic_port_allocation`, `enable_endpoint_independent_mapping`, timeout fields, `log_config`) — all valid.
- `subnetwork` nested block attributes (`name`, `source_ip_ranges_to_nat`, `secondary_ip_range_names`) — all valid.
- Enum values used (AUTO_ONLY, MANUAL_ONLY, ALL_SUBNETWORKS_ALL_IP_RANGES, LIST_OF_SUBNETWORKS, ALL_IP_RANGES, PRIMARY_IP_RANGE, LIST_OF_SECONDARY_IP_RANGES, ERRORS_ONLY, TRANSLATIONS_ONLY, ALL) — all valid.
- Default `min_ports_per_vm` of 64 (for static allocation) — correct.
- Default `tcp_established_idle_timeout_sec` of 1200 — correct.
- Max `max_ports_per_vm` of 65536 (must be a power of 2) — correct.
- Cloud Monitoring resource type `nat_gateway` and the metric `router.googleapis.com/nat/nat_allocation_failed` — correct.
- Conceptual claim that Cloud NAT uses Cloud Router only for the control plane (no BGP for NAT data plane) — correct per GCP docs.
- Cloud Run integration via Serverless VPC Access — correct.

## Review Notes
- The post uses `google_compute_subnetwork.X.id` rather than `.self_link` in the NAT `subnetwork.name` field. Both work in current Terraform google provider versions because `.id` resolves to the partial resource URL (`projects/.../regions/.../subnetworks/...`), which GCP's NAT API accepts. `.self_link` is more idiomatic in some examples but the current usage is correct.
- Note: When `enable_dynamic_port_allocation` is true, the effective default `min_ports_per_vm` is 32 (not 64). The post's general statement about default = 64 is correct for the static (default) allocation case discussed in that section.
- Note: `enable_dynamic_port_allocation` cannot be combined with `enable_endpoint_independent_mapping = true`. The post correctly does not combine these in the same resource (the high-throughput example uses dynamic port allocation without enabling endpoint-independent mapping; the manual-IP example uses endpoint-independent mapping without dynamic port allocation).
- The post mentions `source_subnetwork_ip_ranges_to_nat` values `ALL_SUBNETWORKS_ALL_IP_RANGES` and `LIST_OF_SUBNETWORKS`. A third valid value, `ALL_SUBNETWORKS_ALL_PRIMARY_IP_RANGES`, also exists but is not needed for the scenarios the post covers — no inaccuracy here, just an option not mentioned.
- The monitoring section references metric short names (e.g., `nat_allocation_failed`, `dropped_sent_packets_count`, `open_connections`). Full metric paths are prefixed with `router.googleapis.com/nat/` (as correctly shown in the alert policy filter). This is consistent with how GCP docs present these metrics.
