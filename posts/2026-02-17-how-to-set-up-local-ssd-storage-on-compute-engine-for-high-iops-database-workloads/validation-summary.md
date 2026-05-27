# Validation Summary: Set Up Local SSD Storage on Compute Engine for High-IOPS Database Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Compute Engine
- Google Cloud Local SSD
- gcloud CLI
- Linux ext4 filesystems and mount options
- mdadm RAID 0
- PostgreSQL 15 on Debian 12
- Cloud Storage backups and WAL archiving
- Google Cloud Monitoring / Ops Agent

## Sources Consulted
- Google Cloud Compute Engine Local SSD overview: https://docs.cloud.google.com/compute/docs/disks/local-ssd
- Google Cloud guide to adding Local SSD disks: https://docs.cloud.google.com/compute/docs/disks/add-local-ssd
- Google Cloud Local SSD performance benchmarking guide: https://docs.cloud.google.com/compute/docs/disks/benchmarking-local-ssd-performance
- gcloud compute instances create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud Persistent Disk performance overview: https://docs.cloud.google.com/compute/docs/disks/performance
- Google Cloud Observability Ops Agent overview: https://cloud.google.com/monitoring/agent/ops-agent
- Google Cloud Monitoring agent overview: https://docs.cloud.google.com/monitoring/agent/monitoring
- Debian package information for PostgreSQL on Debian 12: https://packages.debian.org/en/bookworm/postgresql
- PostgreSQL 15 WAL configuration documentation: https://www.postgresql.org/docs/15/runtime-config-wal.html
- PostgreSQL 15 continuous archiving documentation: https://www.postgresql.org/docs/15/continuous-archiving.html
- Linux ext4 and mount manual pages available in the local environment

## Issues Found
- The post described Local SSD data as gone whenever a VM stops. Google Cloud now supports explicit Local SSD data preservation for stop and suspend operations, so the text was updated to distinguish termination/preemption/host failure risk from the optional preservation feature.
- The post used decimal GB for Local SSD partition sizing. Google Cloud documents Local SSD capacity as 375 GiB per disk, so capacity references were updated to GiB.
- The sample VM used `n2-standard-8` while later quoting maximum four-disk Local SSD performance. Google Cloud documents that N2 instances need at least 24 vCPUs to reach the stated maximum Local SSD performance, so the example was changed to `n2-standard-24`.
- The post identified devices with `/dev/nvme*` names and assumed boot and Local SSD ordering. Google Cloud warns those names are not predictable across restarts, so commands were updated to use `/dev/disk/by-id/google-local-nvme-ssd-*`.
- The post recommended `nobarrier` for ext4 mounts and claimed it is safe for Local SSDs. This was removed because ext4 write barriers protect journal ordering, and the official Google examples do not recommend disabling them.
- The fstab examples used unstable block device names. They were updated to use filesystem UUIDs, matching Google Cloud's recommended approach.
- The mdadm command used unstable `/dev/nvme*` paths. It was updated to use stable Local SSD by-id paths.
- The mdadm installation command was adjusted to include `--no-install-recommends`, matching Google Cloud's Debian/Ubuntu guidance for this workflow.
- The I/O scheduler, readahead, and NVMe health examples used unstable device names. They were updated to resolve or use the by-id Local SSD paths.
- The PostgreSQL memory-setting comments implied exact RAM percentages that no longer matched the corrected VM shape. The comments were changed to make them example values that should be tuned for available RAM.
- The post referred to the Cloud Monitoring agent for new monitoring setup. Google recommends the Ops Agent for new Compute Engine workloads, so the wording was updated.

## Review Notes
The PostgreSQL example remains intentionally simplified. A production setup should validate WAL archiving behavior, base backups, recovery testing, permissions, IAM access to Cloud Storage, and whether pg_dump alone meets the recovery point objective.
