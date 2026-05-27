# Validation Summary: How to Schedule Automatic Snapshots for Compute Engine Boot Disks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Compute Engine
- Persistent Disk and Hyperdisk snapshots
- Compute Engine snapshot schedules and resource policies
- gcloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud documentation: Create schedules for disk snapshots - https://docs.cloud.google.com/compute/docs/disks/scheduled-snapshots
- Google Cloud documentation: About snapshot schedules for disks - https://docs.cloud.google.com/compute/docs/disks/about-snapshot-schedules
- Google Cloud documentation: About archive and standard disk snapshots - https://docs.cloud.google.com/compute/docs/disks/snapshots
- Google Cloud documentation: Restore from a snapshot - https://docs.cloud.google.com/compute/docs/disks/restore-snapshot
- Terraform Registry: google_compute_disk_resource_policy_attachment - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_disk_resource_policy_attachment.html

## Issues Found
- The hourly schedule command used `--hourly-schedule` plus `--hourly-cycle=4`, but the current gcloud syntax expects the interval as the value of `--hourly-schedule`. Changed it to `--hourly-schedule=4`.
- The weekly schedule command used `--weekly-schedule` plus `--day-of-week=monday`, but the current gcloud syntax expects the day as the value of `--weekly-schedule`. Changed it to `--weekly-schedule=monday`.
- The retention explanation said snapshots older than the retention period are automatically deleted without qualification. Updated it to note that Compute Engine attempts deletion after a newer snapshot exists.
- The start-time explanation implied the snapshot starts exactly at the configured time. Updated it to describe the documented one-hour start window.
- The Terraform attachment example used `google_compute_instance.my_vm.boot_disk[0].device_name`, but the provider expects the disk name. Changed the example to use the disk name directly.
- The monitoring command was described as checking total snapshot storage, but it listed per-snapshot values and converted `storageBytes` to a yes/no value. Updated the description and output fields to show per-snapshot storage bytes.
- The restore example used a made-up scheduled snapshot name that did not match the documented generated naming pattern. Replaced it with a clear `SNAPSHOT_NAME` placeholder.
- The cost section stated that snapshot storage is always lower than persistent disk storage. Updated it to the accurate pricing model: snapshot storage is charged per GB-month based on snapshot type and storage location.
- The performance claim said snapshots have no performance impact. Softened it to minimal or little-to-no noticeable impact and kept the recommendation to schedule during quieter periods.

## Review Notes
The post is technically relevant and current after the corrections. Snapshot schedules create standard snapshots, not archive or instant snapshots; that distinction is now consistent with the reviewed documentation.
