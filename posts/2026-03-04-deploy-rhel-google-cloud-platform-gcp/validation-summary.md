# Validation Summary: How to Deploy RHEL on Google Cloud Platform (GCP)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux (RHEL) 9
- Google Cloud Platform (GCP)
- Google Compute Engine
- Google Cloud CLI (`gcloud`)
- Compute Engine startup scripts
- VPC firewall rules
- Persistent Disk formatting and mounting on Linux

## Sources Consulted
- Google Cloud Compute Engine operating system details: https://cloud.google.com/compute/docs/images/os-details
- Google Cloud Compute Engine Linux startup scripts: https://cloud.google.com/compute/docs/instances/startup-scripts/linux
- Google Cloud CLI reference for `gcloud compute instances create`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud CLI reference for `gcloud compute firewall-rules create`: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Google Cloud Compute Engine disk symlinks: https://cloud.google.com/compute/docs/disks/disk-symlinks
- Google Cloud Compute Engine format and mount a non-boot disk on Linux: https://cloud.google.com/compute/docs/disks/format-mount-disk-linux

## Issues Found
- The introduction said the official RHEL images include `cloud-init`. Google Cloud's current RHEL image documentation confirms the guest environment and guest agent are installed and supported, but does not document cloud-init as part of the RHEL image configuration. Changed the wording to say the images include the Google guest environment, including the guest agent.
- The data disk example added `/dev/sdb` directly to `/etc/fstab`. Google Cloud documents that Linux device names can change across reboots and recommends stable identifiers such as UUIDs for automatic mounting. Updated the example to retrieve the disk UUID with `blkid` and write a UUID-based `/etc/fstab` entry. Also aligned the XFS format and mount commands with Google's documented recommended options.

## Review Notes
- The `gcloud compute instances create`, `gcloud compute images list`, `--metadata-from-file=startup-script=...`, firewall rule, disk creation, disk attachment, and SSH verification examples are consistent with current Google Cloud CLI syntax.
- The `/dev/sdb` device name is valid for the example's E2/SCSI context, but users should still confirm the attached disk device before formatting because formatting the wrong disk is destructive.
