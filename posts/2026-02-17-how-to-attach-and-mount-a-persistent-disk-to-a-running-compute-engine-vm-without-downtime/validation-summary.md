# Validation Summary: How to Attach and Mount a Persistent Disk to a Running Compute Engine VM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- Persistent Disk
- Google Cloud CLI (`gcloud`)
- Linux block devices, ext4, mount, and `/etc/fstab`
- Terraform Google provider

## Sources Consulted
- Google Cloud: Create a new Persistent Disk volume - https://docs.cloud.google.com/compute/docs/disks/add-persistent-disk
- Google Cloud: Attach a non-boot disk to a VM - https://docs.cloud.google.com/compute/docs/disks/attach-disks
- Google Cloud: Format and mount a non-boot disk on a Linux VM - https://docs.cloud.google.com/compute/docs/disks/format-mount-disk-linux
- Google Cloud: Persistent Disk overview and restrictions - https://docs.cloud.google.com/compute/docs/disks/persistent-disks
- Google Cloud: Share disks between instances - https://docs.cloud.google.com/compute/docs/disks/sharing-disks-between-vms
- Google Cloud: Increase the size of a persistent disk - https://cloud.google.com/compute/docs/disks/resize-persistent-disk
- Google Cloud SDK reference: `gcloud compute instances attach-disk` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/attach-disk
- Google Cloud SDK reference: `gcloud compute disks resize` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/disks/resize
- Terraform Registry: `google_compute_disk` and `google_compute_attached_disk` resources - https://registry.terraform.io/providers/hashicorp/google/latest/docs

## Issues Found
- The post stated that a Persistent Disk can be attached read-only to up to 10 VMs simultaneously. Google Cloud's current documentation has disk-type-specific limits: Balanced Persistent Disk supports at most 10 instances in read-only mode, Standard Persistent Disk has a recommended maximum of 10, and SSD Persistent Disk has a higher recommended maximum. Updated the wording to avoid presenting 10 as a universal limit.

## Review Notes
- The `gcloud` examples, `mkfs.ext4` options, `mount` options, UUID-based `/etc/fstab` entry, `nofail` usage, Terraform resource examples, and resize flow match current Google Cloud documentation.
- Google Cloud also recommends backing up `/etc/fstab` before editing it and removing stale `/etc/fstab` entries before detaching disks or creating boot disk snapshots. The post is still technically correct without those extra operational cautions.
