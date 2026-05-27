# Validation Summary: How to Tune Persistent Disk IOPS and Throughput by Selecting Correct Disk Type

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud Compute Engine
- Persistent Disk (`pd-standard`, `pd-balanced`, `pd-ssd`, `pd-extreme`)
- Hyperdisk Extreme
- Local SSD
- Google Cloud CLI (`gcloud`)
- Cloud Monitoring metrics
- Linux filesystems and RAID tooling (`resize2fs`, `xfs_growfs`, `mdadm`)
- `fio` benchmarking
- Python

## Sources Consulted
- Google Cloud Compute Engine Persistent Disk performance overview: https://docs.cloud.google.com/compute/docs/disks/performance
- Google Cloud Compute Engine Extreme Persistent Disk documentation: https://docs.cloud.google.com/compute/docs/disks/extreme-persistent-disk
- Google Cloud Compute Engine Local SSD documentation: https://docs.cloud.google.com/compute/docs/disks/local-ssd
- Google Cloud Compute Engine add Local SSD documentation: https://docs.cloud.google.com/compute/docs/disks/add-local-ssd
- Google Cloud SDK `gcloud compute disks create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/disks/create
- Google Cloud SDK `gcloud compute instances create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud Monitoring Compute Engine metrics reference: https://docs.cloud.google.com/monitoring/api/metrics_gcp_c
- Google Cloud Compute Engine disk performance metrics documentation: https://docs.cloud.google.com/compute/docs/disks/review-disk-metrics

## Issues Found
- The pd-extreme maximum throughput values were outdated. Updated the table from 2,400 MB/s read and write to 4,000 MB/s read and 3,000 MB/s write, matching current Google Cloud limits for supported N2 configurations.
- The IOPS sizing example and Python script ignored baseline performance for pd-balanced and pd-ssd. Added baseline IOPS to the explanation and script, and updated the 30,000 IOPS examples accordingly.
- The Python sizing script truncated fractional disk sizes, which could under-provision disks. Changed it to use `math.ceil`.
- The pd-extreme creation command used `--provisioned-throughput`, which is not valid for pd-extreme; that flag is for Hyperdisk Throughput. Removed the flag and kept `--provisioned-iops`.
- The pd-extreme machine type note mentioned C3, which is not listed in the current Extreme Persistent Disk machine support. Updated it to N2, M2, and M3 with the N2 64-vCPU requirement.
- The Local SSD VM example used a C3 machine type with explicit `--local-ssd` flags. Current docs require `-lssd` machine types for C3/C3D/C4/C4D, while explicit `--local-ssd` flags apply to M3 and earlier generations. Changed the example to `m3-ultramem-64`.
- The Local SSD data-loss wording was too absolute. Updated it to say data is lost by default when the instance stops, reflecting the current preview option to preserve Local SSD data.
- The RAID example used `/dev/nvme*` names, which Google Cloud documents as unpredictable across restarts. Updated it to use stable `/dev/disk/by-id/google-local-nvme-ssd-*` paths.
- The queue depth metric name was incorrect. Changed `disk/queue_depth` to `disk/average_io_queue_depth`.

## Review Notes
The post remains a useful technical guide after correction. Several performance numbers still depend on machine type, vCPU count, disk size, I/O size, and region or zone availability, so readers should continue to verify exact limits against Google Cloud documentation for their specific configuration.
