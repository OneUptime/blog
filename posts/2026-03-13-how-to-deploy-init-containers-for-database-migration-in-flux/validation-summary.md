# Validation Summary: How to Deploy Init Containers for Database Migration in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments, Pods, init containers, ConfigMaps, Secrets, probes, and kubectl
- Flux CD Kustomization reconciliation and dependency ordering
- Flyway database migrations
- Liquibase database migrations
- PostgreSQL SQL migrations
- Kustomize-style GitOps deployment workflows

## Sources Consulted
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes volumes documentation for ConfigMap volume behavior: https://kubernetes.io/docs/concepts/storage/volumes/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux `reconcile kustomization` CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Redgate Flyway URL setting documentation: https://documentation.red-gate.com/flyway/reference/configuration/environments-namespace/environment-url-setting
- Redgate Flyway baselineOnMigrate documentation: https://documentation.red-gate.com/fd/flyway-baseline-on-migrate-setting-277578974.html
- Redgate Flyway Docker image documentation: https://hub.docker.com/r/flyway/flyway/
- Liquibase Docker image documentation: https://support.liquibase.com/hc/en-us/articles/29383061110171-How-to-use-the-Liquibase-Docker-image
- Liquibase update command concept documentation: https://www.liquibase.org/get-started/core-usage/liquibase-core-concepts-author-database-changes
- PostgreSQL UUID function documentation: https://www.postgresql.org/docs/current/functions-uuid.html

## Issues Found
- The Deployment example used the old `fluxcd.io/automated` annotation and claimed Flux updates it on each reconciliation. Flux v2 image automation uses ImageUpdateAutomation and setter markers, not that annotation, so the annotation was removed.
- The post said a ConfigMap-only migration change would cause a rolling restart. Kubernetes only creates a new Deployment revision when `.spec.template` changes, so a `migrations.revision` pod-template annotation was added and the migration update instructions were corrected.
- The Flux Kustomization example combined `wait: true` with explicit `healthChecks`. Flux documents that `.spec.healthChecks` is ignored when `.spec.wait` is true, so the redundant `healthChecks` block was removed.
- The Flyway baseline guidance said to always use `FLYWAY_BASELINE_ON_MIGRATE=true` for pre-existing data. Flyway warns that this removes a safety check, so the wording was changed to use it only when intentionally onboarding a non-empty database without a Flyway schema history table.
- The SQL examples used `gen_random_uuid()` without ensuring compatibility for older PostgreSQL installs and had non-idempotent `CREATE INDEX` statements. The prerequisites were clarified, and `CREATE EXTENSION IF NOT EXISTS pgcrypto;` plus `CREATE INDEX IF NOT EXISTS` were added.
- The monitoring command comment said Flux reconcile would re-run migrations. A reconcile only applies the desired state; new Pods, and therefore init containers, require a pod-template change or other Pod recreation. The comment was corrected.

## Review Notes
- The YAML snippets parse successfully.
- `kubectl` and `flux` were not installed in the local environment, so CLI details were checked against official documentation instead of local `--help` output.
- ConfigMaps have size and operational limits; for large migration sets, storing migrations in an image or using Kustomize `configMapGenerator` with hash suffixing may scale better than embedding all SQL in one ConfigMap.
