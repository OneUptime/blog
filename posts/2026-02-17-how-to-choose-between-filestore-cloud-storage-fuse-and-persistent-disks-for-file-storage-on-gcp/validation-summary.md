# Validation Summary: How to Choose Between Filestore Cloud Storage FUSE and Persistent Disks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Persistent Disk
- Google Cloud Filestore
- Cloud Storage FUSE
- Google Kubernetes Engine
- Kubernetes PersistentVolumes and CSI volumes
- NFS
- gcloud CLI

## Sources Consulted
- Google Cloud Persistent Disk documentation: https://docs.cloud.google.com/compute/docs/disks/persistent-disks
- Google Cloud Persistent Disk sharing documentation: https://docs.cloud.google.com/compute/docs/disks/sharing-disks-between-vms
- Google Cloud Filestore service tiers documentation: https://docs.cloud.google.com/filestore/docs/service-tiers
- Google Cloud Filestore limits documentation: https://docs.cloud.google.com/filestore/docs/limits
- Google Cloud Filestore snapshots documentation: https://docs.cloud.google.com/filestore/docs/snapshots
- Cloud Storage FUSE overview: https://docs.cloud.google.com/storage/docs/cloud-storage-fuse/overview
- Cloud Storage FUSE install documentation: https://docs.cloud.google.com/storage/docs/cloud-storage-fuse/install
- Cloud Storage FUSE CLI options reference: https://docs.cloud.google.com/storage/docs/cloud-storage-fuse/cli-options
- Cloud Storage FUSE mount documentation: https://docs.cloud.google.com/storage/docs/cloud-storage-fuse/mount-bucket
- GKE Cloud Storage FUSE CSI driver quickstart: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/cloud-storage-fuse-csi-driver
- Cloud Storage pricing: https://cloud.google.com/storage/pricing
- Filestore pricing: https://cloud.google.com/filestore/pricing

## Issues Found
- Corrected Persistent Disk multi-VM access wording. Persistent Disk supports read-only sharing and limited multi-writer mode for specialized block workloads, not only read-only multi-attach in all cases.
- Corrected Persistent Disk size units from 64 TB to 64 TiB to match Compute Engine documentation.
- Corrected Filestore maximum capacity. Enterprise is not the 100 TiB tier; current 100 TiB capacity applies to Zonal and Regional Filestore ranges, while Enterprise is lower.
- Corrected Filestore snapshot wording. Basic HDD and Basic SSD support backups but not snapshots; Zonal, Regional, and Enterprise tiers support snapshots.
- Fixed Filestore tier example commands by adding required location and network flags where omitted.
- Corrected Filestore scaling limitation. Basic tiers scale up only, but Zonal, Regional, and Enterprise can scale up or down within tier limits.
- Updated the Cloud Storage FUSE Debian/Ubuntu install snippet to use the current signed package source and Google Cloud public key instructions.
- Replaced deprecated Cloud Storage FUSE cache flags with current equivalents, and added `--cache-dir` because `--file-cache-max-size-mb` requires file caching to be enabled.
- Updated Cloud Storage FUSE write-performance wording to reflect current streaming writes behavior and whole-object rewrite limitations for patching or overwrite-in-place workloads.

## Review Notes
The price table remains approximate and region-specific. Actual pricing should still be checked against Google Cloud pricing pages before purchase decisions, especially because storage prices and Filestore tiers can change over time.
