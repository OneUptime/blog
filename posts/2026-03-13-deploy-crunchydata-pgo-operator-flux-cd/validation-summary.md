# Validation Summary: How to Deploy CrunchyData PGO Operator with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm and OCI Helm charts
- CrunchyData PGO / Crunchy Postgres for Kubernetes
- PostgreSQL
- pgBackRest
- PgBouncer
- Prometheus exporter monitoring

## Sources Consulted
- CrunchyData PGO Helm installation documentation: https://access.crunchydata.com/documentation/postgres-operator/latest/installation/helm
- CrunchyData PGO 5.6.x PostgresCluster CRD reference: https://access.crunchydata.com/documentation/postgres-operator/latest/references/crd/5.6.x/postgrescluster
- CrunchyData backup configuration documentation: https://access.crunchydata.com/documentation/postgres-operator/latest/tutorials/backups-disaster-recovery/backups
- CrunchyData backup management documentation: https://access.crunchydata.com/documentation/postgres-operator/latest/tutorials/backups-disaster-recovery/backup-management
- CrunchyData user management documentation: https://access.crunchydata.com/documentation/postgres-operator/latest/architecture/user-management
- CrunchyData components compatibility table: https://access.crunchydata.com/documentation/postgres-operator/latest/references/components
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Percona Operator for PostgreSQL architecture documentation: https://docs.percona.com/percona-operator-for-postgresql/architecture.html
- Red Hat OpenShift Data Foundation documentation: https://docs.redhat.com/en/documentation/red_hat_openshift_data_foundation/

## Issues Found
- The `databases` namespace used by the `PostgresCluster` and Secret was not created. Added it to the namespace manifest.
- The pgBackRest S3 Secret was defined but not referenced by `spec.backups.pgbackrest.configuration`, so PGO would not mount the S3 credentials. Added the Secret reference.
- The manual backup command used the pgBackRest backup annotation, but the cluster did not define `spec.backups.pgbackrest.manual`. Added a `repo1` full-backup manual configuration and added `--overwrite` to make repeated runs work.
- Several explicit component image tags did not match the PGO 5.6.1 compatibility table and chart defaults. Updated PostgreSQL, pgBackRest, PgBouncer, and exporter images to the matching PGO 5.6.1 tags.
- The Flux Kustomization applied the operator and `PostgresCluster` resources from one path, which can race CRD installation. Split it into operator and cluster Kustomizations with `dependsOn` so the cluster manifests reconcile after the operator Kustomization.
- The statement that Red Hat OpenShift Data Foundation uses PGO as its PostgreSQL engine was not supported by Red Hat documentation. Replaced it with the verified Percona Operator relationship.

## Review Notes
- Flux's OCI `HelmRepository` API is valid, but the Flux documentation now notes that OCI HelmRepository support is in maintenance mode and recommends `OCIRepository` for improved OCI Helm support in newer setups.
- The post pins PGO 5.6.1, which remains technically valid for the examples reviewed, but newer PGO 5.8.x and 6.x releases exist with newer image sets and compatibility requirements.
