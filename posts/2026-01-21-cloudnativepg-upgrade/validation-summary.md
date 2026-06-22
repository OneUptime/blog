# Validation Summary: How to Upgrade PostgreSQL with CloudNativePG

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- CloudNativePG
- Kubernetes
- PostgreSQL
- PostgreSQL logical replication
- PostgreSQL pg_upgrade
- Helm
- kubectl
- Prometheus metrics

## Sources Consulted
- CloudNativePG PostgreSQL upgrades documentation: https://cloudnative-pg.io/docs/1.29/postgres_upgrades/
- CloudNativePG rolling updates documentation: https://cloudnative-pg.io/docs/1.28/rolling_update/
- CloudNativePG API reference: https://cloudnative-pg.io/docs/1.29/cloudnative-pg.v1/
- CloudNativePG database import documentation: https://cloudnative-pg.io/docs/1.27/database_import/
- CloudNativePG installation and upgrades documentation: https://cloudnative-pg.io/docs/1.29/installation_upgrade/
- CloudNativePG monitoring documentation: https://cloudnative-pg.io/docs/1.29/monitoring/
- CloudNativePG labels and annotations documentation: https://cloudnative-pg.io/docs/1.29/labels_annotations/
- CloudNativePG GitHub releases: https://github.com/cloudnative-pg/cloudnative-pg/releases
- PostgreSQL pg_upgrade documentation: https://www.postgresql.org/docs/current/pgupgrade.html
- PostgreSQL logical replication documentation: https://www.postgresql.org/docs/current/logical-replication.html
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- Minor upgrades were described as zero-downtime. CloudNativePG rolling updates can require application reconnection during primary update, so the wording now says "brief reconnection" and the zero-downtime section was renamed to minimal-downtime.
- The update strategy snippet used `minReadySeconds`, which is not a CloudNativePG `Cluster` spec field. Removed it from the snippet.
- `switchoverDelay` was documented as microseconds with values like `40000000`. CloudNativePG uses seconds, so the examples now use `40` and `10`.
- Supervised rolling update completion was shown with a non-documented annotation. Updated it to use `kubectl cnpg promote`, matching CloudNativePG documentation.
- The pg_upgrade in-place example incorrectly used `bootstrap.initdb.import`, which is logical dump/restore into a new cluster. Replaced it with a declarative major image update on the existing cluster.
- The operator manifest URL pointed to CloudNativePG `v1.22.0`, which is outdated. Updated it to `v1.29.1`, the latest release found during review.
- The monitoring examples included undocumented or incorrect metric names. Replaced them with documented CloudNativePG collector/custom metric names.
- Manual switchover troubleshooting used the non-documented `cnpg.io/targetPrimary` annotation. Updated it to `kubectl cnpg promote`.
- The conclusion omitted the current offline in-place major upgrade path. Added it alongside import and logical replication.

## Review Notes
The post remains a high-level guide and does not cover every current caveat, such as operating system image compatibility for in-place major upgrades, PostgreSQL 17.0-17.5 `max_slot_wal_keep_size` upgrade caveat, extension compatibility, and post-upgrade `ANALYZE`. These are technically important future improvements, but the corrected post no longer contains the reviewed inaccuracies.
