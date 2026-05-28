# Validation Summary: How to Create a Google Cloud Filestore Instance Using the gcloud CLI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Filestore
- Google Cloud CLI
- NFS
- Google Cloud VPC networking
- Compute Engine client mounting

## Sources Consulted
- Google Cloud Filestore: Create an instance: https://cloud.google.com/filestore/docs/creating-instances
- Google Cloud Filestore: Service tiers: https://cloud.google.com/filestore/docs/service-tiers
- Google Cloud Filestore: Instance performance: https://cloud.google.com/filestore/docs/performance
- Google Cloud CLI reference: gcloud filestore instances create: https://cloud.google.com/sdk/gcloud/reference/filestore/instances/create
- Google Cloud Filestore: Mounting file shares on Compute Engine clients: https://cloud.google.com/filestore/docs/mounting-fileshares
- Google Cloud VPC: Configure private services access: https://cloud.google.com/vpc/docs/configure-private-services-access

## Issues Found
- The overview implied that all Filestore instances include replication and snapshots. Updated it to say backups are available across tiers, while snapshots and replication are available on supported tiers.
- The Zonal tier description incorrectly described zonal redundancy and gave an outdated fixed throughput claim. Updated it to describe single-zone availability and configurable performance that scales with capacity.
- The Regional tier description incorrectly said it has the same performance as Zonal. Updated it to describe regional availability and configurable performance without equating it to Zonal.
- The Enterprise tier description incorrectly described it as the highest tier with the broadest capacity options. Updated it to reflect current guidance that Enterprise is mainly used for multishares for GKE and that Google recommends REGIONAL whenever possible.
- The networking section incorrectly used `reserved-ip-range` as if it restricted client access to a subnet. Updated the section to explain that `reserved-ip-range` chooses the IP range used by the Filestore instance and replaced the examples with direct CIDR ranges that match the CLI reference.
- The zone guidance was too broad for regional tiers. Updated it to refer specifically to zonal instances and use "location" rather than only "zone."

## Review Notes
The local environment did not have `gcloud` installed, so CLI verification was performed against the current official Google Cloud CLI reference instead of local `gcloud --help` output.
