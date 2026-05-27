# Validation Summary: How to Set Up Hybrid Connectivity Between On-Premises Data Centers and GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Cloud Interconnect
- Dedicated Interconnect
- Partner Interconnect
- Cloud Router
- BGP
- VPC firewall rules
- Cloud Monitoring
- Google Cloud CLI
- Cisco IOS BGP configuration

## Sources Consulted
- Google Cloud: Cloud Interconnect overview: https://docs.cloud.google.com/network-connectivity/docs/interconnect/concepts/overview
- Google Cloud: Dedicated Interconnect overview and SLA topology requirements: https://cloud.google.com/network-connectivity/docs/interconnect/concepts/dedicated-overview
- Google Cloud: Partner Interconnect overview: https://cloud.google.com/network-connectivity/docs/interconnect/concepts/partner-overview
- Google Cloud CLI reference for `gcloud compute interconnects create`: https://cloud.google.com/sdk/gcloud/reference/compute/interconnects/create
- Google Cloud CLI reference for `gcloud compute interconnects attachments dedicated create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/dedicated/create
- Google Cloud: Create Dedicated Interconnect VLAN attachments and BGP sessions: https://cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/creating-vlan-attachments
- Google Cloud: Cloud Router ASN requirements: https://docs.cloud.google.com/network-connectivity/docs/router/how-to/create-router-vpc-network
- Google Cloud: Establish BGP sessions: https://cloud.google.com/network-connectivity/docs/router/how-to/configuring-bgp
- Google Cloud: Monitor Cloud Interconnect connections: https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/monitoring
- Google Cloud CLI reference for `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The post used ASN `16550` as the Cloud Router ASN for a Dedicated Interconnect example. Google Cloud requires a private ASN for Dedicated Interconnect Cloud Routers; ASN `16550` is required for Partner Interconnect. Changed the example to use private ASN `65000` and updated the explanatory text and Cisco remote AS values.
- The VLAN attachment commands used `--bandwidth=BPS_5G`, which is an API-style enum rather than the current `gcloud` CLI value. Changed the examples to `--bandwidth=5g`.
- The Dedicated Interconnect attachment details command requested `pairingKey`, which applies to Partner Interconnect workflows, not Dedicated Interconnect. Replaced it with `vlanTag8021q`, `cloudRouterIpAddress`, and `customerRouterIpAddress`.
- The BGP setup skipped Cloud Router interface creation and treated VLAN attachment names as interface names. Added `gcloud compute routers add-interface` commands and updated BGP peer commands to reference the created interfaces.
- The BGP peer commands hard-coded peer IP addresses even though Google Cloud can configure the peer IPv4 address from the VLAN attachment's `customerRouterIpAddress`. Removed the hard-coded `--peer-ip-address` flags from the Cloud Router commands.
- The 99.99% SLA section said Dedicated Interconnect only needed connections in two metro areas. Updated it to state the official requirement: at least four Dedicated Interconnect connections, two in each of two metros, with same-metro connections in different edge availability domains.
- The Cloud Monitoring alert example used obsolete/non-current threshold flags with `gcloud alpha monitoring policies create`. Updated it to the current `gcloud monitoring policies create` syntax with `--if="< 1"` and `--duration=60s`.

## Review Notes
The local environment does not have `gcloud` installed, so CLI validation was performed against official Google Cloud CLI reference documentation rather than local `--help` output. The firewall examples are broad and should be narrowed for production, but they are syntactically valid and acceptable for a tutorial-level example.
