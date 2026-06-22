# Validation Summary: How to Deploy PostgreSQL on Kubernetes with Zalando Postgres Operator

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- PostgreSQL
- Kubernetes
- Zalando Postgres Operator
- Patroni
- Helm
- kubectl
- PgBouncer connection pooling
- WAL-G / WAL-E backups
- Prometheus Operator ServiceMonitor and PodMonitor

## Sources Consulted
- Zalando Postgres Operator quickstart: https://opensource.zalando.com/postgres-operator/docs/quickstart.html
- Zalando Postgres Operator cluster manifest reference: https://opensource.zalando.com/postgres-operator/docs/reference/cluster_manifest.html
- Zalando Postgres Operator user guide: https://opensource.zalando.com/postgres-operator/docs/user.html
- Zalando Postgres Operator administrator guide: https://opensource.zalando.com/postgres-operator/docs/administrator.html
- Zalando Postgres Operator operator parameters reference: https://opensource.zalando.com/postgres-operator/docs/reference/operator_parameters.html
- Zalando Postgres Operator GitHub README and example manifests: https://github.com/zalando/postgres-operator

## Issues Found
- The Kubernetes prerequisite said 1.21+, which only matches older operator releases. Updated it to say current releases require Kubernetes 1.27+ and that users should check their operator release support matrix.
- The Helm UI installation used the operator chart repository for the UI chart. Updated it to add and use the separate official `postgres-operator-ui` chart repository.
- The manual manifest installation created a `postgres-operator` namespace even though the upstream example manifests target `default` unless edited, and it omitted `manifests/api-service.yaml`. Updated the commands and verification examples to match the official manual install flow.
- The Helm log selector used `name=postgres-operator`, but the Helm chart uses the `app.kubernetes.io/name=postgres-operator` label. Updated the Helm verification command and kept a separate manifest-install selector.
- The example application Deployment was incomplete for `apps/v1` because it had no selector or pod template labels. Added matching labels and selector.
- The password rotation section advised directly patching the generated Secret. Replaced it with the documented `usersWithSecretRotation` and `usersWithInPlaceSecretRotation` manifest fields.
- Several operator image examples used older `registry.opensource.zalan.do` image locations and old tags. Updated the examples to current official `ghcr.io/zalando/...` image references used in upstream manifests.
- The WAL archiving example created a Kubernetes Secret but did not reference it through operator configuration, placed it in the operator namespace, and set unsupported per-cluster env vars. Updated it to use `pod_environment_secret`, create the Secret in the PostgreSQL cluster namespace, and keep only the cluster-level `WAL_S3_BUCKET` override.
- The ServiceMonitor example selected the operator-created PostgreSQL service, which does not expose the exporter sidecar metrics port. Added a small metrics Service and changed the ServiceMonitor selector to target it.

## Review Notes
- PostgreSQL version `16` remains valid for the examples, although the latest upstream examples now show PostgreSQL 18-capable images and a newer support matrix.
- The post remains a high-level production guide; real deployments still need environment-specific validation for storage classes, backup credentials, namespaces, RBAC, and monitoring labels.
