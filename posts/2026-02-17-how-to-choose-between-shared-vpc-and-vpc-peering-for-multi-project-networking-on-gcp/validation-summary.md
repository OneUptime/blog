# Validation Summary: How to Choose Between Shared VPC and VPC Peering for Multi-Project Networking

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud VPC
- Shared VPC
- VPC Network Peering
- Google Cloud CLI (`gcloud`)
- Google Kubernetes Engine (GKE)
- Google Cloud firewall rules
- Google Cloud Load Balancing

## Sources Consulted
- Google Cloud Shared VPC overview: https://cloud.google.com/vpc/docs/shared-vpc
- Google Cloud Provision Shared VPC: https://cloud.google.com/vpc/docs/provisioning-shared-vpc
- Google Cloud VPC Network Peering overview: https://cloud.google.com/vpc/docs/vpc-peering
- Google Cloud VPC quotas and limits: https://cloud.google.com/vpc/docs/quota
- Google Cloud SDK reference for `gcloud compute shared-vpc enable`: https://cloud.google.com/sdk/gcloud/reference/compute/shared-vpc/enable
- Google Cloud SDK reference for `gcloud compute shared-vpc associated-projects add`: https://cloud.google.com/sdk/gcloud/reference/compute/shared-vpc/associated-projects/add
- Google Cloud SDK reference for `gcloud compute networks peerings create`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/peerings/create
- Google Cloud SDK reference for `gcloud compute networks subnets create`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/create
- Google Cloud SDK reference for `gcloud container clusters create`: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud GKE Shared VPC guide: https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-shared-vpc
- Google Cloud VPC firewall rules overview: https://cloud.google.com/firewall/docs/firewalls
- Google Cloud Load Balancing cross-project service referencing with Shared VPC: https://cloud.google.com/load-balancing/docs/https/set-up-global-ext-https-shared-vpc

## Issues Found
- The VPC Peering description said peering creates a tunnel. Google Cloud describes VPC Network Peering as connecting VPC networks through route exchange, not as a tunnel-based mechanism. Updated the wording to say peering exchanges routes and adjusted the analogy accordingly.
- The feature comparison listed fixed maximums for Shared VPC service projects per host and VPC peerings per network. Current Google Cloud documentation presents these as quota-based limits. Updated the table to avoid hard-coding values that can vary by quota.
- The GKE cluster example referenced `pods` and `services` secondary ranges, but the earlier `backend-subnet` command did not create those ranges. Added `--secondary-range=pods=10.4.0.0/14,services=10.0.32.0/20` to the subnet creation command.
- The decision checklist said VPC Peering is the only cross-organization option. That is true only in the context of choosing between Shared VPC and VPC Peering. Updated the wording to make that scope explicit.

## Review Notes
The `gcloud` CLI was not installed in the local environment, so command verification was performed against official Google Cloud SDK reference pages rather than local `--help` output.
