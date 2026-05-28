# Validation Summary: How to Configure HA VPN Between GCP and AWS with Dynamic Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud HA VPN
- Google Cloud Cloud Router
- Google Cloud SDK gcloud CLI
- AWS Site-to-Site VPN
- AWS Virtual Private Gateway
- AWS CLI
- BGP dynamic routing
- IPsec / IKEv2 VPN tunnels

## Sources Consulted
- Google Cloud: Connect HA VPN to AWS peer gateways: https://docs.cloud.google.com/network-connectivity/docs/vpn/how-to/connect-ha-vpn-aws-peer-gateway
- Google Cloud SDK: gcloud compute vpn-gateways create: https://docs.cloud.google.com/sdk/gcloud/reference/compute/vpn-gateways/create
- Google Cloud SDK: gcloud compute external-vpn-gateways create: https://docs.cloud.google.com/sdk/gcloud/reference/compute/external-vpn-gateways/create
- Google Cloud SDK: gcloud compute vpn-tunnels create: https://docs.cloud.google.com/sdk/gcloud/reference/compute/vpn-tunnels/create
- Google Cloud SDK: gcloud compute routers add-interface: https://cloud.google.com/sdk/gcloud/reference/compute/routers/add-interface
- Google Cloud SDK: gcloud compute routers add-bgp-peer: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/add-bgp-peer
- AWS CLI: create-vpn-connection: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpn-connection.html
- AWS Site-to-Site VPN: Static and dynamic routing: https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-static-dynamic.html
- AWS CLI: enable-vgw-route-propagation: https://docs.aws.amazon.com/cli/latest/reference/ec2/enable-vgw-route-propagation.html
- AWS Transit Gateway route tables: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html

## Issues Found
- The prerequisites said the AWS side could use a Virtual Private Gateway or Transit Gateway, but all AWS commands in the guide use a Virtual Private Gateway. Transit Gateway uses different VPN attachment and route table propagation steps. Changed the prerequisite to require a Virtual Private Gateway attached to the VPC.
- The AWS route propagation step did not explicitly say it was for Virtual Private Gateway route propagation. Changed the wording to make the VGW scope clear.
- The AWS verification command checked only one VPN connection, but the guide creates two VPN connections. Updated the command to pass two VPN connection IDs.

## Review Notes
- The four-tunnel topology, external VPN gateway with four interfaces, HA VPN interface mapping, IKEv2 use, and Cloud Router BGP configuration match Google Cloud's HA VPN to AWS guidance.
- Google Cloud documents a known AWS rekeying issue when AWS uses too many default transform sets; production deployments should select a smaller compatible IKE/IPsec transform set on the AWS side.
- With AWS Virtual Private Gateway, the topology provides redundancy and dynamic routing, but Transit Gateway is the AWS option documented by Google for ECMP across active tunnels.
