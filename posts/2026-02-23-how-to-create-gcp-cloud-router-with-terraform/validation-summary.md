# Validation Summary: How to Create GCP Cloud Router with Terraform

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Terraform (HashiCorp Configuration Language)
- Google Cloud Platform (GCP)
- GCP Cloud Router
- GCP Cloud NAT
- GCP Cloud VPN (HA VPN)
- BGP (Border Gateway Protocol)
- BFD (Bidirectional Forwarding Detection)
- VPC Networking
- hashicorp/google Terraform provider (~> 5.0)

## Sources Consulted
- Terraform Registry: google_compute_router — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router
- Terraform Registry: google_compute_router_nat — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router_nat
- Terraform Registry: google_compute_router_peer — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router_peer
- Terraform Registry: google_compute_router_interface — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router_interface
- Terraform Registry: google_compute_ha_vpn_gateway — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_ha_vpn_gateway
- Terraform Registry: google_compute_external_vpn_gateway — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_external_vpn_gateway
- Terraform Registry: google_compute_vpn_tunnel — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_vpn_tunnel
- Terraform Registry: google_compute_network — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network
- GCP Cloud Router docs — https://cloud.google.com/network-connectivity/docs/router/concepts/overview
- GCP HA VPN docs — https://cloud.google.com/network-connectivity/docs/vpn/concepts/overview
- RFC 6996 (Autonomous System Reservation for Private Use)

## Issues Found
No technical issues found. All resource names, argument names, value enums, and numeric ranges match the official provider/cloud documentation:

- `google_compute_network` with `routing_mode` ("GLOBAL"/"REGIONAL") and `auto_create_subnetworks` — correct.
- `google_compute_router` with `bgp` block fields `asn`, `advertise_mode` (DEFAULT/CUSTOM), `keepalive_interval` (20–60s), `advertised_groups` (only "ALL_SUBNETS"), and `advertised_ip_ranges` block — all correct.
- Private ASN ranges 64512–65534 (2-byte) and 4200000000–4294967294 (4-byte) match RFC 6996.
- `google_compute_router_nat` `nat_ip_allocate_option = "AUTO_ONLY"` and `source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"` — valid enum values.
- `google_compute_external_vpn_gateway` `redundancy_type = "SINGLE_IP_INTERNALLY_REDUNDANT"` — valid value.
- `google_compute_router_peer` with `bfd` block: `session_initialization_mode = "ACTIVE"` valid, `min_receive_interval`/`min_transmit_interval` in range 1000–30000ms, `multiplier` in range 5–16 — all valid.
- Use of link-local 169.254.x.x/30 addressing for BGP sessions over Cloud VPN — matches GCP documented behavior.
- HCL syntax, `for_each` patterns, and output references are syntactically correct.

## Review Notes
- The HA VPN example shows only a single VPN tunnel for clarity. In production, HA VPN with `SINGLE_IP_INTERNALLY_REDUNDANT` typically uses two tunnels (one per HA VPN gateway interface) to achieve the 99.99% SLA. This is acceptable as illustrative content but readers building HA setups should add the second tunnel/peer pair.
- The multi-region example configures BGP on routers that are only used for Cloud NAT. While this is harmless (the BGP session simply has no peer), the post's own best-practices section recommends keeping NAT and VPN routers separate. This is a minor stylistic inconsistency, not a technical error.
- The post pins the provider to `~> 5.0`. As of the validation date, the hashicorp/google provider has newer major versions available; readers may want to use a newer constraint, but the syntax shown remains supported in 5.x and works with later versions for these resources.
- The `router` argument on `google_compute_vpn_tunnel` is set via `.id` while the `router` arguments on `google_compute_router_interface` and `google_compute_router_peer` use `.name`. Both forms are accepted by the provider for their respective resources, so this is correct.
