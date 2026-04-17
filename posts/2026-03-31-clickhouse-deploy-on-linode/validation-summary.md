# Validation Summary: How to Deploy ClickHouse on Linode

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- ClickHouse (server + client, Debian/Ubuntu packages)
- Linode / Akamai Cloud (linodes, volumes, cloud firewall, object storage)
- linode-cli
- Ubuntu 22.04
- ext4 filesystem, fstab mount options
- ClickHouse BACKUP to S3-compatible storage

## Sources Consulted
- ClickHouse install docs: https://clickhouse.com/docs/install/debian_ubuntu
- ClickHouse BACKUP docs: https://clickhouse.com/docs/en/operations/backup
- linode-cli GitHub wiki (Usage): https://github.com/linode/linode-cli/wiki/Usage
- ClickHouse packages server (direct URL check of `/deb/archive/apt/stable.sources` → 404)

## Issues Found
1. **Incorrect ClickHouse APT repository URL.** The original install snippet fetched `https://packages.clickhouse.com/deb/archive/apt/stable.sources` and wrote it to `/etc/apt/sources.list.d/clickhouse.sources`. That URL returns 404; it is not the repository path ClickHouse publishes. Replaced with the officially documented setup: dearmor the ClickHouse signing key into `/usr/share/keyrings/clickhouse-keyring.gpg` and write a `deb [signed-by=...] https://packages.clickhouse.com/deb stable main` line to `/etc/apt/sources.list.d/clickhouse.list`. Without this fix, `apt-get update` would either fail (missing file) or produce an unsigned-repo error.
2. **Invalid ClickHouse BACKUP setting `s3_region`.** The original `BACKUP DATABASE ... TO S3(...) SETTINGS s3_region = 'us-east-1';` used a setting that ClickHouse does not document for backups — only `s3_storage_class` and `use_same_s3_credentials_for_base_backup` are S3-specific BACKUP settings. The region is already implied by the `us-east-1.linodeobjects.com` endpoint hostname. Removed the `SETTINGS` clause so the statement parses and runs as intended.

## Review Notes
- `--private_ip true` is consistent with linode-cli's underscore-based flag style (e.g. `--root_pass`) and the underlying Linode API's boolean schema, so it was left unchanged.
- `g7-highmem-16` (Linode 64GB, 16 vCPU) and `g7-highmem-32` (Linode 128GB, 32 vCPU) plan IDs match Linode's High Memory lineup as of review date.
- `/dev/disk/by-id/scsi-0Linode_Volume_<label>` is Linode's documented stable device-path convention for Block Storage Volumes.
- The Cloud Firewall example uses `--rules.inbound_policy` and `--rules.outbound_policy` alongside a JSON `--rules.inbound` array, which is the expected linode-cli syntax for structured rule objects.
- The `<listen_host>` XML snippet is valid ClickHouse config; in production this would typically live in `/etc/clickhouse-server/config.d/listen.xml`, which is worth calling out in a future revision but isn't technically incorrect.
- For the Linode CLI install with `--root_pass`, users should be aware that passing the password inline puts it in shell history; a future improvement could suggest omitting the flag so the CLI prompts interactively.
