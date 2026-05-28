# Validation Summary: How to Configure Subnet IP Ranges and Secondary Ranges in GCP VPC

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud VPC
- Google Cloud subnets
- Primary and secondary IPv4 ranges
- Google Kubernetes Engine VPC-native clusters
- Google Cloud CLI
- VPC Network Peering

## Sources Consulted
- Google Cloud VPC subnets documentation: https://docs.cloud.google.com/vpc/docs/subnets
- Google Cloud VPC quotas and limits: https://docs.cloud.google.com/vpc/docs/quota
- Google Kubernetes Engine VPC-native clusters documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/alias-ips
- Google Kubernetes Engine maximum Pods per node documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/flexible-pod-cidr
- Google Cloud CLI `gcloud compute networks subnets create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/create
- Google Cloud CLI `gcloud compute networks subnets update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- Google Cloud CLI `gcloud compute networks subnets expand-ip-range` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/expand-ip-range
- Google Cloud CLI `gcloud container clusters create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/create

## Issues Found
- Corrected the secondary range limit from 30 to 170 per subnet based on current VPC limits.
- Corrected usable primary subnet IP counts. Google Cloud reserves 4 primary subnet addresses, so a /20 has 4,092 usable addresses, not 4,094, and the table now subtracts 4 rather than 5.
- Corrected the reserved-address explanation to avoid double-counting the gateway address.
- Replaced an invalid and overlapping Mermaid example Pod range (`10.10.16.0/14`) with a valid non-overlapping secondary range (`10.10.64.0/18`).
- Updated the GKE Pod range sizing guidance for 100 nodes from /14 or /15 to at least /17, with /16 as safer headroom.
- Clarified that user-managed GKE Services ranges apply when the cluster is configured to use one, because newer GKE versions can use a GKE-managed Services range by default.
- Updated the GKE cluster creation command and explanation to use `--default-max-pods-per-node`, matching current Google Cloud documentation for setting the cluster-level default.
- Removed the inaccurate statement that primary range expansion cannot change the starting address; the essential constraint is that the expanded range must be a larger superset.
- Clarified that the peering command lists peerings and route import/export settings, not imported routes or remote subnet ranges themselves.
- Broadened the valid subnet range description to include supported non-RFC 1918 private ranges as well as privately used public ranges.

## Review Notes
The Google Cloud CLI was not installed in the local environment, so command validation was performed against official Google Cloud CLI reference documentation instead of local `gcloud --help` output.
