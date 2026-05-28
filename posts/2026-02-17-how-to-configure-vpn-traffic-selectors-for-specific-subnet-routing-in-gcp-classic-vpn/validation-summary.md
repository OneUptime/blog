# Validation Summary: How to Configure VPN Traffic Selectors for Specific Subnet Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Classic VPN
- Cloud VPN traffic selectors
- IPsec / IKEv2
- Google Cloud CLI (`gcloud`)
- Static routing for VPN tunnels
- HA VPN and BGP

## Sources Consulted
- Google Cloud: Create a Classic VPN gateway using static routing: https://cloud.google.com/network-connectivity/docs/vpn/how-to/creating-static-vpns
- Google Cloud: Networks and tunnel routing / traffic selectors: https://cloud.google.com/network-connectivity/docs/vpn/concepts/choosing-networks-routing
- Google Cloud SDK: `gcloud compute vpn-tunnels create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/vpn-tunnels/create
- Google Cloud SDK: `gcloud compute forwarding-rules create`: https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- Google Cloud SDK: `gcloud compute target-vpn-gateways create`: https://cloud.google.com/sdk/gcloud/reference/compute/target-vpn-gateways/create
- Google Cloud SDK: `gcloud compute routes create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routes/create
- Google Cloud: Classic VPN dynamic routing deprecation: https://docs.cloud.google.com/network-connectivity/docs/vpn/deprecations/classic-vpn-deprecation
- Google Cloud: Cloud VPN best practices: https://docs.cloud.google.com/network-connectivity/docs/vpn/concepts/best-practices

## Issues Found
- The post incorrectly said that Google Cloud can negotiate multiple Child SAs, one for each local/remote CIDR combination. Google Cloud documentation says Cloud VPN always uses a single Child SA, and that IKEv2 peers must accept all CIDRs in each traffic selector in that single Child SA. I corrected the section title, explanation, diagram, and peer-device guidance.
- The introduction implied custom specific traffic selectors were a route-based VPN configuration. Google Cloud documentation says route-based Classic VPN uses `0.0.0.0/0` traffic selectors; custom local and remote selectors are policy-based Classic VPN. I clarified that custom selectors require a policy-based Classic VPN tunnel.
- The HA VPN section said traffic selectors are always `0.0.0.0/0`. Google Cloud documentation now distinguishes IPv4, dual-stack, and IPv6 HA VPN traffic selectors. I changed the statement to "For IPv4 traffic" so it remains accurate in the context of the post's IPv4 examples.

## Review Notes
The `gcloud` commands and flags used in the examples are consistent with current Google Cloud SDK reference documentation. The local environment did not have `gcloud` installed, so CLI verification was done against official Google Cloud CLI documentation rather than local `--help` output.
