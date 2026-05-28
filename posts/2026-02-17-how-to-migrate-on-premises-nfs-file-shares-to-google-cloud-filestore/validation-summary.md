# Validation Summary: How to Migrate On-Premises NFS File Shares to Google Cloud Filestore

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Google Cloud Filestore
- NFS
- Google Cloud CLI
- Cloud Storage
- Cloud Storage FUSE
- Transfer Appliance
- rsync
- Linux mount and fstab

## Sources Consulted
- Google Cloud Filestore service tiers: https://cloud.google.com/filestore/docs/service-tiers
- Google Cloud Filestore instance performance: https://cloud.google.com/filestore/docs/performance
- gcloud filestore instances create reference: https://cloud.google.com/sdk/gcloud/reference/filestore/instances/create
- Google Cloud Filestore mounting file shares: https://cloud.google.com/filestore/docs/mounting-fileshares
- Google Cloud Filestore firewall rules: https://cloud.google.com/filestore/docs/configuring-firewall
- Google Cloud Filestore access control: https://cloud.google.com/filestore/docs/access-control
- gcloud storage cp reference: https://cloud.google.com/sdk/gcloud/reference/storage/cp
- Cloud Storage parallel composite uploads: https://cloud.google.com/storage/docs/parallel-composite-uploads
- Cloud Storage FUSE mount bucket documentation: https://cloud.google.com/storage/docs/cloud-storage-fuse/mount-bucket
- gcloud filestore backups create reference: https://cloud.google.com/sdk/gcloud/reference/filestore/backups/create
- Google Cloud Filestore backups overview: https://cloud.google.com/filestore/docs/backups
- Google Cloud Transfer Appliance specifications: https://cloud.google.com/transfer-appliance/docs/4.0/specifications

## Issues Found
- The tier list described Enterprise as the regional availability tier. Current Filestore documentation lists Regional as the general regional availability tier, while Enterprise is specifically tied to multishares for GKE and related compatibility. Changed the bullet to Regional.
- The Zonal tier bullet gave a fixed throughput value that did not match current capacity-based performance tables. Changed the wording to say throughput scales with capacity.
- The Basic SSD creation example used `capacity=2TB`, but Basic SSD instances require at least 2.5 TiB. Changed the example to `capacity=3TB`.
- The Cloud Storage example used `--parallel-composite-upload-threshold` as a `gcloud storage cp` flag. Current gcloud documentation exposes this as the `storage/parallel_composite_upload_threshold` property. Added the corresponding `gcloud config set` command and removed the invalid flag.
- The Filestore backup example labeled `gcloud filestore backups create` as creating a backup schedule, but that command creates an on-demand backup. Updated the comment to say "Create an on-demand backup."
- The firewall note only mentioned port 2049. Filestore documentation also discusses additional NFS-related ports, especially when file locking is used. Changed the wording to "required NFS traffic, including TCP port 2049."

## Review Notes
The migration flow is technically sound after the fixes. For future improvement, the post could add explicit installation steps for `nfs-common` and `gcsfuse`, and mention `--preserve-posix` when staging through Cloud Storage if preserving UID, GID, mode, and timestamps is required.
