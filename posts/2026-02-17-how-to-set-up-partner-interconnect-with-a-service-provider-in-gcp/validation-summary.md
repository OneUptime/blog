# Validation Summary: How to Set Up Partner Interconnect with a Service Provider in GCP

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Partner Interconnect
- Cloud Interconnect VLAN attachments
- Cloud Router and BGP
- Google Cloud CLI
- Cloud Monitoring

## Sources Consulted
- Google Cloud Partner Interconnect overview: https://cloud.google.com/network-connectivity/docs/interconnect/concepts/partner-overview
- Google Cloud Partner Interconnect 99.9% availability tutorial: https://cloud.google.com/network-connectivity/docs/interconnect/tutorials/partner-creating-999-availability
- Google Cloud Partner Interconnect 99.99% availability tutorial: https://cloud.google.com/network-connectivity/docs/interconnect/tutorials/partner-creating-9999-availability
- Google Cloud create VLAN attachments for Partner Interconnect: https://cloud.google.com/network-connectivity/docs/interconnect/how-to/partner/creating-vlan-attachments
- Google Cloud request Partner Interconnect connections: https://cloud.google.com/network-connectivity/docs/interconnect/how-to/partner/requesting-connections
- Google Cloud activate Partner Interconnect connections: https://cloud.google.com/network-connectivity/docs/interconnect/how-to/partner/activating-connections
- Google Cloud Interconnect monitoring guide: https://cloud.google.com/network-connectivity/docs/interconnect/how-to/monitoring
- Google Cloud Monitoring metrics list for Interconnect and Cloud Router: https://cloud.google.com/monitoring/api/metrics_gcp_i_o and https://cloud.google.com/monitoring/api/metrics_gcp_p_z
- Google Cloud SDK reference for Partner Interconnect attachment create/update and Cloud Router BGP peer update: https://cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/partner/create, https://cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/partner/update, and https://cloud.google.com/sdk/gcloud/reference/compute/routers/update-bgp-peer

## Issues Found
- The post described a two-attachment topology as qualifying for a 99.99% SLA. Google Cloud's 99.99% Partner Interconnect topology requires four VLAN attachments across two regions/metros with global dynamic routing, while a redundant pair in different edge availability domains matches the 99.9% topology. Changed the SLA reference in Step 4 to 99.9% and generalized the common pitfall wording.
- The Layer 3 explanation said the provider acts as a route reflector between Cloud Router and the customer's router. Google documents Layer 3 Partner Interconnect as the provider establishing BGP with Cloud Router and handling routing toward the customer network. Reworded that explanation.
- The Layer 2 BGP commands manually added Cloud Router interfaces and BGP peers. Current Google Cloud guidance says Partner Interconnect creates managed interfaces and BGP peers automatically after provider configuration; customers update the managed BGP peer with the on-premises ASN. Replaced the manual add-interface/add-bgp-peer commands with describe and update-bgp-peer commands.
- The on-premises router note told readers to use VLAN IDs from the attachment details. Google notes the VLAN ID shown for the attachment is for the Google Cloud side; Layer 2 router configuration should use the VLAN ID provided by the service provider. Updated the wording.
- The monitoring metric names used the wrong service prefix and included link metrics that are not reported for Partner Interconnect. Replaced them with current Interconnect attachment metric types and the Cloud Router BGP session status metric.

## Review Notes
The post is technically relevant and remains a valid practical setup guide after the corrections. The local environment does not have `gcloud` installed, so CLI validation was performed against official Google Cloud SDK reference pages and current product documentation.
