# Validation Summary: How to Set Up a Cloud VPN for IPv4 Connectivity in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Cloud VPN
- HA VPN
- Classic VPN
- Cloud Router
- Border Gateway Protocol (BGP)
- IPsec / IKEv2
- Google Cloud CLI (`gcloud`)

## Sources Consulted
- Google Cloud: Cloud VPN overview - https://docs.cloud.google.com/network-connectivity/docs/vpn/concepts/overview
- Google Cloud: Create an HA VPN gateway to a peer VPN gateway - https://docs.cloud.google.com/network-connectivity/docs/vpn/how-to/creating-ha-vpn
- Google Cloud: Create a Classic VPN gateway using static routing - https://docs.cloud.google.com/network-connectivity/docs/vpn/how-to/creating-static-vpns
- Google Cloud: Classic VPN dynamic routing deprecation - https://docs.cloud.google.com/network-connectivity/docs/vpn/deprecations/classic-vpn-deprecation
- Google Cloud SDK: `gcloud compute vpn-tunnels create` reference - https://docs.cloud.google.com/sdk/gcloud/reference/compute/vpn-tunnels/create
- Google Cloud SDK: `gcloud compute external-vpn-gateways create` reference - https://docs.cloud.google.com/sdk/gcloud/reference/compute/external-vpn-gateways/create
- Google Cloud SDK: `gcloud compute routers add-interface` reference - https://cloud.google.com/sdk/gcloud/reference/compute/routers/add-interface
- Google Cloud SDK: `gcloud compute routers add-bgp-peer` reference - https://cloud.google.com/sdk/gcloud/reference/compute/routers/add-bgp-peer
- Google Cloud SDK: `gcloud compute forwarding-rules create` reference - https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create

## Issues Found
- The HA VPN tunnel examples used `--vpn-gateway-interface`, but the current `gcloud compute vpn-tunnels create` command uses `--interface` for the HA VPN gateway interface. Updated both tunnel commands to use `--interface=0` and `--interface=1`.
- The external VPN gateway example used `--redundancy-type=TWO_IPS_REDUNDANCY`. Current `gcloud compute external-vpn-gateways create` infers redundancy type from the number of interfaces and does not list that flag in the stable CLI reference. Removed the flag.
- The Classic VPN example only created the target VPN gateway, external IP address, and forwarding rules. Google Cloud's static-routing flow also requires a VPN tunnel and a custom static route when using the Google Cloud CLI. Added a policy-based tunnel example and a route to the peer network.
- The Classic VPN forwarding rule examples omitted the project flag while the rest of the post used `PROJECT_ID`. Added `--project=$PROJECT_ID` and included the documented external load-balancing scheme and Premium network tier flags.
- The conclusion said to always use IKEv2. Google Cloud documentation recommends IKEv2 when the peer device supports it, while IKEv1 can still be required for some peer gateways. Changed the statement to "Use IKEv2 when your peer VPN gateway supports it."

## Review Notes
- Classic VPN dynamic routing with BGP is deprecated and new Classic VPN BGP tunnels are no longer supported as of August 1, 2025; the post's Classic VPN path now stays within the supported static-routing model.
- The local environment did not have the `gcloud` CLI installed, so command validation was performed against official Google Cloud documentation and CLI reference pages.
