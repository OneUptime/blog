# Validation Summary: How to Configure VPN Connections on GCP with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide — Infrastructure-as-Code walkthrough showing how to provision a GCP Classic Cloud VPN stack with OpenTofu.

## Technologies Covered
- OpenTofu (CLI: `tofu init`, `tofu plan`, `tofu apply`)
- HashiCorp Configuration Language (HCL)
- Google Cloud Platform (GCP)
- Google Cloud VPN (Classic / Target VPN Gateway)
- Google Compute Engine networking primitives: VPC networks, subnetworks, static external addresses, forwarding rules, IPsec VPN tunnels, and routes
- IPsec / IKE protocol basics (ESP, UDP 500, UDP 4500)

## Sources Consulted
- hashicorp/google Terraform provider registry documentation:
  - `google_compute_network` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network
  - `google_compute_subnetwork` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork
  - `google_compute_vpn_gateway` (Classic) — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_vpn_gateway
  - `google_compute_address` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_address
  - `google_compute_forwarding_rule` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_forwarding_rule
  - `google_compute_vpn_tunnel` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_vpn_tunnel
  - `google_compute_route` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_route
- Google Cloud VPN product documentation — https://cloud.google.com/network-connectivity/docs/vpn/concepts/overview
- OpenTofu CLI reference — https://opentofu.org/docs/cli/

## Issues Found
No technical issues found. Every resource name, argument, and attribute used in the post is valid and correctly spelled against the current hashicorp/google provider. The overall Classic VPN pattern (one `google_compute_vpn_gateway` + three `google_compute_forwarding_rule` resources for ESP / UDP 500 / UDP 4500 + `google_compute_vpn_tunnel` with `target_vpn_gateway` + `google_compute_route` with `next_hop_vpn_tunnel`) matches Google's documented canonical topology for Classic VPN.

## Review Notes
- **Classic VPN vs HA VPN:** The post uses `google_compute_vpn_gateway`, which is the Classic (Target VPN Gateway) resource. Google has partially deprecated Classic VPN in favor of HA VPN (`google_compute_ha_vpn_gateway` + `google_compute_external_vpn_gateway`), which offers a 99.99% SLA and removes the need to manually manage ESP/UDP forwarding rules. Classic VPN is still fully supported by the provider and by GCP, but future posts or follow-ups on this topic may want to cover HA VPN as the modern default. This is a forward-looking note, not a correctness issue.
- **BGP / dynamic routing:** The post uses a static `google_compute_route` for the on-prem CIDR. This is correct for a policy-based / static-routed tunnel. If the tunnel needed dynamic routing, a `google_compute_router` + `google_compute_router_peer` pair would be required — out of scope here.
- **`shared_secret` handling:** The post sources the IPsec pre-shared key from a variable (`var.vpn_shared_key`), which is the right pattern. Readers should be reminded (in a future revision) to mark it `sensitive = true` and keep it out of VCS, but this is a stylistic/ops suggestion, not a technical error.
- **`port_range` as string:** Correctly quoted (`"500"`, `"4500"`) — the provider expects a string, not an integer.
