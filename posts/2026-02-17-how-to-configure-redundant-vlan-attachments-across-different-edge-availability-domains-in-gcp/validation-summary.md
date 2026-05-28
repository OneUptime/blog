# Validation Summary: How to Configure Redundant VLAN Attachments Across Different Edge Availability

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud Cloud Interconnect
- Dedicated Interconnect
- Partner Interconnect
- VLAN attachments
- Cloud Router
- BGP
- Edge Availability Domains
- Cloud Monitoring
- gcloud CLI

## Sources Consulted
- Google Cloud Interconnect Service Level Agreement: https://cloud.google.com/network-connectivity/docs/interconnect/sla
- Topology for production-level applications overview: https://cloud.google.com/network-connectivity/docs/interconnect/tutorials/production-level-overview
- Establish 99.99% availability for Dedicated Interconnect: https://docs.cloud.google.com/network-connectivity/docs/interconnect/tutorials/dedicated-creating-9999-availability
- Establish 99.99% availability for Partner Interconnect: https://docs.cloud.google.com/network-connectivity/docs/interconnect/tutorials/partner-creating-9999-availability
- Topology for non-critical applications overview: https://cloud.google.com/network-connectivity/docs/interconnect/tutorials/non-critical-overview
- Cloud Interconnect key terms: https://docs.cloud.google.com/network-connectivity/docs/concepts/key-terms
- All colocation facilities: https://docs.cloud.google.com/network-connectivity/docs/interconnect/concepts/choosing-colocation-facilities
- Create VLAN attachments for Dedicated Interconnect: https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/creating-vlan-attachments
- Create VLAN attachments for Partner Interconnect: https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/partner/creating-vlan-attachments
- Cloud Router BGP configuration: https://docs.cloud.google.com/network-connectivity/docs/router/how-to/configuring-bgp
- gcloud compute interconnects create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/interconnects/create
- gcloud compute interconnects attachments dedicated create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/dedicated/create
- gcloud compute interconnects attachments partner create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/partner/create
- gcloud compute routers add-interface reference: https://cloud.google.com/sdk/gcloud/reference/compute/routers/add-interface
- gcloud compute routers add-bgp-peer reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/add-bgp-peer
- Cloud Interconnect monitoring metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_i_o

## Issues Found
- The post incorrectly claimed that two VLAN attachments in different Edge Availability Domains qualify for the full 99.99% SLA. Updated the SLA language and table to reflect Google Cloud's current topology requirements: two attachments in one region and metro are the 99.9% topology, while 99.99% requires four Cloud Interconnect connections or VLAN attachments across two Google Cloud regions and two metros, with each metro pair in different Edge Availability Domains.
- The Edge Availability Domain description said some metros might have more than two domains. Updated it to match Google Cloud terminology: each metro has two Edge Availability Domains, `zone1` and `zone2`, even if a metro has more than two connection locations.
- The Cloud Router section implied one Cloud Router and one regional pair were enough for 99.99%. Added the requirement to repeat the pattern with another Cloud Router and pair of attachments in a second region and metro, and noted the global dynamic routing requirement.
- The Partner Interconnect section implied the same manual BGP workflow as Dedicated Interconnect. Clarified that Google automatically adds the Cloud Router interface and BGP peer for Partner Interconnect attachments.
- The BGP examples used hardcoded link-local IP addresses without first retrieving the attachment-assigned values. Added `gcloud compute interconnects attachments describe` commands and clarified that the shown IP addresses are examples to replace with the allocated attachment values.
- The monitoring example used a non-existent `compute.googleapis.com/interconnect/link/operational_status` metric while describing BGP peer alerting. Updated the example to use the documented Cloud Interconnect metric `interconnect.googleapis.com/network/interconnect/operational` and reframed it as an Interconnect operational status alert, with a separate note to alert on Cloud Router BGP peer status.

## Review Notes
The post is now technically consistent with current Google Cloud documentation. The remaining examples are illustrative and still require users to substitute their real project, VPC, Interconnect, VLAN, ASN, and link-local addressing values.
