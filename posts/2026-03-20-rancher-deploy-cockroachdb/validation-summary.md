# Validation Summary: How to Deploy CockroachDB on Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- CockroachDB
- PostgreSQL-compatible client connections
- Amazon S3 backups

## Sources Consulted
- CockroachDB: Deploy CockroachDB in a Single Kubernetes Cluster - https://www.cockroachlabs.com/docs/stable/deploy-cockroachdb-with-kubernetes
- CockroachDB Helm chart values - https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb/values.yaml
- CockroachDB Helm chart README - https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb/README.md
- CockroachDB: Certificate Management - https://www.cockroachlabs.com/docs/stable/secure-cockroachdb-kubernetes
- CockroachDB: Client Connection Parameters - https://www.cockroachlabs.com/docs/stable/connection-parameters
- CockroachDB: Multi-Region Capabilities Overview - https://www.cockroachlabs.com/docs/stable/multiregion-overview
- CockroachDB: DB Console Overview - https://www.cockroachlabs.com/docs/stable/ui-overview
- CockroachDB: BACKUP - https://www.cockroachlabs.com/docs/stable/backup
- CockroachDB: CREATE SCHEDULE FOR BACKUP - https://www.cockroachlabs.com/docs/stable/create-schedule-for-backup
- CockroachDB: cockroach node - https://www.cockroachlabs.com/docs/stable/cockroach-node
- CockroachDB: cockroach debug zip - https://www.cockroachlabs.com/docs/stable/cockroach-debug-zip
- Kubernetes: Define Dependent Environment Variables - https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/

## Issues Found
- The Helm install command used `--wait`, but CockroachDB's Helm deployment docs explicitly warn not to use `--wait` for this chart because initialization is handled by a separate init job. I removed `--wait` and `--timeout`.
- The post assumed resource names like `cockroachdb-0` and `cockroachdb-public`, but default Helm naming would produce names prefixed with both the release and chart name. I added `fullnameOverride: cockroachdb` so the example names match the commands.
- The values example used an invalid `conf.audit-log` key and placed `ingress` at the wrong level. I removed the invalid audit setting and moved ingress configuration under `service.ingress`, matching the chart's values schema.
- The Helm example manually ran `cockroach init`, but the Helm chart already initializes multi-node clusters via an init job by default. I changed the step to verify init-job completion and cluster readiness instead.
- The SQL example granted schema privileges on unqualified `public`, which would target the wrong database from the default shell context. I changed it to `GRANT ALL ON SCHEMA myapp.public TO appuser;`.
- The multi-region example was not deployable as written: it showed an incomplete StatefulSet and implied that locality flags alone were sufficient. I replaced it with a valid Helm values override using `statefulset.args`, added the required SQL region configuration, and noted Cockroach Labs' recommendation to use the operator for multi-region scaling on Kubernetes.
- The application deployment example had multiple issues: it omitted the required `selector` and template labels for an `apps/v1` Deployment, referenced a Secret across namespaces, relied on env-var expansion in the wrong order, and used `sslmode=require` without a CA bundle. I fixed the Deployment shape, aligned the namespace, reordered the env vars, mounted the CA cert from the Helm-generated client Secret, and switched the connection string to `sslmode=verify-full` with `sslrootcert`.
- The DB Console step incorrectly used `http://` and described insecure/dev-mode login behavior. I corrected it to `https://localhost:8080` and clarified that login requires a SQL user with a password, with admin-role access needed for administrative pages.
- The scheduled backup example used an invalid placeholder URI (`...?`) and pointed the schedule at the same backup collection as the manual backup. I replaced it with a full placeholder URI and a separate destination path for the schedule.
- The troubleshooting section described `cockroach debug zip` as a range-health check. I relabeled it as a debug bundle collection and added the explicit `--host` parameter.

## Review Notes
- CockroachDB still supports the Helm chart, but official docs state it is not under active development and recommend the operator for new deployments, especially when scaling multi-region Kubernetes clusters.
- The secure DB Console uses TLS. With self-signed certificates, browsers may require a local certificate exception when accessing `https://localhost:8080`.
