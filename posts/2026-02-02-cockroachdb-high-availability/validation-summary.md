# Validation Summary: How to Configure CockroachDB for High Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CockroachDB (v24.1.0)
- CockroachDB Kubernetes Operator (v2.14.0)
- Kubernetes (StatefulSet, Service, topologySpreadConstraints, podAntiAffinity)
- HAProxy
- Prometheus / PrometheusRule (Prometheus Operator)
- Python (psycopg2, tenacity)
- Node.js (node-postgres / pg)
- Chaos Mesh (PodChaos, NetworkChaos)
- Mermaid diagrams
- Raft consensus / leaseholders / replication zones / multi-region SQL

## Sources Consulted
- CockroachDB CLI docs: https://www.cockroachlabs.com/docs/stable/cockroach-start.html, cockroach-init, cockroach-cert, cockroach-node
- CockroachDB SQL reference: https://www.cockroachlabs.com/docs/stable/configure-zone.html, show-zone-configurations, alter-database, create-database, alter-table, multiregion-overview
- CockroachDB multi-region overview: https://www.cockroachlabs.com/docs/stable/multiregion-overview.html
- CockroachDB monitoring metrics: https://www.cockroachlabs.com/docs/stable/monitoring-and-alerting.html (path `/_status/vars`)
- CockroachDB Kubernetes Operator source and CRDs (v2.14.0): https://github.com/cockroachdb/cockroach-operator (`config/crd/bases/crdb.cockroachlabs.com_crdbclusters.yaml`)
- CockroachDB HAProxy load balancing docs: https://www.cockroachlabs.com/docs/stable/cockroach-gen.html (haproxy health check `/health?ready=1`)
- psycopg2 docs: https://www.psycopg.org/docs/pool.html
- node-postgres docs: https://node-postgres.com/apis/pool
- Chaos Mesh PodChaos / NetworkChaos: https://chaos-mesh.org/docs/

## Issues Found

1. **Incorrect SQL preposition for `SHOW ZONE CONFIGURATION` on RANGE.** The post used `SHOW ZONE CONFIGURATION FOR RANGE default;`, but CockroachDB's grammar requires `FROM` when targeting a RANGE. Fixed to `SHOW ZONE CONFIGURATION FROM RANGE default;`.

2. **Invalid `topology` field in `CrdbCluster` spec.** The post defined a top-level `topology: [{ key, values }]` field under the CrdbCluster spec. This field does not exist in the CockroachDB Operator CRD (verified against v2.14.0 `crdb.cockroachlabs.com_crdbclusters.yaml`). Replaced it with the valid `topologySpreadConstraints` field, matching the intent of spreading replicas across zones.

3. **Missing `fs` import in the Node.js example.** The code used `fs.readFileSync('/certs/ca.crt')` but only required `pg`. Added `const fs = require('fs');` so the snippet is runnable as written.

## Review Notes

- `cockroach start --background` is supported but the CockroachDB docs recommend not using it for long-running production servers — they suggest using a process manager (systemd) instead. The post's usage is fine for an introductory example but readers running production deployments should consult the recommended start flow.
- The post uses CockroachDB Operator v2.14.0 (April 2024). At the time of review the latest is v2.18.x; the v2.14.0 install URLs and CRD shape used here are still valid, but readers may want to track the current release.
- `additionalArgs` is confirmed valid in the CrdbCluster v2.14.0 CRD. The injection of `$(POD_ZONE)` in `--locality=region=us-east,zone=$(POD_ZONE)` assumes a downward API env var named `POD_ZONE` is configured separately; readers should ensure that env var is exposed to the pod or substitute it with the actual zone.
- All cited Prometheus metric names (`ranges_underreplicated`, `ranges_unavailable`, `liveness_livenodes`, `replicas_quiescent`, `replicas_leaders`, `replicas_leaseholders`) and the `/_status/vars` scrape path match CockroachDB's documented metrics.
- The HAProxy `/health?ready=1` readiness check is the documented CockroachDB endpoint and is correct.
- Multi-region SQL (`PRIMARY REGION ... REGIONS ...`, `SURVIVE REGION FAILURE`, `LOCALITY REGIONAL BY ROW / REGIONAL BY TABLE / GLOBAL`, `crdb_internal_region`) all match the current CockroachDB grammar.
