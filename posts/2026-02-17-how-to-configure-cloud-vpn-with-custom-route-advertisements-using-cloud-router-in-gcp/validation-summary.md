# Validation Summary: How to Configure Cloud VPN with Custom Route Advertisements

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud
- Cloud VPN
- Cloud Router
- Border Gateway Protocol (BGP)
- VPC Network Peering
- gcloud CLI

## Sources Consulted
- Google Cloud Cloud Router advertised routes documentation: https://cloud.google.com/network-connectivity/docs/router/concepts/advertised-routes
- Google Cloud guide for advertising custom address ranges with Cloud Router: https://cloud.google.com/network-connectivity/docs/router/how-to/advertising-custom-ip
- Google Cloud guide for viewing Cloud Router details and status: https://cloud.google.com/network-connectivity/docs/router/how-to/viewing-router-details
- gcloud compute routers update reference: https://cloud.google.com/sdk/gcloud/reference/compute/routers/update
- gcloud compute routers update-bgp-peer reference: https://cloud.google.com/sdk/gcloud/reference/compute/routers/update-bgp-peer
- gcloud compute routers get-status reference: https://cloud.google.com/sdk/gcloud/reference/compute/routers/get-status
- gcloud compute networks peerings update reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/peerings/update
- Google Cloud VPC Network Peering documentation: https://cloud.google.com/vpc/docs/vpc-peering
- Google Cloud NAT overview: https://cloud.google.com/nat/docs/overview

## Issues Found
- The post said default Cloud Router advertisement mode advertises all subnet routes in the VPC. Google Cloud documents that subnet advertisement depends on the VPC network's dynamic routing mode: regional mode advertises same-region subnet ranges, while global mode includes subnet ranges from other regions. Updated the introduction and default-mode explanation.
- The default-route section used Cloud NAT as an example for centralized internet egress for on-premises traffic sent through GCP. Cloud NAT applies to supported Google Cloud resources, not arbitrary on-premises traffic transiting a VPN. Replaced that example with a proxy or firewall/NAT appliance.
- The peered-VPC section mentioned export and import of custom routes but only showed export on one side. Added the peer-side import command and clarified that this is for the return path from the peered VPC to on-premises.

## Review Notes
The gcloud router advertisement flags used in the post are current according to the official gcloud references. Google Cloud documentation notes that `--set-advertisement-ranges` replaces existing custom advertisements, while `--add-advertisement-ranges` appends to them, matching the post's warning.
