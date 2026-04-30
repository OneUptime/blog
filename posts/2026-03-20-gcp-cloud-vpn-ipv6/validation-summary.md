# Validation Summary: How to Configure GCP Cloud VPN IPv6

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Google Cloud HA VPN
- Google Cloud Cloud Router
- Google Cloud VPC IPv6
- `gcloud` CLI
- Terraform Google provider
- BGP / MP-BGP
- IPsec / IKEv2

## Sources Consulted
- Google Cloud: Cloud VPN overview - https://docs.cloud.google.com/network-connectivity/docs/vpn/concepts/overview
- Google Cloud: Create an HA VPN gateway to a peer VPN gateway - https://docs.cloud.google.com/network-connectivity/docs/vpn/how-to/creating-ha-vpn
- Google Cloud: Establish BGP sessions - https://docs.cloud.google.com/network-connectivity/docs/router/how-to/configuring-bgp
- Google Cloud: Configure multiprotocol BGP for IPv4 or IPv6 BGP sessions - https://docs.cloud.google.com/network-connectivity/docs/router/how-to/configuring-mp-bgp
- Google Cloud: List BGP routes - https://docs.cloud.google.com/network-connectivity/docs/router/how-to/list-routes
- Google Cloud SDK: `gcloud compute vpn-gateways create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/vpn-gateways/create
- Google Cloud SDK: `gcloud compute networks update` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/update
- Google Cloud SDK: `gcloud compute networks subnets update` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- Google Cloud SDK: `gcloud compute routers add-bgp-peer` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/add-bgp-peer
- Google Cloud SDK: `gcloud compute routers update-bgp-peer` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/update-bgp-peer
- Google Cloud SDK: `gcloud compute routers list-bgp-routes` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/list-bgp-routes
- Google Cloud VPC: Create and manage VPC networks - https://docs.cloud.google.com/vpc/docs/create-modify-vpc-networks
- Google Cloud VPC: Subnets - https://docs.cloud.google.com/vpc/docs/subnets
- Terraform provider docs: `google_compute_ha_vpn_gateway` - https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_ha_vpn_gateway.html.markdown
- Terraform provider docs: `google_compute_subnetwork` - https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_subnetwork.html.markdown
- Terraform provider docs: `google_compute_router_peer` - https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_router_peer.html.markdown
- Terraform provider tests: `google_compute_router_interface` IPv6 coverage - https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/google/services/compute/resource_compute_router_interface_test.go

## Issues Found
- The post implied Cloud VPN IPv6 generically; I changed the introduction and prerequisites to clarify that IPv6 is supported only with HA VPN, not Classic VPN, and that the peer gateway must use IKEv2 and BGP.
- The original workflow omitted the HA VPN gateway stack-type requirement and suggested subnet dual-stack alone was enough. I added the required HA VPN gateway creation step with `--stack-type IPV4_IPV6` and the VPC ULA prerequisite for INTERNAL IPv6 subnets.
- The subnet verification command used `ipv6CidrRange`, which is not the right field for the INTERNAL IPv6 subnet example being shown. I changed it to `internalIpv6Prefix`.
- The original BGP example used an invalid `gcloud compute routers add-bgp-peer` flag (`--address`) and used `2001:db8::` addresses for IPv6 BGP peering. I replaced that with the required `add-interface` step and correct HA VPN IPv6 BGP ULA addresses from `fdff:1::/64`.
- The original learned-route check grepped `gcloud compute routers get-status` output, which is not a reliable validation step. I replaced it with `gcloud compute routers list-bgp-routes ... --address-family IPV6 --route-direction INBOUND`.
- The original Terraform example used `google_compute_router_peer.peer_ip_address` with an IPv6 address. Current provider docs describe `peer_ip_address` as IPv4-only, so I replaced the snippet with a supported Terraform example for an IPv6-capable HA VPN gateway, IPv6-enabled subnet, and Cloud Router.

## Review Notes
- HA VPN gateway stack type is immutable after creation. If an existing gateway was created as `IPV4_ONLY`, it must be recreated to support IPv6.
- For dual-stack HA VPN, IPv6 routes can be exchanged either with a native IPv6 BGP session or by using MP-BGP on an IPv4 BGP session. The updated `gcloud` walkthrough keeps the native IPv6 BGP path.
- If readers want HA VPN interfaces with external IPv6 addresses instead of the default external IPv4 addresses, they must set `--gateway-ip-version=IPV6` in `gcloud` or `gateway_ip_version = "IPV6"` in Terraform.
