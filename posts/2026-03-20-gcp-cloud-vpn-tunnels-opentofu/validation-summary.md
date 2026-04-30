# Validation Summary: How to Create GCP Cloud VPN Tunnels with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu CLI
- Google Cloud HA VPN
- Google Cloud External VPN Gateway
- Google Cloud Router
- BGP
- Google provider resources for OpenTofu/Terraform

## Sources Consulted
- Google Cloud: HA VPN topologies https://cloud.google.com/network-connectivity/docs/vpn/concepts/topologies
- Google Cloud: Create an HA VPN gateway to a peer VPN gateway https://cloud.google.com/network-connectivity/docs/vpn/how-to/creating-ha-vpn
- Google Cloud: Cloud VPN overview https://cloud.google.com/network-connectivity/docs/vpn/concepts/overview
- Google Cloud: Establish BGP sessions https://cloud.google.com/network-connectivity/docs/router/how-to/configuring-bgp
- Google Cloud: Advertised routes https://cloud.google.com/network-connectivity/docs/router/concepts/advertised-routes
- Google provider docs: `google_compute_ha_vpn_gateway` https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_ha_vpn_gateway.html.markdown
- Google provider docs: `google_compute_external_vpn_gateway` https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_external_vpn_gateway.html.markdown
- Google provider docs: `google_compute_router` https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_router.html.markdown
- Google provider docs: `google_compute_vpn_tunnel` https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_vpn_tunnel.html.markdown
- Google provider docs: `google_compute_router_interface` https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_router_interface.html.markdown
- Google provider docs: `google_compute_router_peer` https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_router_peer.html.markdown
- OpenTofu: `plan` command https://opentofu.org/docs/cli/commands/plan/
- OpenTofu: `apply` command https://opentofu.org/docs/v1.9/cli/commands/apply/

## Issues Found
- The introduction overstated the availability claim. Google Cloud documents that HA VPN can provide a 99.99% SLA when tunnels are configured on both HA VPN gateway interfaces, so the wording was corrected to match that requirement.
- The post created two VPN tunnels but only configured one Cloud Router interface and one BGP peer. That left the example incomplete for a two-tunnel HA VPN design using dynamic routing. I added the second `google_compute_router_interface` and `google_compute_router_peer` resources so each tunnel has its own BGP session.
- The summary said the setup used two active tunnels. Because active-active behavior depends on BGP priorities and peer-side configuration, I revised the wording to the technically precise statement that the design uses a tunnel on each HA VPN gateway interface.

## Review Notes
- The resource arguments used in the post are current and valid in the current Google provider documentation.
- `tofu` was not installed in the local review environment, so command verification relied on the official OpenTofu CLI documentation instead of local `--help` output.
- The example uses `shared_secret`, which provider documentation notes is stored in plaintext in state. A future revision could mention `shared_secret_wo` for environments using newer provider/OpenTofu support for write-only arguments.
