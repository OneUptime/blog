# Validation Summary: How to Configure Network Connectivity Center for Hub-and-Spoke Topology on GCP

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Network Connectivity Center
- Google Cloud VPC spokes
- Google Cloud HA VPN
- Google Cloud Cloud Router and BGP
- Google Cloud Cloud Interconnect VLAN attachment spokes
- Google Cloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud Network Connectivity Center overview: https://docs.cloud.google.com/network-connectivity/docs/network-connectivity-center/concepts/overview
- Google Cloud Network Connectivity Center hubs and spokes guide: https://docs.cloud.google.com/network-connectivity/docs/network-connectivity-center/how-to/working-with-hubs-spokes
- Google Cloud VPC spokes overview: https://docs.cloud.google.com/network-connectivity/docs/network-connectivity-center/concepts/vpc-spokes-overview
- Google Cloud route exchange with VPC spokes: https://docs.cloud.google.com/network-connectivity/docs/network-connectivity-center/concepts/dynamic-route-exchange-with-vpc-spokes
- Google Cloud SDK `gcloud network-connectivity hubs create`: https://docs.cloud.google.com/sdk/gcloud/reference/network-connectivity/hubs/create
- Google Cloud SDK `gcloud network-connectivity spokes linked-vpc-network create`: https://docs.cloud.google.com/sdk/gcloud/reference/network-connectivity/spokes/linked-vpc-network/create
- Google Cloud SDK `gcloud network-connectivity spokes linked-vpn-tunnels create`: https://docs.cloud.google.com/sdk/gcloud/reference/network-connectivity/spokes/linked-vpn-tunnels/create
- Google Cloud SDK `gcloud network-connectivity spokes linked-interconnect-attachments create`: https://cloud.google.com/sdk/gcloud/reference/network-connectivity/spokes/linked-interconnect-attachments
- Google Cloud SDK `gcloud compute vpn-tunnels create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/vpn-tunnels/create
- Google Cloud SDK `gcloud compute external-vpn-gateways create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/external-vpn-gateways/create
- Google Cloud SDK `gcloud network-connectivity hubs list-spokes`: https://docs.cloud.google.com/sdk/gcloud/reference/network-connectivity/hubs/list-spokes
- Terraform Google provider `google_network_connectivity_spoke`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/network_connectivity_spoke
- Google Cloud Network Connectivity pricing: https://cloud.google.com/network-connectivity/pricing

## Issues Found
- The VPC spoke commands used `gcloud network-connectivity spokes create` with `--location` and `--linked-vpc-network`. Updated them to the current `gcloud network-connectivity spokes linked-vpc-network create` command with `--global` and `--vpc-network`.
- The cross-project VPC spoke examples created spokes in the hub project even though VPC spokes must be created in the project where the VPC network lives. Updated the CLI and Terraform examples to create each VPC spoke in its VPC project and use the full hub URI for cross-project attachment.
- The HA VPN tunnel commands used `--peer-gcp-gateway` for an on-premises/external peer and included the non-current `--vpn-gateway-interface` flag. Added an external VPN gateway resource and changed the tunnel commands to use `--peer-external-gateway`, `--peer-external-gateway-interface`, and `--interface`.
- The VPN and Interconnect spoke commands used the wrong generic spoke command and old linked-resource flags. Updated them to `linked-vpn-tunnels create` and `linked-interconnect-attachments create` with `--region`, `--vpn-tunnels`, and `--interconnect-attachments`.
- The hybrid spoke explanation overstated what `--site-to-site-data-transfer` does. Updated the explanation and added `--include-import-ranges=ALL_IPV4_RANGES` so VPC spoke subnet ranges can be imported by hybrid spokes and advertised to BGP peers.
- The route filtering section referred broadly to export and import policies. Updated it to the current NCC terminology: VPC spoke include/exclude export ranges and hybrid spoke include import ranges.
- The spoke listing commands used `gcloud network-connectivity spokes list --hub`, which is not supported by current CLI docs. Updated them to `gcloud network-connectivity hubs list-spokes my-network-hub`.
- The Terraform VPN spoke snippet omitted `include_import_ranges` for hub subnet import. Added `include_import_ranges = ["ALL_IPV4_RANGES"]`.
- The cost section incorrectly stated there is no charge for spoke configuration and only data transit is billed. Updated it to reflect current hub, spoke-hour, underlying-resource, and data-processing/data-transfer charges.
- The overview wording implied data-plane traffic is routed through the hub resource. Adjusted it to describe NCC as central route exchange over Google's network.

## Review Notes
The `gcloud` CLI is not installed in this workspace, so command verification was performed against the official Google Cloud SDK command reference and product documentation rather than local `--help` output.
