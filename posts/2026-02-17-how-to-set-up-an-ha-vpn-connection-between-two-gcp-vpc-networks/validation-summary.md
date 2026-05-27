# Validation Summary: How to Set Up an HA VPN Connection Between Two GCP VPC Networks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud HA VPN
- Google Cloud VPC networks
- Cloud Router
- BGP
- IPsec/IKEv2
- Google Cloud CLI (`gcloud`)

## Sources Consulted
- Google Cloud: Create HA VPN gateways to connect VPC networks: https://cloud.google.com/network-connectivity/docs/vpn/how-to/creating-ha-vpn2
- Google Cloud: HA VPN topologies: https://cloud.google.com/network-connectivity/docs/vpn/concepts/topologies
- Google Cloud: Networks and tunnel routing: https://cloud.google.com/network-connectivity/docs/vpn/concepts/choosing-networks-routing
- Google Cloud SDK: `gcloud compute vpn-tunnels create`: https://cloud.google.com/sdk/gcloud/reference/compute/vpn-tunnels/create
- Google Cloud: Check VPN status: https://cloud.google.com/network-connectivity/docs/vpn/how-to/checking-vpn-status
- Google Cloud: BGP session states: https://cloud.google.com/network-connectivity/docs/router/concepts/bgp-states

## Issues Found
- The post implied VPN can generally work around overlapping VPC CIDR ranges with NAT. Google Cloud's HA VPN documentation for connecting VPC networks requires non-overlapping primary and secondary subnet ranges, so the wording was changed to clarify that HA VPN between VPCs still requires non-overlapping routes unless a separate NAT design is added.
- The prerequisites omitted that at least one VPC network should be custom mode when connecting two VPC networks with Cloud VPN. This was added.
- The prerequisites and production note did not explicitly state that both HA VPN gateways must be deployed in the same region for the 99.99% availability SLA. This was added.
- The tunnel-count explanation was ambiguous. It was revised to match Google Cloud's guidance: for 99.99% availability between two same-region Google Cloud HA VPN gateways, create two tunnel resources on each gateway, with interface 0 to interface 0 and interface 1 to interface 1.

## Review Notes
The `gcloud` command structure, HA VPN gateway creation, Cloud Router creation, tunnel creation flags, BGP interface and peer configuration, private ASN ranges, and verification commands were checked against official Google Cloud documentation and are current. The example uses manually assigned IPv4 link-local BGP addresses, which is valid, though Google Cloud can also automatically assign BGP interface addresses if omitted.
