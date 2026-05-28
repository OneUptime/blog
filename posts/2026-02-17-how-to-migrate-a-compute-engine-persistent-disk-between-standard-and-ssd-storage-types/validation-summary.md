# Validation Summary: How to Migrate a Compute Engine Persistent Disk Between Standard

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- Persistent Disk
- Google Cloud CLI (`gcloud`)
- Disk snapshots and restores
- Linux disk mounting and verification commands

## Sources Consulted
- Google Cloud: Modify a Persistent Disk - https://docs.cloud.google.com/compute/docs/disks/modify-persistent-disk
- Google Cloud: Restore from a snapshot - https://docs.cloud.google.com/compute/docs/disks/restore-snapshot
- Google Cloud: Persistent Disk performance overview - https://docs.cloud.google.com/compute/docs/disks/performance
- Google Cloud: Persistent Disk overview - https://docs.cloud.google.com/compute/docs/disks/persistent-disks
- Google Cloud: Best practices for Compute Engine disk snapshots - https://docs.cloud.google.com/compute/docs/disks/snapshot-best-practices
- Google Cloud: Use symbolic links to access disks attached to a Linux VM - https://docs.cloud.google.com/compute/docs/disks/disk-symlinks
- Google Cloud: Detaching and reattaching boot disks - https://docs.cloud.google.com/compute/docs/disks/detach-reattach-boot-disk
- Google Cloud: Extreme Persistent Disk - https://docs.cloud.google.com/compute/docs/disks/extreme-persistent-disk
- Google Cloud SDK: `gcloud compute snapshots create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/snapshots/create
- Google Cloud SDK: `gcloud compute instances create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud SDK: `gcloud compute instances attach-disk` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/attach-disk
- Google Cloud SDK: `gcloud compute instances delete` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/delete

## Issues Found
- The description claimed the post covered live migration, but the article only describes snapshot-based migration with downtime. Changed the description to say downtime planning instead.
- The performance explanation implied disk size alone determines available IOPS. Updated it to mention per-instance limits based on machine type and vCPU count.
- The `--device-name` explanation claimed the OS would see the new disk at the same device path. Updated it to describe Google-provided `/dev/disk/by-id` symlinks and note that raw `/dev/sdX` or NVMe names are not guaranteed stable.
- The boot disk section said a new VM is required. Updated it to explain that boot disks can be detached and attached only while the VM is stopped, and that creating a new VM is one option.
- The migration script listed `pd-extreme` as a supported target type, but Extreme Persistent Disk requires provisioned IOPS and supported machine types. Restricted the script to `pd-standard`, `pd-balanced`, and `pd-ssd`, and added validation for unsupported types.
- The downtime estimate gave a specific 10-30 minute expectation for a 200 GB disk. Replaced it with a more accurate note that downtime varies by used/changed data, snapshot history, and validation time.
- The performance section recommended pre-warming a disk created from a snapshot with `dd`. Current Google Cloud documentation says Persistent Disk does not require pre-warming to get the best performance. Removed the `dd` command and updated the explanation.

## Review Notes
The post is technically relevant and the core snapshot-and-restore migration flow matches Google Cloud's documented approach. `gcloud` was not installed in the local workspace, so CLI verification was performed against the current official Google Cloud SDK reference instead of local `--help` output.
