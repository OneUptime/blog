# Validation Summary: How to Migrate from VPN to Cloud Interconnect Without Downtime in GCP

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Cloud Interconnect
- Dedicated Interconnect VLAN attachments
- Google Cloud Cloud VPN / HA VPN
- Cloud Router
- BGP routing policy, MED, and local preference
- Cloud Monitoring
- Google Cloud CLI and Monitoring API

## Sources Consulted
- Google Cloud CLI reference: `gcloud compute interconnects create` - https://cloud.google.com/sdk/gcloud/reference/compute/interconnects/create
- Google Cloud CLI reference: `gcloud compute interconnects attachments dedicated create` - https://cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/dedicated/create
- Google Cloud documentation: Create VLAN attachments for Dedicated Interconnect - https://cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/creating-vlan-attachments
- Google Cloud CLI reference: `gcloud compute routers add-interface` - https://cloud.google.com/sdk/gcloud/reference/compute/routers/add-interface
- Google Cloud CLI reference: `gcloud compute routers add-bgp-peer` - https://cloud.google.com/sdk/gcloud/reference/compute/routers/add-bgp-peer
- Google Cloud documentation: Cloud Router learned routes - https://cloud.google.com/network-connectivity/docs/router/concepts/learned-routes
- Google Cloud documentation: Cloud VPN networks and tunnel routing - https://cloud.google.com/network-connectivity/docs/vpn/concepts/choosing-networks-routing
- Google Cloud documentation: Cloud VPN order of routes - https://cloud.google.com/network-connectivity/docs/vpn/concepts/order-of-routes
- Google Cloud documentation: Cloud Interconnect monitoring - https://cloud.google.com/network-connectivity/docs/interconnect/how-to/monitoring
- Google Cloud Monitoring metrics list for Interconnect - https://cloud.google.com/monitoring/api/metrics_gcp_i_o
- Google Cloud Monitoring documentation: Retrieve time-series data - https://cloud.google.com/monitoring/custom-metrics/reading-metrics

## Issues Found
- The VLAN attachment examples used `--bandwidth=BPS_5G`, which is an API-style enum rather than the current `gcloud` CLI value. Changed both examples to `--bandwidth=5g`.
- The BGP examples implied that outbound MED changes alone make all traffic prefer VPN or Interconnect. MED on routes advertised to Cloud Router controls the GCP-to-on-premises direction, so I added local preference examples and notes for controlling the on-premises-to-GCP direction.
- The Interconnect BGP peer examples used fixed peer IP addresses without allocating those addresses on the VLAN attachments. Added `--candidate-cloud-router-ip-address` and `--candidate-customer-router-ip-address` values so the later BGP peer IP examples match the attachment configuration.
- The test-subnet section said traffic to the test subnet flows over Interconnect without noting directionality. Clarified that the shown MED policy controls GCP-to-on-premises traffic and that symmetric tests need the matching local preference policy.
- The Cloud Monitoring command used a non-current metric type, `compute.googleapis.com/interconnect/attachment/transmitted_bytes_count`, and a BSD-specific `date -v` expression. Replaced it with a Monitoring API request using the current Interconnect metric type `interconnect.googleapis.com/network/attachment/sent_bytes_count` and GNU-compatible `date -d`.

## Review Notes
The local environment did not have the Google Cloud SDK installed, so CLI validation was performed against the official Google Cloud CLI reference documentation rather than local `gcloud --help` output.
