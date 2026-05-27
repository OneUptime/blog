# Validation Summary: How to Set Up a Private DNS Zone Visible Only to Specific VPC Networks in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Cloud DNS managed private zones
- Cloud DNS peering zones
- VPC networks
- Shared VPC
- Google Kubernetes Engine
- gcloud CLI
- DNS record sets, including A, CNAME, and PTR records

## Sources Consulted
- Google Cloud DNS: Create, modify, and delete zones: https://cloud.google.com/dns/docs/zones
- Google Cloud DNS: DNS zones overview: https://cloud.google.com/dns/docs/zones/zones-overview
- Google Cloud DNS: VPC name resolution order: https://cloud.google.com/dns/docs/vpc-name-res-order
- Google Cloud DNS: Create a peering zone: https://cloud.google.com/dns/docs/zones/peering-zones
- Google Cloud DNS: Add, update, and delete records: https://cloud.google.com/dns/docs/records
- Google Cloud SDK: gcloud dns managed-zones create: https://cloud.google.com/sdk/gcloud/reference/dns/managed-zones/create
- Google Cloud SDK: gcloud dns managed-zones update: https://cloud.google.com/sdk/gcloud/reference/dns/managed-zones/update
- Google Cloud SDK: gcloud dns record-sets update: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/update
- Google Kubernetes Engine: Use Cloud DNS for GKE: https://cloud.google.com/kubernetes-engine/docs/how-to/cloud-dns

## Issues Found
- The post said private zones are only resolvable from VMs. Updated this to refer to clients using authorized VPC networks, because private zones can be used by more than just VM processes, such as GKE workloads and connected clients using the VPC's DNS resolution path.
- The post implied that queries from outside authorized VPCs get no response or always return NXDOMAIN. Updated this to clarify that the private zone is not used outside authorized VPCs; external resolvers only see public DNS behavior, which depends on whether public records exist.
- The split-horizon example stated that external clients see the public IP. Updated this to clarify that external clients see the public IP only if a matching public DNS record exists.

## Review Notes
The gcloud commands and flags used for creating private zones, adding and updating record sets, DNS peering, Shared VPC authorization, and private reverse PTR zones match current Google Cloud documentation. The local environment did not have the Google Cloud SDK installed, so CLI validation was performed against the official Google Cloud SDK reference instead of local `gcloud --help` output.
