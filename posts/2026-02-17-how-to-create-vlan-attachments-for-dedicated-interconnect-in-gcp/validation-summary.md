# Validation Summary: How to Create VLAN Attachments for Dedicated Interconnect in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Dedicated Interconnect
- VLAN attachments / InterconnectAttachment
- Cloud Router
- BGP
- gcloud CLI
- Cisco IOS XE configuration
- Juniper Junos configuration

## Sources Consulted
- Google Cloud: Create VLAN attachments for Dedicated Interconnect: https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/creating-vlan-attachments
- Google Cloud SDK: gcloud compute interconnects attachments dedicated create: https://docs.cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/dedicated/create
- Google Cloud SDK: gcloud compute interconnects attachments dedicated update: https://docs.cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/dedicated/update
- Google Cloud SDK: gcloud compute routers add-interface: https://cloud.google.com/sdk/gcloud/reference/compute/routers/add-interface
- Google Cloud SDK: gcloud compute routers add-bgp-peer: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/add-bgp-peer
- Google Cloud: Dedicated Interconnect overview: https://docs.cloud.google.com/network-connectivity/docs/interconnect/details/dedicated
- Google Cloud: Configure on-premises routers for Dedicated Interconnect: https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/configuring-onprem-routers
- Google Cloud: Cloud Interconnect quotas and limits: https://cloud.google.com/network-connectivity/docs/interconnect/quotas

## Issues Found
- The post stated that the Cloud Router must be in the same region as the Dedicated Interconnect's location. Google Cloud documentation says to specify a Cloud Router in the region that contains the VPC subnets you want to reach, so the wording was corrected.
- The `gcloud` examples used bandwidth values such as `BPS_1G`, `BPS_200M`, and `BPS_5G`. Current official `gcloud` documentation lists values such as `1g`, `200M`, and `5g`, so the examples and option list were updated.
- The disable command used `--no-admin-enabled`. Current official documentation for Dedicated Interconnect VLAN attachment updates uses `--no-enable-admin`, so the command was corrected.
- The bandwidth allocation section described capacity as soft limits that affect how Cloud Router distributes traffic. Google documents the maximum bandwidth as approximate capacity for each VLAN attachment, with total usable throughput still limited by the Interconnect link capacity, so the explanation was corrected.

## Review Notes
The on-premises router snippets are simplified examples. Google recommends checking the VLAN attachment Dataplane version for EBGP multihop requirements; Dataplane version 1 requires EBGP multihop, while Dataplane version 2 or higher does not require it.
