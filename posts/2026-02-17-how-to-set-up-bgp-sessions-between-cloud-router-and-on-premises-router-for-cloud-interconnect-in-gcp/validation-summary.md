# Validation Summary: How to Set Up BGP Sessions Between Cloud Router and On-Premises Router

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Cloud Router
- Cloud Interconnect / Dedicated Interconnect
- BGP and eBGP
- VLAN attachments
- Google Cloud CLI
- Cisco IOS / IOS XE
- Juniper Junos
- Arista EOS
- Bidirectional Forwarding Detection (BFD)

## Sources Consulted
- Google Cloud: Establish BGP sessions - https://docs.cloud.google.com/network-connectivity/docs/router/how-to/configuring-bgp
- Google Cloud: Create VLAN attachments for Dedicated Interconnect - https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/creating-vlan-attachments
- Google Cloud: Configure on-premises routers for Dedicated Interconnect - https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/configuring-onprem-routers
- Google Cloud: Create a Cloud Router to connect a VPC network to a peer network - https://docs.cloud.google.com/network-connectivity/docs/router/how-to/create-router-vpc-network
- Google Cloud: Manage BGP timers - https://cloud.google.com/network-connectivity/docs/router/how-to/managing-bgp-timers
- Google Cloud: Bidirectional Forwarding Detection overview - https://docs.cloud.google.com/network-connectivity/docs/router/concepts/bfd
- Google Cloud: Configure BFD for Cloud Router - https://docs.cloud.google.com/network-connectivity/docs/router/how-to/configuring-bfd
- Google Cloud SDK reference: gcloud compute interconnects attachments dedicated create - https://docs.cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/dedicated/create
- Google Cloud SDK reference: gcloud compute routers add-interface - https://cloud.google.com/sdk/gcloud/reference/compute/routers/add-interface
- Google Cloud SDK reference: gcloud compute routers add-bgp-peer - https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/add-bgp-peer
- Google Cloud SDK reference: gcloud compute routers update-bgp-peer - https://cloud.google.com/sdk/gcloud/reference/compute/routers/update-bgp-peer
- Google Cloud: Advertise custom address ranges - https://docs.cloud.google.com/network-connectivity/docs/router/how-to/advertising-custom-ip
- Google Cloud: Advertised routes - https://docs.cloud.google.com/network-connectivity/docs/router/concepts/advertised-routes
- Google Cloud: View router details - https://docs.cloud.google.com/network-connectivity/docs/router/how-to/viewing-router-details
- RFC 4271: A Border Gateway Protocol 4 (BGP-4) - https://www.rfc-editor.org/rfc/rfc4271
- RFC 6996: Autonomous System (AS) Reservation for Private Use - https://www.rfc-editor.org/rfc/rfc6996

## Issues Found
- The ASN guidance described ASN 16550 as the default Cloud Router ASN for simple setups. Updated this to clarify that ASN 16550 is required for Partner Interconnect and accepted for Dedicated Interconnect, while private ASNs are the normal choice for Dedicated Interconnect.
- The VLAN attachment command used `--bandwidth=BPS_1G`, but current `gcloud compute interconnects attachments dedicated create` documentation lists values such as `1g`. Updated the command to `--bandwidth=1g`.
- The BGP timer section stated Cloud Router defaults were 60-second keepalive and 180-second hold timers. Updated this to Cloud Router's documented 20-second default keepalive interval and hold timer of three times the keepalive interval.
- The BFD example used 300 ms intervals and multiplier 3, and the text claimed sub-second failure detection. Cloud Router's documented minimum BFD interval is 1000 ms and minimum multiplier is 5, with detection as short as five seconds. Updated the Cloud Router and Cisco examples to 1000 ms / multiplier 5 and corrected the explanation.
- The Cisco BFD example did not explicitly use Cloud Router's documented single-hop BFD form. Updated the neighbor command to include `single-hop`.

## Review Notes
The core Cloud Router, VLAN attachment, BGP peer, route advertisement, and status-check commands match the current Google Cloud documentation. `gcloud` is not installed in this workspace, so command validation was performed against the official Google Cloud CLI reference instead of local `--help` output.
