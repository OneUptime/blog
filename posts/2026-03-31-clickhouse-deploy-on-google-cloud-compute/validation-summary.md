# Validation Summary: How to Deploy ClickHouse on Google Cloud Compute Engine

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- ClickHouse (server + client)
- Google Cloud Compute Engine (n2, m3, c3 machine types)
- `gcloud` CLI
- Persistent disk (pd-ssd) + Local SSD
- Debian 12
- ext4 filesystem / fstab
- GCE firewall rules (VPC)
- Linux OS tuning (THP, `/etc/security/limits.conf`)
- Google Cloud Storage (via S3-compatible endpoint + HMAC)
- ClickHouse `BACKUP` statement

## Sources Consulted
- [ClickHouse: Install on Debian/Ubuntu](https://clickhouse.com/docs/install/debian_ubuntu)
- [ClickHouse: Backup and Restore](https://clickhouse.com/docs/operations/backup)
- [ClickHouse: Export backups to your own cloud account (GCS section)](https://clickhouse.com/docs/cloud/manage/backups/export-backups-to-own-cloud-account)
- [Google Cloud: Machine family resource and comparison guide](https://cloud.google.com/compute/docs/machine-resource)
- [Google Cloud: `gcloud compute instances create`](https://cloud.google.com/sdk/gcloud/reference/compute/instances/create)
- [Google Cloud: `gcloud compute firewall-rules create`](https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create)
- [Google Cloud: HMAC keys for service accounts](https://cloud.google.com/storage/docs/authentication/hmackeys)

## Issues Found

1. **Incorrect ClickHouse installation URL and missing GPG key setup.**
   The original post piped `https://packages.clickhouse.com/deb/archive/apt/stable.sources` into `/etc/apt/sources.list.d/clickhouse.sources`. That URL is not part of the official install documentation, and the procedure skipped GPG key verification entirely, so `apt-get update` would fail (or leave the repo unauthenticated). Replaced with the officially documented flow: import the ClickHouse signing key into `/usr/share/keyrings/clickhouse-keyring.gpg`, then add a `signed-by`, `arch=${ARCH}` entry at `/etc/apt/sources.list.d/clickhouse.list` pointing at `https://packages.clickhouse.com/deb stable main`.

2. **Invalid `BACKUP ... TO GCS(...)` destination.**
   ClickHouse's `BACKUP` statement only supports `File`, `Disk`, `S3`, and `AzureBlobStorage` destinations — there is no `GCS()` function. The `gcs_truncate_on_insert` setting also does not apply to `BACKUP`. Replaced the example with the officially documented pattern: `BACKUP DATABASE mydb TO S3('https://storage.googleapis.com/<bucket>/<path>/', 'GOOG_HMAC_KEY_ID', 'GOOG_HMAC_SECRET')`, plus a note that each backup needs a unique path to avoid `BACKUP_ALREADY_EXISTS`.

3. **Incorrect authentication claim for GCS backups.**
   The original text claimed "the VM's service account handles authentication automatically" for ClickHouse GCS backups. This is false for the S3-compatible GCS interface that ClickHouse uses — it requires HMAC credentials, not ADC. Rewrote the paragraph to call out the HMAC requirement and clarified the role binding applies to the service account tied to the HMAC key. The `--scopes=storage-rw` note was also softened since it does not help ClickHouse's BACKUP path.

## Review Notes
- Machine-type specs check out: `n2-highmem-16` = 16 vCPU / 128 GB, `n2-standard-32` = 32 vCPU / 128 GB, `m3-ultramem-32` = 32 vCPU / 976 GB, `c3-standard-8-lssd` includes attached Local SSD. These match Google's current machine-family documentation.
- Default ClickHouse ports 8123 (HTTP) and 9000 (native TCP) are correct.
- The data-disk example assumes the attached PD appears as `/dev/sdb`. This is typical for n2 instances but brittle across machine families (C3 uses NVMe under `/dev/nvme0n*`). Using `/dev/disk/by-id/google-clickhouse-data` would be more portable; left as-is since the post's device naming is reasonable for the chosen `n2-highmem-16`.
- THP disabling via `echo never > .../enabled` is correct but ephemeral; the post does mention persisting via rc.local/systemd but does not show the unit file — acceptable for a deployment overview.
- The summary line mentions "XFS or ext4" while the body only shows ext4; this is consistent since both are valid ClickHouse-supported filesystems.
