# Validation Summary: How to Migrate Azure Virtual Machines to Google Compute Engine

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Migrate to Virtual Machines
- Google Compute Engine
- Google Cloud CLI
- Azure Virtual Machines
- Azure CLI
- Azure RBAC
- Cloud DNS
- Cloud Monitoring and Cloud Logging Ops Agent

## Sources Consulted
- Google Cloud: Enable Migrate to Virtual Machines services: https://cloud.google.com/migrate/virtual-machines/docs/5.0/get-started/enable-services
- Google Cloud: Create an Azure source: https://docs.cloud.google.com/migrate/virtual-machines/docs/5.0/migrate/create-an-azure-source
- Google Cloud: Migrate individual VMs: https://docs.cloud.google.com/migrate/virtual-machines/docs/5.0/migrate/migrating-vms
- Google Cloud CLI reference for Migrate to Virtual Machines: https://cloud.google.com/sdk/gcloud/reference/migration/vms
- Google Cloud CLI reference for Cloud DNS record updates: https://docs.cloud.google.com/sdk/gcloud/reference/dns/record-sets/update
- Google Cloud CLI reference for Compute Engine snapshot schedules: https://docs.cloud.google.com/sdk/gcloud/reference/compute/resource-policies/create/snapshot-schedule
- Google Cloud: Set up OS Login: https://docs.cloud.google.com/compute/docs/oslogin/set-up-oslogin
- Google Cloud: Install the Ops Agent on individual VMs: https://cloud.google.com/monitoring/agent/ops-agent/installation
- Microsoft Learn: Azure CLI service principal creation: https://learn.microsoft.com/cli/azure/ad/sp
- Microsoft Learn: Create or update Azure custom roles using Azure CLI: https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles-cli
- Microsoft Learn: Azure role assignment CLI reference: https://learn.microsoft.com/en-us/cli/azure/role/assignment

## Issues Found
- The post used `gcloud migration vms sources ...` and `gcloud migration vms migrating-vms ...` examples for Azure source creation, inventory, replication, test clone, cutover, and batch migration. These commands are not present in the current official gcloud reference. I replaced them with the documented Migrate to Virtual Machines console flow for Azure sources and VM migration lifecycle operations.
- The Azure permissions were described as Reader plus Disk Snapshot Contributor. Google documents a custom Azure role with specific VM, disk, snapshot, and resource group permissions. I replaced the role guidance with a custom role definition and role assignment.
- The required Google Cloud APIs list was incomplete. I added Service Control, IAM, and Cloud Resource Manager APIs.
- The architecture diagram incorrectly represented replicated data as GCE disk snapshots. I changed it to generic Google Cloud migration storage, because Migrate to Virtual Machines stores retained replication data and creates Compute Engine instances during test clone and cutover.
- The post-migration monitoring section used `google-monitoring-enable` metadata, which is not the current documented Ops Agent install method. I replaced it with the official Ops Agent installation commands and added the required Logging and Monitoring APIs.
- The post described `enable-guest-attributes=TRUE` as installing the Google guest agent. That metadata does not install the guest agent. I removed that command and kept verification of the guest agent service.
- The post did not mention finalizing the migration after cutover. I added the documented finalize note because retained replication data continues to consume storage until finalized.

## Review Notes
The remaining Compute Engine, Cloud DNS, OS Login, snapshot schedule, and Azure CLI examples are syntactically consistent with the official CLI references. The local environment did not have `gcloud` installed, so Google Cloud CLI checks were performed against official CLI documentation rather than local `--help` output.
