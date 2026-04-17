# Validation Summary: How to Deploy ClickHouse on Hetzner Cloud

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- ClickHouse (server + client + clickhouse-backup)
- Hetzner Cloud (CX/CPX/CCX instance types, Volumes, Firewalls, private networks)
- Hetzner dedicated root servers (AX162-R)
- Hetzner Storage Box / Hetzner Object Storage
- `hcloud` CLI
- Ubuntu 22.04, APT packaging, XFS, systemd
- rsync

## Sources Consulted
- [Install ClickHouse on Debian/Ubuntu (official docs)](https://clickhouse.com/docs/install/debian_ubuntu)
- [Hetzner AX162-R product page](https://www.hetzner.com/dedicated-rootserver/ax162-r/)
- [Hetzner AX162 press release (AMD EPYC 9454P)](https://www.hetzner.com/news/new-ax162/)
- [Hetzner Object Storage product page](https://www.hetzner.com/storage/object-storage/)
- [Hetzner Object Storage docs](https://docs.hetzner.com/storage/object-storage/)
- Hetzner Cloud instance specs via Spare Cores (ccx63, cx52, cpx51)
- `hcloud` CLI reference (server/volume/firewall subcommands)

## Issues Found
1. **AX162-R core count was wrong.** Post said "32 cores, 256 GB RAM". The AX162-R uses an AMD EPYC 9454P with **48 cores / 96 threads**, 256 GB DDR5 ECC RAM base. Updated the bullet to reflect the actual CPU and core count.
2. **ClickHouse APT install used a non-existent URL.** The post used `https://packages.clickhouse.com/deb/archive/apt/stable.sources`, which is not the URL published in the official ClickHouse installation docs. Replaced with the current documented method: dearmoring the key from `https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key` into `/usr/share/keyrings/clickhouse-keyring.gpg` and writing a `[signed-by=…]` entry to `/etc/apt/sources.list.d/clickhouse.list` pointing at `https://packages.clickhouse.com/deb stable main`.
3. **Incorrect claim that Hetzner has no native object storage.** Hetzner Object Storage (S3-compatible) is generally available as of 2025. Updated the Backup Strategy intro and the Summary to refer to Hetzner Object Storage instead of claiming none exists.

## Review Notes
- Instance specs for CX52 (16 vCPU / 32 GB), CPX51 (16 vCPU / 32 GB), and CCX63 (48 vCPU / 192 GB) verified as current Hetzner Cloud types.
- The `ccx33` example type in `hcloud server create` is valid (8 vCPU / 32 GB dedicated).
- The `/dev/disk/by-id/scsi-0HC_Volume_*` glob pattern for Hetzner volumes is the documented device path, but the glob will break if multiple volumes are ever attached; using the explicit volume ID is safer in production. Left as-is since the post uses a single-volume example.
- `hcloud` subcommands and flags (`server create`, `volume create/attach`, `firewall create/add-rule/apply-to-server`) are all valid as of current `hcloud` CLI.
- The ClickHouse XML config snippet is syntactically valid; drop-in files normally live under `/etc/clickhouse-server/config.d/` — worth noting for readers but not a factual error.
- The post could optionally mention that Hetzner Volumes are network-attached (not local NVMe), which matters for ClickHouse IO latency, but this is an editorial note, not a correctness issue.
