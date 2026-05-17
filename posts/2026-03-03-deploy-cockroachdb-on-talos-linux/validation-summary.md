# Validation Summary: How to Deploy CockroachDB on Talos Linux

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- CockroachDB (v23.2.3)
- Talos Linux
- Kubernetes (StatefulSets, Services, projected volumes)
- cert-manager (v1.14.0)
- cockroach-operator (v2.13.0)
- SQL (CockroachDB dialect, BACKUP/RESTORE, CREATE SCHEDULE)

## Sources Consulted
- CockroachDB official Kubernetes examples: https://github.com/cockroachdb/cockroach/tree/master/cloud/kubernetes
- `bring-your-own-certs/cockroachdb-statefulset.yaml` (reference for `defaultMode: 256` on cert volumes)
- CockroachDB `cockroach start` docs: https://www.cockroachlabs.com/docs/v23.2/cockroach-start
- CockroachDB `cockroach init` docs: https://www.cockroachlabs.com/docs/v23.2/cockroach-init
- CockroachDB `BACKUP` docs: https://www.cockroachlabs.com/docs/v23.2/backup
- CockroachDB `CREATE SCHEDULE FOR BACKUP` docs: https://www.cockroachlabs.com/docs/v23.2/create-schedule-for-backup
- cockroach-operator GitHub: https://github.com/cockroachdb/cockroach-operator (verified v2.13.0 tag and install URLs)
- cert-manager v1.14.0 release: https://github.com/cert-manager/cert-manager/releases/tag/v1.14.0

## Issues Found

1. **Deprecated `--advertise-host` flag** — The StatefulSet's `cockroach start` command used `--advertise-host`, which is the deprecated form. Replaced with the current `--advertise-addr` flag, which is the documented name in CockroachDB v23.2.

2. **Missing `defaultMode` on cert projected volume** — The projected volume mounting `cockroachdb-node-secret` and `cockroachdb-client-secret` did not set `defaultMode`. CockroachDB enforces strict permissions on key files (max 0700) and will refuse to start with the Kubernetes default of 0644, producing errors such as `key file ... has mode -rw-r--r--`. Added `defaultMode: 256` (decimal for octal 0400) to the projected volume, matching the official CockroachDB Kubernetes example.

## Review Notes
- The CockroachDB image `v23.2.3` and cockroach-operator `v2.13.0` are valid, pinned versions. v2.13.0 is several releases behind the current operator release line but remains a valid, working version — readers may wish to consult the operator repo for newer releases when deploying.
- The TLS CommonName fields (`node` for node certs, `root` for client certs) and DNS SANs (including `localhost`, `*.cockroachdb`, `*.cockroachdb.cockroachdb`, `*.cockroachdb.cockroachdb.svc.cluster.local`) match CockroachDB's required certificate conventions.
- BACKUP / CREATE SCHEDULE syntax (`BACKUP INTO`, `BACKUP INTO LATEST IN`, `WITH SCHEDULE OPTIONS first_run = 'now'`) are all valid in CockroachDB v23.2.
- `--logtostderr`, `--cache=.25`, `--max-sql-memory=.25`, `--http-addr=0.0.0.0`, `--join`, and `--certs-dir` are all current, supported flags.
- The post does not configure pod `securityContext` (e.g., `fsGroup`) which can sometimes simplify cert ownership concerns on certain CSI drivers, but with `defaultMode: 256` this is not required for CockroachDB to start.
