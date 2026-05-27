# Validation Summary: How to Troubleshoot DNS Peering Between VPC Networks Not Resolving Records

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud
- Cloud DNS
- Cloud DNS peering zones
- Cloud DNS private zones and forwarding zones
- VPC networks
- Google Cloud CLI
- Cloud Logging

## Sources Consulted
- Google Cloud DNS zones overview: https://docs.cloud.google.com/dns/docs/zones/zones-overview
- Google Cloud create a peering zone: https://docs.cloud.google.com/dns/docs/zones/peering-zones
- Google Cloud VPC name resolution order: https://docs.cloud.google.com/dns/docs/vpc-name-res-order
- Google Cloud DNS logging and monitoring: https://docs.cloud.google.com/dns/docs/monitoring
- Google Cloud SDK `gcloud dns managed-zones create` reference: https://cloud.google.com/sdk/gcloud/reference/dns/managed-zones/create
- Google Cloud DNS REST `ManagedZone` resource reference: https://cloud.google.com/dns/docs/reference/rest/v1/managedZones

## Issues Found
- The post said DNS peering does not support chaining at all. Google Cloud documentation currently states that transitive DNS peering is supported through one transitive hop only. Updated Step 4, the diagram, and the checklist to describe the one-hop limit accurately.
- The post said the producer VPC needs a private zone with the records. DNS peering follows the producer VPC name resolution order, which can resolve through private zones, forwarding zones, Compute Engine internal DNS, or outbound server policies. Updated Step 2 and related wording.
- The post listed Cloud DNS resolution order as private zones, then peering zones, then forwarding zones, then public DNS. Current documentation uses outbound server policy, response policies, then longest-suffix matching across VPC network-scoped private, forwarding, and peering zones, then internal DNS, then public DNS. Updated Step 5.
- The post implied an identical local private zone and peering zone could coexist for the same VPC and that the local private zone would simply win. Google Cloud documentation says identical origins are not allowed for private zones authorized to the same VPC unless one is a subdomain of the other. Updated the conflict example to use an overlapping, more-specific zone.
- The private zone update command used only the hub VPC in `--networks`, which could drop existing authorized networks. Updated the example to show retaining other existing networks and added a note.
- The post said the trailing dot is required for the `--dns-name` value. Google examples use both dotted and non-dotted suffixes, while the API stores fully qualified names with a trailing dot. Changed the note to say the trailing dot avoids ambiguity.
- The cross-project IAM grant used a specific Google-managed service account pattern that is not the documented Cloud DNS peering workflow. Updated it to grant `roles/dns.peer` to the IAM member or service account that creates the peering zone.
- The post said all VM DNS queries go through `169.254.169.254`. Updated the wording to clarify that this applies when the VM is configured to use the metadata server as its resolver.

## Review Notes
The Google Cloud CLI was not installed in the local environment, so CLI flags were verified against official Google Cloud SDK documentation instead of local `gcloud --help` output.
