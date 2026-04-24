# Validation Summary: How to Deploy Portainer on Vultr Cloud - Part 3

## Status
validated

## Post Type
Guide

## Technologies Covered
- Vultr Cloud Compute
- Vultr Firewall Groups
- Vultr Block Storage
- Vultr Automatic Backups
- Vultr Block Storage Snapshots
- Vultr CLI
- Docker Engine
- Portainer Community Edition
- Linux shell scripting
- cron

## Sources Consulted
- Vultr Cloud Compute provisioning: https://docs.vultr.com/products/compute/cloud-compute/provisioning
- Vultr CLI `instance create`: https://docs.vultr.com/reference/vultr-cli/instance/create
- Vultr CLI `os list`: https://docs.vultr.com/reference/vultr-cli/os/list
- Vultr Automatic Backups for Cloud Compute: https://docs.vultr.com/products/compute/cloud-compute/features/auto-backups
- Vultr Automatic Backups management: https://docs.vultr.com/products/orchestration/backups/provisioning
- Vultr FAQ on attached Block Storage and automatic backups: https://docs.vultr.com/support/products/orchestration/do-automatic-backups-include-attached-vultr-block-storage-volumes
- Vultr Block Storage snapshots: https://docs.vultr.com/products/cloud-storage/block-storage/block-storage-snapshot/create
- Docker Engine install on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker daemon configuration: https://docs.docker.com/engine/daemon/
- Docker JSON file logging driver: https://docs.docker.com/engine/logging/drivers/json-file/
- Portainer CE install with Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Vultr company overview for region count: https://www.vultr.com/company/about-us/

## Issues Found
- The Vultr CLI example was outdated and partially invalid. It used a non-current Ubuntu 24.04 OS ID, an incorrect `--ssh-key` flag instead of `--ssh-keys`, and an inline shell comment after a line-continuation backslash that would break the command. I corrected the plan code, OS ID, hostname flag, SSH key flag, and shell syntax.
- The plan reference `VC2-2C-2GB` / `vc2-2c-2gb` did not match Vultr's current regular Cloud Compute plan naming. I updated it to a current 2 GB RAM plan code.
- The Portainer deployment exposed port `9000` by default and used the floating `latest` image tag. Current Portainer documentation uses HTTPS on `9443` by default and treats `9000` as legacy HTTP access. I removed the default `9000` exposure and updated the image tag to the current documented tag.
- The Docker installation step used `curl` without ensuring it was installed. I added `apt install -y curl` and changed Docker service activation to `systemctl enable --now docker`.
- The backup section incorrectly described automatic snapshots and suggested snapshot retention settings. Vultr documents automatic backups for Cloud Compute instances, while snapshots are separate manual resources. I corrected the section to use automatic backups terminology and removed the incorrect snapshot retention guidance.
- Because the guide stores Docker data on attached Block Storage, the original backup guidance was incomplete. Vultr documents that automatic instance backups do not include attached Block Storage volumes. I added a note that Block Storage snapshots must be created separately for Portainer data stored on the attached volume.

## Review Notes
- The Docker convenience script at `get.docker.com` is still functional and documented by Docker, but Docker's official guidance prefers repository-based installation for production environments.
- The cron backup example writes archives to the same Block Storage volume that holds the live Docker data. That is useful for file-level recovery, but it does not protect against loss of the Block Storage volume itself. An off-host or separate-disk backup target would improve resilience in a future revision.
