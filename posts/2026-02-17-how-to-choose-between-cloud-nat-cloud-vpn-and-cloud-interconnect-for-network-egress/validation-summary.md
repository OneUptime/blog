# Validation Summary: How to Choose Between Cloud NAT Cloud VPN and Cloud Interconnect

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Platform
- Cloud NAT
- Cloud VPN
- HA VPN
- Classic VPN
- Cloud Interconnect
- Dedicated Interconnect
- Partner Interconnect
- Cloud Router
- Google Cloud CLI

## Sources Consulted
- Google Cloud NAT overview: https://docs.cloud.google.com/nat/docs/overview
- Google Cloud NAT pricing: https://cloud.google.com/nat/pricing
- Google Cloud SDK `gcloud compute routers nats create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/routers/nats/create
- Google Cloud VPN overview: https://docs.cloud.google.com/network-connectivity/docs/vpn/concepts/overview
- Google Cloud VPN SLA: https://cloud.google.com/network-connectivity/docs/vpn/sla
- Google Cloud SDK `gcloud compute vpn-tunnels create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/vpn-tunnels/create
- Google Cloud SDK `gcloud compute external-vpn-gateways create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/external-vpn-gateways/create
- Google Cloud Interconnect overview: https://docs.cloud.google.com/network-connectivity/docs/interconnect/concepts/overview
- Dedicated Interconnect overview: https://docs.cloud.google.com/network-connectivity/docs/interconnect/details/dedicated
- Create Dedicated Interconnect VLAN attachments: https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/creating-vlan-attachments
- Google Cloud SDK `gcloud compute interconnects attachments dedicated create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/dedicated/create
- Google Cloud SDK `gcloud compute routers add-interface` reference: https://cloud.google.com/sdk/gcloud/reference/compute/routers/add-interface
- Google Cloud SDK `gcloud compute routers add-bgp-peer` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/add-bgp-peer
- HA VPN over Cloud Interconnect overview: https://cloud.google.com/network-connectivity/docs/interconnect/concepts/ha-vpn-interconnect
- MACsec for Cloud Interconnect overview: https://docs.cloud.google.com/network-connectivity/docs/interconnect/concepts/macsec-overview
- Network Connectivity pricing: https://cloud.google.com/network-connectivity/pricing

## Issues Found
- Clarified the Cloud NAT section to refer specifically to Public Cloud NAT. Cloud NAT now includes Public NAT and Private NAT, and Private NAT can support private-to-private connectivity involving on-premises or other cloud networks, so the original generic limitations were too broad.
- Updated the HA VPN SLA statement. HA VPN can provide 99.99% SLA for most supported topologies when configured with tunnels on both HA VPN gateway interfaces; the original "with two tunnels" wording was incomplete.
- Corrected the HA VPN tunnel creation command from `--vpn-gateway-interface` to the current `--interface` flag used by `gcloud compute vpn-tunnels create`.
- Adjusted the VPN example comment to make clear that the shown command creates one tunnel and should be repeated for the second HA VPN gateway interface.
- Corrected the Dedicated Interconnect VLAN attachment example by removing hard-coded Cloud Router interface IP settings from the standard auto-assigned attachment flow and adding the missing `gcloud compute routers add-bgp-peer` command.
- Updated the comparison table's encryption entry for Cloud Interconnect to mention both MACsec and HA VPN over Cloud Interconnect.
- Updated the comparison table's pricing wording for Cloud NAT, Cloud VPN, and Cloud Interconnect to better match current Google Cloud pricing structure, including per-VM NAT gateway caps, tunnel-hour pricing that varies by region, and Dedicated Interconnect circuit plus attachment charges.

## Review Notes
The local environment did not have the `gcloud` CLI installed, so CLI verification was performed against official Google Cloud SDK command reference documentation rather than local `--help` output.
