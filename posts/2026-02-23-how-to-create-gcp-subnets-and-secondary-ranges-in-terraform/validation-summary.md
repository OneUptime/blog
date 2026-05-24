# Validation Summary: How to Create GCP Subnets and Secondary Ranges in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- hashicorp/google provider (~> 5.0)
- Google Cloud Platform (GCP)
- VPC networks (`google_compute_network`)
- Subnets (`google_compute_subnetwork`)
- GKE / `google_container_cluster` (VPC-native clusters)
- Secondary IP ranges (alias IPs)
- VPC Flow Logs
- Private Google Access
- Proxy-only subnets (regional managed proxy for internal HTTP(S) load balancers)
- Private Service Connect

## Sources Consulted
- Terraform `google_compute_subnetwork` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork
- Terraform `google_compute_network` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network
- Terraform `google_container_cluster` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- GCP Regions and Zones: https://cloud.google.com/compute/docs/regions-zones
- GKE alias IPs / pod CIDR per node: https://cloud.google.com/kubernetes-engine/docs/concepts/alias-ips
- Proxy-only subnets for internal load balancers: https://cloud.google.com/load-balancing/docs/proxy-only-subnets
- VPC Flow Logs configuration: https://cloud.google.com/vpc/docs/using-flow-logs

## Issues Found
No technical issues found. All code examples, resource arguments, valid value sets, and CIDR math check out:

- `us-central1` zones (a, b, c, f) listing is correct.
- `google_compute_subnetwork` arguments — `purpose`, `stack_type = "IPV4_ONLY"`, `private_ip_google_access`, `secondary_ip_range`, `log_config` (with `flow_sampling`, `aggregation_interval`, `metadata`, `filter_expr`), `role = "ACTIVE"` for `REGIONAL_MANAGED_PROXY` — all valid.
- `google_compute_network` arguments — `auto_create_subnetworks`, `routing_mode = "GLOBAL"`, `delete_default_routes_on_create` — all valid.
- `google_container_cluster` configuration — `ip_allocation_policy` with `cluster_secondary_range_name` / `services_secondary_range_name`, `remove_default_node_pool` with `initial_node_count = 1`, `private_cluster_config` — all valid.
- CIDR sizing math is correct: /14 = 262,144 IPs, /20 = 4,096 IPs, /24 = 256 IPs.
- GKE pod-per-node /24 default claim is accurate.
- Secondary ranges in the multi-region example (`10.16.0.0/14` + `10.20.0.0/20`, `10.24.0.0/14` + `10.28.0.0/20`) do not overlap.

## Review Notes
- For `purpose = "PRIVATE"` on a regular subnet: the underlying API accepts both `PRIVATE` and `PRIVATE_RFC_1918` as aliases. Earlier v5.x provider docs used `PRIVATE_RFC_1918`; later v5.x and v6.x switched to `PRIVATE` as the canonical name. The pin `~> 5.0` includes the later 5.x versions where `PRIVATE` is correct, so this is fine, but readers on the earliest 5.0.x versions may see slightly different docs.
- `ip_allocation_policy` is not strictly required in the Terraform schema — but since routes-based GKE clusters are deprecated and VPC-native is the only supported mode for new clusters, in practice it should always be set. The post implicitly assumes this, which is appropriate.
- `delete_default_routes_on_create = false` is paired with a comment that reads as if it would delete default routes. The comment is describing the field's purpose, not the effect of the chosen value; the actual behavior with `false` is to keep the default routes. Slightly awkward but not technically wrong.
- The pod range sizing comment "/14 gives ~250,000 pod IPs" is rounded from the exact 262,144; the exact figure is given later in the post. Not an error.
- The IP planning section uses /12 for pods and /16 for services as a high-level template, which is broader than the per-subnet /14 / /20 in the example. This is intentional planning headroom and the ranges nest correctly, so it's not inconsistent.
