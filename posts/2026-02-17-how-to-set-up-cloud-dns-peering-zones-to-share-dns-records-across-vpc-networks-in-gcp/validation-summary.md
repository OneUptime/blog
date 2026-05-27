# Validation Summary: How to Set Up Cloud DNS Peering Zones to Share DNS Records Across VPC Networks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud DNS
- Cloud DNS peering zones
- Google Cloud VPC networking
- Google Cloud CLI
- Terraform Google provider
- Google Cloud IAM

## Sources Consulted
- Google Cloud: Create a peering zone: https://cloud.google.com/dns/docs/zones/peering-zones
- Google Cloud: DNS zones overview: https://cloud.google.com/dns/docs/zones/zones-overview
- Google Cloud: Name resolution order: https://cloud.google.com/dns/docs/vpc-name-res-order
- Google Cloud SDK reference: gcloud dns managed-zones create: https://cloud.google.com/sdk/gcloud/reference/dns/managed-zones/create
- Google Cloud SDK reference: gcloud dns record-sets create: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/create
- Terraform Registry: google_dns_managed_zone: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_managed_zone
- Google Cloud IAM: Cloud DNS roles and permissions: https://cloud.google.com/iam/docs/roles-permissions/dns

## Issues Found
- The post said DNS peering has no transitive support and that peering zones cannot chain. Google Cloud documentation currently says transitive DNS peering is supported through a single transitive hop only. Updated the limitations section to describe the one-hop limit accurately.
- The IAM section incorrectly implied that the consumer project's Cloud DNS service agent, using the `service-PROJECT_NUMBER@gcp-sa-dns.iam.gserviceaccount.com` format, should receive `roles/dns.peer`. Google Cloud's documented flow grants `roles/dns.peer` to the IAM principal or service account used to create the peering zone. Updated the prose, gcloud example, Terraform IAM member, and troubleshooting note.
- The prerequisites said a cross-project setup requires the VPC network self-link URL. That is true for the Terraform `network_url` examples but not for the shown `gcloud` commands, which use project and network IDs. Updated the prerequisite to scope the self-link requirement to Terraform.
- The post created the peering zone before explaining cross-project IAM. Added a short note that cross-project IAM must be in place before running the create command.

## Review Notes
The Cloud DNS and Terraform command patterns are otherwise current. The post uses placeholder project IDs, VPC names, and service account names, so readers still need to replace them with real resources and ensure the service account exists before using it.
