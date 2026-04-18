# Validation Summary: How to Configure GCP Cloud VPN with OpenTofu

## Status
validated

## Post Type
Tutorial / Infrastructure-as-Code guide

## Technologies Covered
- OpenTofu / Terraform (HashiCorp Configuration Language)
- Google Cloud Platform (GCP)
- GCP Cloud VPN (HA VPN)
- GCP Cloud Router
- BGP (dynamic routing)
- IPsec / IKEv2
- `hashicorp/google` Terraform provider resources:
  - `google_compute_ha_vpn_gateway`
  - `google_compute_external_vpn_gateway`
  - `google_compute_router`
  - `google_compute_vpn_tunnel`
  - `google_compute_router_interface`
  - `google_compute_router_peer`

## Sources Consulted
- Terraform `hashicorp/google` provider docs for `google_compute_ha_vpn_gateway` (https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_ha_vpn_gateway)
- Terraform docs for `google_compute_external_vpn_gateway` (https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_external_vpn_gateway)
- Terraform docs for `google_compute_router` and its `bgp.advertised_ip_ranges` block (https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router)
- Terraform docs for `google_compute_vpn_tunnel` (https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_vpn_tunnel)
- Terraform docs for `google_compute_router_interface` and `google_compute_router_peer`
- Terraform docs for `google_compute_network` (resource) and `data.google_compute_network` (data source) exported attributes
- GCP HA VPN documentation (https://cloud.google.com/network-connectivity/docs/vpn/concepts/overview) — HA VPN 99.99% SLA, two-interface topology, /30 link-local BGP IPs (169.254.x.x)

## Issues Found
1. **Invalid `advertised_ip_ranges.range` value in the Cloud Router example.** The original code used `range = google_compute_network.main.subnetworks_self_links[0]`, which is broken on two levels:
   - The `subnetworks_self_links` attribute does **not** exist on the `google_compute_network` *resource* — it is only exported by the `data.google_compute_network` *data source*. Referencing it on the resource would fail at plan time with an "unsupported attribute" error.
   - Even if the attribute existed there, it returns self-link URLs (e.g. `https://www.googleapis.com/compute/v1/projects/.../subnetworks/...`), whereas `range` requires a CIDR-formatted string (per the provider docs: *"The value must be a CIDR-formatted string."*). Passing a URL would be rejected by the API.

   **Fix applied:** replaced the bad expression with a literal CIDR (`"10.100.0.0/16"`) and updated the comment to clarify the field expects a CIDR string. This keeps the example valid and self-contained without introducing a new subnetwork resource.

## Review Notes
- The rest of the configuration is technically accurate:
  - `redundancy_type` values (`TWO_IPS_REDUNDANCY`, `SINGLE_IP_INTERNALLY_REDUNDANT`, `FOUR_IPS_REDUNDANCY`) are all valid.
  - `stack_type` values (`IPV4_ONLY`, `IPV4_IPV6`) are valid. The provider also supports `IPV6_ONLY`, which the post doesn't mention — not an error, just not exhaustive.
  - `vpn_interfaces[i].ip_address` output reference is correct.
  - BGP link-local convention (`169.254.x.1/30` on Cloud Router, `.2` on peer) is correct per GCP docs.
  - `advertised_route_priority`: lower = preferred; the comment that "higher value = lower preference (backup)" is correct.
  - ASN `65001` is a valid private ASN in the RFC 6996 range (64512–65534), though Classic VPN/HA VPN defaults to `64514`; any private ASN works.
- The `google_compute_router` block combines `advertised_groups = ["ALL_SUBNETS"]` with a custom `advertised_ip_ranges` entry — this is a legitimate pattern in `advertise_mode = "CUSTOM"` to advertise all VPC subnets *plus* an additional CIDR.
- Readers wanting to drive `range` dynamically from their VPC should reference `google_compute_subnetwork.<name>.ip_cidr_range` rather than a network self-link.
