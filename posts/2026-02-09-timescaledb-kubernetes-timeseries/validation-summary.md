# Validation Summary: Deploying and Operating TimescaleDB for Time-Series Workloads on Kubernetes

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- TimescaleDB
- PostgreSQL
- Kubernetes
- Helm
- Patroni
- pgBackRest
- PgBouncer
- Prometheus postgres_exporter
- AWS EBS CSI StorageClass

## Sources Consulted
- Timescale/TigerData Kubernetes installation documentation: https://www.tigerdata.com/docs/self-hosted/latest/install/installation-kubernetes
- Timescale Helm charts repository: https://github.com/timescale/helm-charts
- TimescaleDB Helm chart admin guide: https://vivacitylabs.github.io/timescaledb-kubernetes/charts/timescaledb-single/admin-guide.html
- TimescaleDB `create_hypertable` API reference: https://docs.timescale.com/api/latest/hypertable/create_hypertable/
- TimescaleDB compression API reference: https://docs.timescale.com/api/latest/compression/add_compression_policy/
- TimescaleDB `hypertable_compression_stats()` reference: https://docs.timescale.com/api/latest/compression/hypertable_compression_stats/
- TimescaleDB `chunk_compression_stats()` reference: https://docs.timescale.com/api/latest/compression/chunk_compression_stats/
- TimescaleDB `timescaledb_information.chunks` reference: https://docs.timescale.com/api/latest/informational-views/chunks/
- Prometheus postgres_exporter documentation: https://github.com/prometheus-community/postgres_exporter
- Bitnami PgBouncer container references and examples: https://bitnami.com/stack/pgbouncer/containers and https://github.com/bitnami/containers/issues/64100
- PgBouncer configuration reference: https://www.pgbouncer.org/config.html
- Kubernetes Deployment API reference: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes StorageClass reference: https://kubernetes.io/docs/concepts/storage/storage-classes/
- AWS EBS CSI driver documentation: https://github.com/kubernetes-sigs/aws-ebs-csi-driver

## Issues Found
- The post called the TimescaleDB Helm chart the recommended approach. Current Timescale/TigerData Kubernetes docs emphasize container-based development/testing guidance and production PostgreSQL operational tooling, while the Timescale Helm chart repository is marked no longer maintained. Updated the wording to call it a common approach and added a compatibility warning.
- The Helm values example used a non-matching credentials schema. The chart uses `secrets.credentials` with Patroni environment variable names, and S3 pgBackRest credentials belong under `secrets.pgbackrest`. Updated the values snippet accordingly.
- The image tag `pg16-ts2.14-latest` did not match the TimescaleDB HA image tag format. Replaced it with an explicit `pg16.2-ts2.14.2-all` tag.
- The values snippet included `podDisruptionBudget`, which is not a supported value in the referenced TimescaleDB single chart. Removed the unsupported block.
- The HA section stated that three replicas provide two synchronous standbys by default. The chart/Patroni setup provides a primary and replicas; synchronous replication must be configured explicitly. Corrected the claim.
- The compression statistics query joined `timescaledb_information.compression_settings` as if it exposed compression byte totals. Replaced it with a lateral call to `hypertable_compression_stats()`.
- The chunk information query selected compression byte columns directly from `timescaledb_information.chunks`, but that view does not expose those columns. Replaced it with a lateral join to `chunk_compression_stats()`.
- The postgres_exporter Deployment had a selector but no matching pod template labels, which makes an `apps/v1` Deployment invalid. Added `template.metadata.labels`.
- The postgres_exporter example used `DATA_SOURCE_URI` and `DATA_SOURCE_USER` without a password. Added `DATA_SOURCE_PASS` from a Kubernetes Secret reference.
- The PgBouncer example configured a backend host and pool settings but omitted the backend username, password, authentication type, and a common startup-parameter ignore setting needed by PostgreSQL clients. Added those environment variables.
- The pgBackRest restore example implied running a restore directly against a live PostgreSQL pod. Clarified that point-in-time restore is an offline operation after stopping PostgreSQL and preparing the target data directory.

## Review Notes
- The Timescale compression APIs shown are appropriate for the post's TimescaleDB 2.14-era image, but current TimescaleDB documentation marks older compression APIs as superseded by columnstore/hypercore APIs in newer releases.
- `helm` and `kubectl` were not installed locally, so command syntax was checked against official documentation rather than local CLI help.
