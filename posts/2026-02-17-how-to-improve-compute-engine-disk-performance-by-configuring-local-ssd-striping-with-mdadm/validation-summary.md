# Validation Summary: How to Improve Compute Engine Disk Performance by Configuring Local SSD Striping

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Compute Engine
- Compute Engine Local SSD
- NVMe Local SSD devices
- Linux software RAID with mdadm
- ext4 filesystem formatting
- fio disk benchmarking
- Linux block device tuning

## Sources Consulted
- Google Cloud Compute Engine Local SSD documentation: https://docs.cloud.google.com/compute/docs/disks/local-ssd
- Google Cloud guide to adding and formatting Local SSD disks: https://docs.cloud.google.com/compute/docs/disks/add-local-ssd
- Google Cloud SDK reference for `gcloud compute instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud Local SSD performance optimization documentation: https://docs.cloud.google.com/compute/docs/disks/optimizing-local-ssd-performance
- Linux `mdadm(8)` manual page: https://man7.org/linux/man-pages/man8/mdadm.8.html
- fio documentation: https://fio.readthedocs.io/en/master/fio_doc.html
- Red Hat ext4 storage administration documentation for stride and stripe-width: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/storage_administration_guide/ch-ext4

## Issues Found
- The sample VM used `n2-standard-8`, but Google Cloud documents that N2 instances require at least 24 vCPUs to reach the published Local SSD performance limits. Changed the sample to `n2-standard-24`.
- The post described Local SSD data as lost on any VM stop or host event. Current Compute Engine documentation has more specific persistence cases, including guest OS reboot, live migration, restart-in-place maintenance, and preview support for preserving Local SSD data on stop or suspend. Updated the durability language to avoid the overbroad claim.
- The device discovery and RAID creation examples used `/dev/nvme0n*` names directly. Google Cloud recommends stable `/dev/disk/by-id/google-local-nvme-ssd-*` paths for Local SSD devices. Updated discovery, verification, and `mdadm` commands to use those stable symlinks.
- The `sudo nvme list` verification command assumed `nvme-cli` was installed and relied on model text that is not needed when Google Local SSD symlinks are available. Replaced it with `ls -l /dev/disk/by-id/google-local-nvme-ssd-*`.
- The fio examples specified `--runtime=30` without `--time_based`, so fio could finish the configured workload before 30 seconds. Added `--time_based` to both benchmark commands.
- The scheduler tuning commands referenced fixed `/sys/block/nvme0n*` names. Updated them to resolve the Local SSD by-id symlinks before writing to the scheduler sysfs path.

## Review Notes
The post is now technically accurate for the documented Compute Engine Local SSD behavior and current command usage. The benchmark results remain workload- and machine-dependent; Google Cloud notes that public Local SSD maximums require the recommended instance configuration and enough vCPUs for the selected machine family.
