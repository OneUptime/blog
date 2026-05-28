# Validation Summary: How to Configure Static IP Addresses for Cloud NAT in GCP for Third-Party API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Cloud NAT / Public NAT
- Cloud Router
- Compute Engine regional external IP addresses
- Google Cloud CLI
- Cloud Logging
- Cloud Monitoring

## Sources Consulted
- Google Cloud NAT IP addresses and ports: https://docs.cloud.google.com/nat/docs/ports-and-addresses
- Google Cloud NAT logs and metrics: https://docs.cloud.google.com/nat/docs/monitoring
- Google Cloud CLI `gcloud compute routers nats create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/nats/create
- Google Cloud CLI `gcloud compute routers nats update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/nats/update
- Google Cloud CLI `gcloud compute addresses create`: https://cloud.google.com/sdk/gcloud/reference/compute/addresses/create
- Google Cloud CLI `gcloud compute addresses list`: https://cloud.google.com/sdk/gcloud/reference/compute/addresses/list
- Google Cloud CLI `gcloud compute routers create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/create
- Google Cloud CLI `gcloud compute ssh`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/ssh

## Issues Found
- The post said auto-allocated Cloud NAT IPs can change "at any time" and listed unsupported causes such as Google rebalancing IP allocation. Updated this to match Google Cloud documentation: automatic allocation can add IPs based on VM and port requirements, remove unused IPs, and replace addresses when the NAT gateway network tier changes. The key allowlisting issue is that future automatically allocated IPs cannot be predicted ahead of time.
- The post sized NAT IPs with `ceil(Max concurrent connections / 64512)`. That is misleading because Cloud NAT reserves NAT source IP and source port tuples per VM, and the reservation limits simultaneous connections per unique destination IP, destination port, and protocol tuple. Updated the formula to use `ceil((VMs using NAT * Minimum ports per VM) / 64512)`.
- The monitoring section referred to "Port utilization per IP". Google Cloud's documented metric is allocated ports with a `nat_ip` label. Updated the wording to "Allocated ports per NAT IP".

## Review Notes
The Google Cloud CLI examples use current flags for reserving regional addresses, creating Cloud Router, creating and updating Cloud NAT with manual NAT IP assignment, custom subnet NAT ranges, logging, and dynamic port allocation. The `gcloud` binary was not installed in the local environment, so command verification was performed against official Google Cloud CLI reference documentation rather than local `--help` output.
