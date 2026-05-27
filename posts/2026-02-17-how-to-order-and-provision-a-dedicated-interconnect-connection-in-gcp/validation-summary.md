# Validation Summary: How to Order and Provision a Dedicated Interconnect Connection in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Dedicated Interconnect
- Cloud Interconnect
- Cloud Router
- VLAN attachments
- BGP
- Google Cloud CLI

## Sources Consulted
- Google Cloud: Order a Dedicated Interconnect connection - https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/ordering-dedicated-interconnect
- Google Cloud: Retrieve LOA-CFAs - https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/retrieving-loas
- Google Cloud: Test Dedicated Interconnect connections - https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/testing-connections
- Google Cloud: Create VLAN attachments - https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/creating-vlan-attachments
- Google Cloud: Establish 99.99% availability for Dedicated Interconnect - https://docs.cloud.google.com/network-connectivity/docs/interconnect/tutorials/dedicated-creating-9999-availability
- Google Cloud: Cloud Interconnect SLA - https://cloud.google.com/network-connectivity/docs/interconnect/sla
- Google Cloud CLI reference: gcloud compute interconnects create - https://cloud.google.com/sdk/gcloud/reference/compute/interconnects/create
- Compute Engine REST reference: Interconnect resource - https://docs.cloud.google.com/compute/docs/reference/rest/v1/interconnects
- Google Cloud: Get diagnostics - https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/getting-diagnostics

## Issues Found
- The post said two links in different Edge Availability Domains were enough for the 99.99% SLA. Updated this to distinguish the 99.9% topology from the 99.99% topology, which requires at least four Dedicated Interconnect connections across two metros.
- The redundancy guidance said to choose two facilities in different metros when possible. Updated it to describe same-metro different Edge Availability Domains for non-critical production and two metro pairs for 99.99%.
- The `gcloud compute interconnects create` examples omitted useful LOA/contact fields. Added `--customer-name` and `--noc-contact-email` to match Google Cloud ordering guidance.
- The provisioning states listed `PENDING_CUSTOMER` and `PENDING_PROVIDER`, which are not the current Interconnect resource state values. Replaced them with `UNPROVISIONED`, `ACTIVE`, and `UNDER_MAINTENANCE`.
- The light-level check used `gcloud compute interconnects describe` with `circuitInfos`, but Google Cloud documents light levels in diagnostics output. Changed the example to `gcloud compute interconnects get-diagnostics`.
- The VLAN attachment bandwidth example used `BPS_1G`; current Google Cloud CLI examples use values such as `1G` and `500M`. Updated it to `--bandwidth=1G`.
- The BGP setup skipped creation of the Cloud Router interface for the VLAN attachment and manually supplied the BGP peer IP. Added `gcloud compute routers add-interface` and removed the manual peer IP because the peer address is derived from the attachment's `customerRouterIpAddress`.
- The closing recommendation said to order interconnects in pairs for the 99.99% SLA. Updated it to say use redundant connections across Edge Availability Domains and two metro pairs for 99.99%.

## Review Notes
The post remains a high-level operational guide. A future deeper version could add explicit commands to describe the VLAN attachment and copy `vlanTag8021q`, `cloudRouterIpAddress`, and `customerRouterIpAddress` into the on-premises router configuration.
