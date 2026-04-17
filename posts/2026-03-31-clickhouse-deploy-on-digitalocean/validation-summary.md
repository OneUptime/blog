# Validation Summary: How to Deploy ClickHouse on DigitalOcean

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- ClickHouse (server and client packages, SQL `BACKUP` to S3)
- DigitalOcean Droplets (Basic, Memory-Optimized, CPU-Optimized, Premium AMD)
- DigitalOcean Block Storage Volumes
- DigitalOcean Cloud Firewalls
- DigitalOcean Spaces (S3-compatible object storage)
- `doctl` CLI
- Ubuntu 22.04, systemd, XFS filesystem, `/etc/fstab`

## Sources Consulted
- DigitalOcean API slugs reference: https://slugs.do-api.dev/
- DigitalOcean Droplet plan docs: https://docs.digitalocean.com/products/droplets/concepts/choosing-a-plan/
- DigitalOcean Droplet pricing: https://docs.digitalocean.com/products/droplets/details/pricing/
- `doctl compute droplet create` / `volume create` / `firewall create` reference: https://docs.digitalocean.com/reference/doctl/reference/compute/
- ClickHouse Debian/Ubuntu install docs: https://clickhouse.com/docs/install/debian_ubuntu
- ClickHouse `BACKUP ... TO S3` docs: https://clickhouse.com/docs/operations/backup
- DigitalOcean Spaces S3-compatibility docs: https://docs.digitalocean.com/products/spaces/
- Sibling validated posts in this blog (Hetzner, Linode, Oracle Cloud) for install-pattern consistency

## Issues Found

1. **Invalid CPU-Optimized Droplet slug `c-16-16gib`.** DigitalOcean does not offer a CPU-Optimized Droplet with a 1:1 vCPU:RAM ratio — the slug `c-16-16gib` returns 404 against the slugs API. The standard CPU-Optimized 16 vCPU plan is `c-16`, which ships with 32 GB RAM (2:1 ratio). Changed the slug from `c-16-16gib` to `c-16`.

2. **Broken ClickHouse apt repo URL.** The install block referenced `https://packages.clickhouse.com/deb/archive/apt/stable.sources`, which does not exist. This URL would have failed on any fresh Droplet. Replaced the install block with the official ClickHouse-recommended GPG-dearmor + `/etc/apt/sources.list.d/clickhouse.list` pattern (importing `repomd.xml.key`, writing a keyring to `/usr/share/keyrings/clickhouse-keyring.gpg`, and using the architecture-pinned `deb ... stable main` repo), matching the validated sibling posts in this blog.

## Review Notes
- `m-16vcpu-128gb`, `m3-8vcpu-64gb`, and `s-4vcpu-8gb` were verified as valid DigitalOcean slugs.
- `doctl compute volume create --fs-type xfs` formats the volume at creation time, so the post correctly omits a separate `mkfs.xfs` step before mounting.
- The mount instructions use `/dev/sda` for the attached volume. While DO volumes can appear at `/dev/sda` when they are the only attached volume, the stable path is `/dev/disk/by-id/scsi-0DO_Volume_<volume_name>`; the post already notes this in a comment, so left as-is (the author flagged the variability).
- The `BACKUP DATABASE ... TO S3(...)` syntax and the Spaces path-style endpoint `https://nyc3.digitaloceanspaces.com/<bucket>/...` are both valid.
- Firewall inbound rule syntax for `doctl compute firewall create` (`protocol:tcp,ports:22,address:...`) is correct; multiple rules are space-separated within a single `--inbound-rules` string.
