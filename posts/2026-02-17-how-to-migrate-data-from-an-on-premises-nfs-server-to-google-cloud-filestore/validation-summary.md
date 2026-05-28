# Validation Summary: How to Migrate Data from an On-Premises NFS Server to Google Cloud Filestore

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Filestore
- Google Cloud Storage Transfer Service
- Google Cloud Storage
- Google Cloud CLI
- Compute Engine
- NFS
- rsync
- Docker
- Linux shell commands

## Sources Consulted
- Google Cloud Filestore documentation: Copy data to or from instances: https://docs.cloud.google.com/filestore/docs/copying-data
- Google Cloud Filestore documentation: Mounting file shares on remote clients: https://docs.cloud.google.com/filestore/docs/remote-mounting
- Google Cloud Filestore documentation: Network configuration and IP resource requirements: https://docs.cloud.google.com/filestore/docs/network-ip-requirements
- Google Cloud Filestore documentation: Filestore overview and protocol support: https://docs.cloud.google.com/filestore/docs/overview
- Google Cloud Storage Transfer Service documentation: Manage transfer agents: https://docs.cloud.google.com/storage-transfer/docs/managing-on-prem-agents
- Google Cloud Storage Transfer Service documentation: Requirements for file system transfers: https://docs.cloud.google.com/storage-transfer/docs/on-prem-set-up
- Google Cloud Storage Transfer Service documentation: Create transfers: https://docs.cloud.google.com/storage-transfer/docs/create-transfers
- Google Cloud Storage Transfer Service documentation: Data transfer options: https://docs.cloud.google.com/storage-transfer/docs/transfer-options
- Google Cloud SDK reference: gcloud storage rsync: https://docs.cloud.google.com/sdk/gcloud/reference/storage/rsync
- Google Cloud SDK reference: gcloud compute instances create: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- rsync man page / local rsync 3.2.7 help output: https://man7.org/linux/man-pages/man1/rsync.1.html

## Issues Found
- The Storage Transfer Service Docker agent command used an unsupported `--mount-directories` flag and did not include the documented authentication setup. I updated the example to create a `gcloud-config` credentials volume, run the agent with `--volumes-from gcloud-config`, include the documented `--ulimit memlock=64000000`, mount the source directory at the same path inside the container, and set `--hostname`.
- The rsync examples preserved ownership by name by default, which can be wrong for NFS migrations that depend on numeric UID/GID values. I added `--numeric-ids` to the rsync transfer commands.
- The parallel rsync examples used `ls | xargs`, which breaks on paths with spaces and other special characters. I replaced them with `find ... -print0 | xargs -0`.
- The Cloud Storage staging section used `gsutil -m rsync` while the section title referred to gcloud, and current Google Filestore documentation recommends `gcloud storage rsync` for copying between Cloud Storage and mounted Filestore shares. I changed the examples to `gcloud storage rsync ... --recursive`.
- The Cloud Storage staging section implied direct CLI rsync was appropriate generally. I added the documented caveat that datasets larger than 1 TB should use Storage Transfer Service instead.

## Review Notes
The post is technically relevant and valid after the corrections. The examples still use placeholder project, bucket, IP address, zone, and share names, which is appropriate for a tutorial but requires readers to substitute environment-specific values.
