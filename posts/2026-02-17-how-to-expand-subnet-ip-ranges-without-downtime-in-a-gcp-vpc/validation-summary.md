# Validation Summary: How to Expand Subnet IP Ranges Without Downtime in a GCP VPC

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud VPC
- Google Cloud subnet primary IPv4 ranges
- VPC Network Peering
- Google Cloud CLI (`gcloud`)
- Cloud NAT and Cloud Router
- Google Cloud firewall rules
- Private Service Access

## Sources Consulted
- Google Cloud VPC subnet documentation: https://cloud.google.com/vpc/docs/subnets
- Google Cloud create and manage VPC networks guide, including "Expand a primary IPv4 range": https://cloud.google.com/vpc/docs/create-modify-vpc-networks
- Google Cloud CLI reference for `gcloud compute networks subnets expand-ip-range`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/expand-ip-range
- Google Cloud VPC Network Peering documentation: https://cloud.google.com/vpc/docs/vpc-peering
- Google Cloud CLI reference for `gcloud compute firewall-rules list`: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/list
- Google Cloud CLI reference for `gcloud compute routers nats create`: https://cloud.google.com/sdk/gcloud/reference/compute/routers/nats/create
- Google Cloud Compute Engine API reference for subnetworks: https://cloud.google.com/compute/docs/reference/rest/v1/subnetworks

## Issues Found
- The post said a `/24` subnet provides 251 usable IPs. Google Cloud reserves the first two and last two IPv4 addresses in a primary subnet range, so a `/24` provides 252 usable addresses. Updated the number.
- The post described subnet expansion as immediate and said the command completes in seconds. Google Cloud documents that expansion can take several minutes, while traffic within the subnet is not interrupted. Updated the timing language while preserving the no-downtime point.
- The post said an overlap with a peered network after expansion "will cause problems." Google Cloud rejects subnet primary IPv4 expansion that would create an overlapping peering subnet route. Updated the wording to say the operation returns an error and does not complete.
- The sample IP plan described `10.10.64.0/20` as expandable to `/16`, which would overlap the rest of the sample `10.10.0.0/16` allocation plan. Updated it to `/18`, matching the spacing used by the surrounding examples.

## Review Notes
The core workflow and `gcloud compute networks subnets expand-ip-range` command are current. The post correctly notes that primary subnet IPv4 ranges can be expanded but not shrunk, and that overlap checks are critical for local, peered, and allocated ranges. The local environment did not have `gcloud` installed, so CLI syntax was validated against official Google Cloud CLI reference pages rather than local `--help` output.
