# Validation Summary: How to Create a Compute Engine VM from a Snapshot of Another Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- Persistent Disk snapshots
- Cross-project IAM
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- Custom Compute Engine images
- Customer-managed encryption keys (CMEK)

## Sources Consulted
- Google Cloud CLI reference: `gcloud compute disks snapshot` - https://cloud.google.com/sdk/gcloud/reference/compute/disks/snapshot
- Google Cloud CLI reference: `gcloud compute snapshots add-iam-policy-binding` - https://cloud.google.com/sdk/gcloud/reference/compute/snapshots/add-iam-policy-binding
- Google Cloud CLI reference: `gcloud compute disks create` - https://cloud.google.com/sdk/gcloud/reference/compute/disks/create
- Google Cloud CLI reference: `gcloud compute instances create` - https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud CLI reference: `gcloud compute images create` - https://cloud.google.com/sdk/gcloud/reference/compute/images/create
- Google Cloud Compute Engine documentation: Restore from a snapshot - https://cloud.google.com/compute/docs/disks/restore-snapshot
- Google Cloud Compute Engine documentation: Create archive and standard disk snapshots - https://cloud.google.com/compute/docs/disks/create-snapshots
- Google Cloud Compute Engine documentation: Manage access to custom images - https://cloud.google.com/compute/docs/images/managing-access-custom-images
- Google Cloud IAM documentation: Compute Engine roles and permissions - https://cloud.google.com/iam/docs/roles-permissions/compute
- Terraform Google provider documentation: `google_compute_snapshot` data source - https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/compute_snapshot
- Terraform Google provider documentation: `google_compute_disk` resource - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_disk

## Issues Found
- The post described snapshotting a VM but used `gcloud compute disks snapshot`, which snapshots a disk resource. Updated the examples and script to refer to the source boot disk instead of implying the VM instance itself is the disk.
- The IAM section said the destination project's default Compute Engine service account needs snapshot read access. Corrected this to say the principal creating the destination disk or VM needs the permission, with the default service account shown only as an automation example.
- The all-in-one script claimed to clone a VM by VM name, but it actually snapshots a disk named by the second argument. Updated the parameter name and output text to make the script's behavior accurate.
- The custom image example used the VM name as the source disk. Updated it to use a boot disk name.
- The cross-region section said snapshots are global resources. Current Compute Engine documentation distinguishes globally scoped and regionally scoped snapshots, so the text now says globally scoped snapshots can be used across zones.
- The watch-outs section implied network settings and service accounts are restored from the disk snapshot. Updated it to clarify that VM network settings must be specified during creation and the default destination service account is used unless another one is specified.
- The CMEK note focused only on the source disk. Updated it to focus on the source snapshot and the need for the destination disk creator to have key permissions or use a re-encrypted copy.

## Review Notes
The Google Cloud CLI is not installed in this workspace, so local `gcloud --help` checks could not be run. Commands and flags were verified against current official Google Cloud CLI documentation instead.
