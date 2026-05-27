# Validation Summary: How to Resize a Compute Engine Boot Disk Without Stopping the VM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- Persistent Disk
- Google Cloud CLI
- Linux filesystems: ext4 and XFS
- Windows PowerShell disk management
- Terraform Google provider
- Cloud Monitoring / Ops Agent metrics

## Sources Consulted
- Google Cloud Compute Engine: Change the size of a Persistent Disk: https://cloud.google.com/compute/docs/disks/resize-persistent-disk
- Google Cloud SDK: gcloud compute disks resize: https://cloud.google.com/sdk/gcloud/reference/compute/disks/resize
- Google Cloud SDK: gcloud compute disks snapshot: https://cloud.google.com/sdk/gcloud/reference/compute/disks/snapshot
- Google Cloud SDK: gcloud alpha monitoring policies create: https://cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create
- Google Cloud Monitoring Ops Agent metrics: https://cloud.google.com/monitoring/api/metrics_opsagent
- Google Cloud Compute Engine Persistent Disk performance: https://cloud.google.com/compute/docs/disks/performance
- Terraform Registry: google_compute_instance: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance

## Issues Found
- The post implied all boot disks need manual partition and filesystem expansion. Google Cloud documentation states that public Google Cloud images usually resize boot disks automatically, while custom Linux images, custom Windows images, and Fedora CoreOS images might require manual resizing. Updated the before-you-start notes, Linux resize section, Windows section, and Terraform note to reflect this.
- The examples assumed `/dev/sda` without noting NVMe device naming. Added a concise caveat that NVMe-attached disks use names like `/dev/nvme0n1`.
- The automation script was presented as handling the entire process generally, but it only works for an ext4 boot disk named the same as the instance and attached as `/dev/sda`. Updated the lead-in to state those assumptions.
- The Terraform section used inline `boot_disk.initialize_params.size` and stated Terraform would resize in place. Google Cloud's resizing documentation recommends managing disk size through `google_compute_disk` / `google_compute_region_disk`. Updated the snippet to manage the boot disk as a separate `google_compute_disk` and attach it as the instance boot disk.
- The data disk section implied partitions usually do not need attention. Clarified that no partition growth is needed only when the filesystem is directly on the block device, and partitioned data disks require partition growth first.
- The Cloud Monitoring alert command used non-current flags `--condition-threshold-value` and `--condition-threshold-comparison`. Current `gcloud alpha monitoring policies create` uses `--if` for threshold expressions and `--duration` for the condition duration. Updated the command and added `metric.labels.state="used"` for the disk usage metric.
- The monitoring note referred only to the Cloud Monitoring agent. Updated it to mention the Ops Agent and the legacy Cloud Monitoring agent, matching current metric documentation.

## Review Notes
- The persistent disk performance values in the post match Google Cloud's current zonal Persistent Disk IOPS-per-GiB table, but actual achievable IOPS also depends on per-instance and machine-type limits.
- The `gcloud compute disks snapshot` examples are syntactically valid, although current Google Cloud snapshot documentation recommends `gcloud compute snapshots create` for newer snapshot workflows with more features.
