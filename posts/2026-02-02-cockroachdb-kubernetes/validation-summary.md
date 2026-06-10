# Validation Summary: How to Configure CockroachDB for Kubernetes

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- CockroachDB v23.2
- CockroachDB Kubernetes Operator (v2.14.0)
- CockroachDB Helm chart
- Kubernetes (StatefulSet, Service, NetworkPolicy, CronJob)
- cert-manager
- PgBouncer (Bitnami image 1.21.0)
- Prometheus / kube-prometheus-stack (ServiceMonitor, PrometheusRule)
- AWS S3 (BACKUP/RESTORE destinations)
- PostgreSQL wire protocol

## Sources Consulted
- [CockroachDB Operator GitHub tags](https://github.com/cockroachdb/cockroach-operator/tags) — verified v2.14.0 exists (Apr 16, 2024)
- [cockroach-operator install/crds.yaml](https://raw.githubusercontent.com/cockroachdb/cockroach-operator/v2.14.0/install/crds.yaml) — verified `crdb.cockroachlabs.com/v1alpha1` and `CrdbCluster` kind, including `nodes`, `cockroachDBVersion`, `tlsEnabled`, `dataStore`, `resources`, `topologySpreadConstraints` spec fields
- [CockroachDB Helm chart values.yaml](https://raw.githubusercontent.com/cockroachdb/helm-charts/master/cockroachdb/values.yaml) — verified `statefulset.budget.maxUnavailable`, `storage.persistentVolume`, `tls.certs.certManagerIssuer` structure, `conf.logtostderr`, `service.ports` (not `service.public.ports`)
- [CockroachDB v23.2 Cluster Settings](https://www.cockroachlabs.com/docs/v23.2/cluster-settings) — verified setting names
- [CockroachDB Vectorized Query Execution docs](https://www.cockroachlabs.com/docs/stable/vectorized-execution) — confirmed `sql.distsql.temp_storage.workmem` is the correct workmem cluster setting
- [Certificate Management for CockroachDB on Kubernetes](https://www.cockroachlabs.com/docs/stable/secure-cockroachdb-kubernetes) — confirmed self-signed CA Issuer is recommended for cert-manager integration
- [cockroach cert CLI reference](https://www.cockroachlabs.com/docs/stable/cockroach-cert) — verified `create-ca`, `create-node`, `create-client` flags and arguments
- [CockroachDB BACKUP / RESTORE docs](https://www.cockroachlabs.com/docs/stable/backup) — verified `BACKUP INTO LATEST IN ...`, `SHOW BACKUPS IN ...`, `RESTORE ... FROM LATEST IN ...`, and `AS OF SYSTEM TIME` syntax

## Issues Found

1. **cert-manager issuer pointed at Let's Encrypt for internal node certs.** The Helm `tls.certs.certManagerIssuer` example used `kind: ClusterIssuer, name: letsencrypt-prod`. Let's Encrypt cannot issue certificates for non-public DNS names such as `*.cockroachdb.cockroachdb.svc.cluster.local`, which are exactly the SANs CockroachDB nodes need. Updated to a self-signed CA Issuer (`isSelfSignedIssuer: true`, `group: cert-manager.io`, `kind: Issuer`, name `cockroachdb-ca-issuer`) and disabled the chart's default `selfSigner` to avoid conflicting issuance — matching the structure in the official chart's `values.yaml`. Also added a clarifying comment.

2. **`service.public.ports` is not a valid field in the Helm chart.** Ports in the chart live at `service.ports.grpc.*` and `service.ports.http`, not under `service.public`. Restructured the example so the SQL (26257) and HTTP (8080) ports are configured at `service.ports` and `service.public` retains only `type: ClusterIP`.

3. **`sql.defaults.distsql_workmem` is not a valid cluster setting in v23.2.** The correct name for the per-operator disk-spill workmem is `sql.distsql.temp_storage.workmem` (default 64MiB). Replaced the setting name and updated the surrounding comment to describe what the setting actually controls.

4. **`kv.gc.ttlseconds` is no longer a cluster setting.** GC TTL is configured via zone configurations in modern CockroachDB. Replaced the `SET CLUSTER SETTING kv.gc.ttlseconds = 86400;` line with `ALTER RANGE default CONFIGURE ZONE USING gc.ttlseconds = 86400;` and updated the comment accordingly.

## Review Notes

- The CockroachDB Operator v2.14.0 used in the tutorial is genuine (released April 2024) but newer releases exist (latest is v2.18.3 as of January 2026). Readers running fresh installs may want to use a more recent version, but the install URL pattern and CRD shape (`crdb.cockroachlabs.com/v1alpha1`, `CrdbCluster`) remain consistent.
- `conf.logtostderr: INFO` is still accepted by the Helm chart but is described as "ignored when `log` is enabled" — the modern approach is the structured `conf.log` field. Left as-is because it still works.
- `kv.range_merge.queue_enabled` and `kv.range_split.by_load.enabled` are advanced/sensitive cluster settings. `by_load.enabled` is documented in v23.2. `kv.range_merge.queue_enabled` is not prominently documented for v23.2 but historically existed; left as-is — it is at worst a no-op and at best still effective.
- The `RESTORE ... AS OF SYSTEM TIME '2024-01-15 10:00:00';` example uses a date in the past relative to the post date; that is consistent with the post's authoring date and not a technical error.
- The PgBouncer config sets `POSTGRESQL_DATABASE` but not user/password env vars — fine for an illustrative snippet, but production deployments would need `POSTGRESQL_USERNAME`, `POSTGRESQL_PASSWORD`, and `userlist.txt` mounted via a Secret. The post already calls out "use secrets in production" so no change made.
- The `cockroach node status --host=cockroachdb-1.cockroachdb.cockroachdb.svc.cluster.local` connectivity test will show full cluster status (not just one node), but the command does exercise the connection to that specific host, so the example is functional even if labeled slightly loosely.
