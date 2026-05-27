# Validation Summary: How to Set Up Multiple Cloud NAT Gateways on the Same VPC Subnet in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Cloud NAT / Public NAT
- Cloud Router
- VPC subnet primary and secondary IP ranges
- Google Cloud CLI (`gcloud`)
- Cloud Logging logs-based metrics
- GKE alias IP ranges

## Sources Consulted
- Google Cloud Public NAT documentation: https://docs.cloud.google.com/nat/docs/public-nat
- Google Cloud Public NAT setup and management guide: https://docs.cloud.google.com/nat/docs/set-up-manage-network-address-translation
- Google Cloud NAT product interactions, including GKE behavior: https://docs.cloud.google.com/nat/docs/nat-product-interactions
- Google Cloud NAT IP addresses and ports documentation: https://docs.cloud.google.com/nat/docs/ports-and-addresses
- Google Cloud NAT logs and metrics documentation: https://docs.cloud.google.com/nat/docs/monitoring
- Google Cloud NAT troubleshooting documentation: https://docs.cloud.google.com/nat/docs/troubleshooting
- Google Cloud NAT quotas and limits: https://docs.cloud.google.com/nat/quota
- Google Cloud CLI reference for `gcloud compute routers nats create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/nats/create
- Google Cloud CLI reference for `gcloud compute routers nats update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/nats/update
- Google Cloud CLI reference for `gcloud logging read`: https://docs.cloud.google.com/sdk/gcloud/reference/logging/read

## Issues Found
- The post incorrectly stated that each NAT gateway needs its own Cloud Router. Google Cloud documentation says each Public NAT gateway is associated with a single Cloud Router, but Cloud NAT quotas allow multiple NAT gateways per Cloud Router. I changed Step 2 to create one Cloud Router and updated the NAT create, describe, update, and alternate-subnet examples to use that router.

## Review Notes
- The `gcloud` CLI is not installed in the local review environment, so command validation was performed against the official Google Cloud CLI reference and Cloud NAT documentation.
- The core claim is correct: multiple Public NAT gateways can exist in the same region and VPC when each gateway is mapped to different subnets or non-overlapping IP ranges within a subnet.
- The Cloud NAT logging examples use documented fields such as `resource.type="nat_gateway"`, `resource.labels.gateway_name`, `jsonPayload.allocation_status`, and `jsonPayload.connection.src_ip`.
