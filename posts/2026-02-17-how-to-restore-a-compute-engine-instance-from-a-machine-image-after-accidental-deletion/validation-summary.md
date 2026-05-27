# Validation Summary: Restore a Compute Engine Instance from a Machine Image After Accidental Deletion

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Compute Engine
- Machine images
- Persistent disks
- Google Cloud CLI
- IAM
- Linux shell commands

## Sources Consulted
- Google Cloud Compute Engine machine images overview: https://docs.cloud.google.com/compute/docs/machine-images
- Google Cloud documentation for creating machine images: https://docs.cloud.google.com/compute/docs/machine-images/create-machine-images
- Google Cloud documentation for creating instances from machine images: https://docs.cloud.google.com/compute/docs/machine-images/create-instance-from-machine-image
- Google Cloud SDK reference for `gcloud compute machine-images create`: https://cloud.google.com/sdk/gcloud/reference/compute/machine-images/create
- Google Cloud SDK reference for `gcloud compute instances create`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud SDK reference for `gcloud compute disks create`: https://cloud.google.com/sdk/gcloud/reference/compute/disks/create
- Google Cloud SDK reference for `gcloud compute instances set-disk-auto-delete`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/set-disk-auto-delete
- Google Cloud SDK reference for `gcloud compute instances detach-disk`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/detach-disk
- Google Cloud SDK reference for `gcloud compute instances attach-disk`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/attach-disk

## Issues Found
- The post said machine images capture "everything" about an instance and preserve "all disks." Google Cloud documents exclusions, including data in memory, Local SSD data, source-instance-specific attributes such as name and IP address, and some unsupported instance or disk properties. Updated the wording to say machine images preserve persistent disks and most configuration.
- The post described stopped-instance machine images as recommended for "data consistency." Google Cloud documents running-machine images as crash-consistent across disks, while application-level consistency requires OS or application participation. Updated the wording to clarify that stopping is recommended for application-level consistency.
- The "Restoring Specific Disks Only" section used unsupported flags, `gcloud compute disks create --source-machine-image` and `--source-machine-image-disk-name`. The current `gcloud compute disks create` reference does not support creating a standalone disk directly from a machine image. Replaced this with a supported temporary-VM restore flow using `instances create --source-machine-image`, `instances describe`, `instances set-disk-auto-delete`, `instances detach-disk`, and `instances attach-disk`.

## Review Notes
The Google Cloud CLI was not installed in the local environment, so command validation was performed against current official Google Cloud documentation rather than local `gcloud --help` output.
