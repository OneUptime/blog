# Validation Summary: How to Set Up M3DB for Time-Series Storage on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step installation and configuration guide

## Technologies Covered
- M3DB (distributed time-series database)
- M3Coordinator (Prometheus remote write/read bridge)
- M3Query (PromQL frontend)
- etcd (cluster coordination)
- Prometheus (remote_write / remote_read)
- systemd (service management)
- Ubuntu

## Sources Consulted
- M3 GitHub releases page: https://github.com/m3db/m3/releases (latest stable: v1.5.0)
- GitHub release assets for v1.5.0: confirmed tarball is `m3_1.5.0_linux_amd64.tar.gz`, containing `m3dbnode`, `m3coordinator`, `m3query`, `m3aggregator`
- M3DB documentation — binary quickstart: https://m3db.io/docs/quickstart/binaries/
- M3DB documentation — namespace configuration: https://m3db.io/docs/operational_guide/namespace_configuration/
- M3DB documentation — Docker quickstart (for API ports): https://m3db.io/docs/quickstart/docker/
- Ubuntu package listing for etcd (confirmed `etcd` is a transitional package depending on `etcd-server`/`etcd-client`)

## Issues Found

1. **Non-existent M3 version (`1.5.3`).** The post pinned `VERSION="1.5.3"`, but the latest M3 release is `v1.5.0` (April 2022). Updated `VERSION` to `1.5.0` to point at an artifact that actually exists.

2. **Incorrect download artifacts (`m3dbnode-linux-amd64`, `m3coordinator-linux-amd64`).** The M3 project ships a single tarball, `m3_${VERSION}_linux_amd64.tar.gz`, that contains every binary; standalone per-binary downloads do not exist. Rewrote the install section to download the tarball, extract it, and `mv` `m3dbnode` and `m3coordinator` from the extracted directory into `/usr/local/bin/`.

3. **Cluster initialization API on the wrong port (9002).** The `/api/v1/database/create` endpoint is exposed by M3Coordinator on port `7201`, not by the M3DB node on `9002`. Changed the URL in the cluster-init `curl` to `http://localhost:7201/api/v1/database/create` and added a one-line note that M3Coordinator must be running first.

4. **Bogus status endpoint (`/api/v1/database/health` on 9002).** This endpoint does not exist on the M3DB node. Replaced with the documented `GET http://localhost:7201/api/v1/services/m3db/placement` (the canonical way to confirm shards are `AVAILABLE`).

5. **Wrong list-namespaces endpoint (`/api/v1/namespaces` on 9002).** The documented endpoint is `GET /api/v1/services/m3db/namespace` (singular) on the coordinator's port `7201`. Updated.

6. **Wrong create-namespace endpoint (`/api/v1/services/m3db/namespaces` on 9002).** Wrong port and the path is singular (`namespace`) per the official docs. Updated to `POST http://localhost:7201/api/v1/services/m3db/namespace`.

7. **Outdated retention option field names.** The post used the legacy `retentionPeriodNanos` / `blockSizeNanos` / `bufferFutureNanos` / `bufferPastNanos` numeric-nanosecond fields. The current documented API uses `*Duration` fields with duration strings (e.g. `"17520h"`, `"2h"`, `"10m"`). Converted the example to the duration form and added the documented `snapshotEnabled: true` option.

## Review Notes

- The post documents the cluster-initialization `curl` *before* the M3Coordinator service is configured and started. The API call lives on the coordinator (port 7201), so a reader following the post strictly top-to-bottom would hit "connection refused" on the init step until they finish the next section. I added a one-line note pointing this out but did not restructure the sections.
- `sudo apt install etcd` on Ubuntu currently pulls in a transitional package that depends on `etcd-server` and `etcd-client`. This works today but may be removed in future Ubuntu releases; on Ubuntu 24.04+, prefer `sudo apt install etcd-server etcd-client` directly. Left as-is since it still works.
- `etcdctl endpoint status` assumes etcd v3 API (default since etcd 3.4). On older etcd, `ETCDCTL_API=3` must be exported first. Left as-is given the post targets current Ubuntu/etcd.
- M3DB's `m3dbCluster` discovery type and `embedded` zone naming used in the configs are correct for a self-hosted single-node setup with an external etcd, matching the upstream `m3dbnode-local-etcd.yml` reference config.
- The Prometheus `remote_write` URL (`/api/v1/prom/remote/write`) and `remote_read` URL (`/api/v1/prom/remote/read`) on M3Coordinator port 7201 are correct.
- M3 v1.5.0 is over three years old at the time of review; the project has had limited activity. Worth flagging to readers in a future revision that VictoriaMetrics, Mimir, or Thanos are more actively-maintained alternatives for new deployments.
