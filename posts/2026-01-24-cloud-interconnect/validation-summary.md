# Validation Summary: How to Configure Cloud Interconnect

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Google Cloud Interconnect
- Dedicated Interconnect
- Partner Interconnect
- Cloud Router
- Border Gateway Protocol (BGP)
- Google Cloud CLI (`gcloud`)
- Cloud Monitoring
- Google Cloud firewall rules
- Cisco IOS BGP configuration

## Sources Consulted
- Google Cloud CLI reference: `gcloud compute interconnects create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/interconnects/create
- Google Cloud CLI reference: `gcloud compute interconnects attachments dedicated create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/dedicated/create
- Google Cloud CLI reference: `gcloud compute interconnects attachments partner create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/partner/create
- Google Cloud CLI reference: `gcloud compute interconnects attachments partner update` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/partner/update
- Google Cloud CLI reference: `gcloud compute routers create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/create
- Google Cloud CLI reference: `gcloud compute routers update-bgp-peer` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/update-bgp-peer
- Google Cloud Interconnect Dedicated overview - https://docs.cloud.google.com/network-connectivity/docs/interconnect/concepts/dedicated-overview
- Google Cloud Interconnect Dedicated VLAN attachment guide - https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/creating-vlan-attachments
- Google Cloud Interconnect Dedicated provisioning overview - https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/provisioning-overview
- Google Cloud Cloud Router BGP sessions - https://docs.cloud.google.com/network-connectivity/docs/router/how-to/configuring-bgp
- Google Cloud Monitoring metrics list, Interconnect metrics - https://docs.cloud.google.com/monitoring/api/metrics_gcp_i_o
- Google Cloud Monitoring Python client reference for alert policies - https://docs.cloud.google.com/python/docs/reference/monitoring/latest/google.cloud.monitoring_v3.types.AlertPolicy.Condition

## Issues Found
- Dedicated Interconnect capacity list omitted 400 Gbps links. Updated the option summary and final summary to include 400 Gbps, which is supported by current Google Cloud documentation.
- The Dedicated Interconnect creation example omitted `--customer-name`, which Google documents as required for most Interconnect orders because it appears on the LOA. Added an example customer name.
- The Cloud Router creation example used `--advertise-mode`, `--set-advertised-groups`, and `--set-advertised-ranges`; current `gcloud compute routers create` uses `--advertisement-mode`, `--set-advertisement-groups`, and `--set-advertisement-ranges`. Updated the flags.
- The Partner Interconnect activation example used `--admin-enabled`; current Partner attachment update syntax uses `--enable-admin`. Updated the flag.
- The MED traffic engineering example used router advertisement range syntax as though `10.0.0.0/8:100` set MED. Updated the example to use `gcloud compute routers update-bgp-peer --advertised-route-priority`, which is the Cloud Router setting used to control advertised route priority/MED.
- The Cloud Monitoring examples used non-existent `compute.googleapis.com/interconnect/...` metric types. Updated them to use the current `interconnect.googleapis.com/network/interconnect/...` metric namespace.
- The alert policy example treated the Interconnect operational metric as a numeric 1/0 threshold. Current Interconnect operational metrics are boolean, so the example now aligns the boolean series with `ALIGN_COUNT_TRUE` before applying the threshold.

## Review Notes
The guide is technically relevant and remains a usable high-level setup walkthrough. Some production details are intentionally simplified, such as exact BGP peer names, colocation/provider coordination, and organization-specific firewall policy design.
