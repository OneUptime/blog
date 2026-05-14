# Validation Summary: How to Implement Database Migrations with Flux CD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD Kustomization and Notification Controller APIs
- Kubernetes Jobs, Deployments, init containers, probes, Secrets, ConfigMaps, and environment variable expansion
- golang-migrate
- Flyway
- Liquibase
- PostgreSQL DDL migrations
- GitOps deployment ordering and rollback workflows

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes TTL-after-finished Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes environment variables documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/
- golang-migrate README and CLI source: https://github.com/golang-migrate/migrate
- Flyway Docker image documentation: https://hub.docker.com/r/flyway/flyway
- Liquibase Docker usage documentation: https://support.liquibase.com/hc/en-us/articles/29383061110171-How-to-use-the-Liquibase-Docker-image
- Liquibase command parameter documentation: https://docs.liquibase.com/reference-guide/parameters/working-with-command-parameters
- PostgreSQL 9.6 ALTER TABLE documentation: https://www.postgresql.org/docs/9.6/sql-altertable.html
- PostgreSQL CREATE INDEX documentation: https://www.postgresql.org/docs/15/sql-createindex.html

## Issues Found
- The Deployment readiness probe comment incorrectly described the probe as an init container. Updated the comment so it accurately describes the readiness probe.
- The golang-migrate init-container version check could incorrectly pass when `migrate version` returned a dirty state such as `15 (dirty)`. Updated the snippet to fail on dirty output and fail if the version cannot be parsed as a number before comparing it with the expected version.
- The Flux notification examples used `notification.toolkit.fluxcd.io/v1`, but current Flux notification `Alert` and `Provider` resources are documented as `notification.toolkit.fluxcd.io/v1beta3`. Updated both resources to `v1beta3`.
- The Flux Alert example used deprecated `spec.summary`. Updated it to `spec.eventMetadata.summary`, which is the current documented replacement.
- The Flyway Job defined `FLYWAY_URL` before the `DB_HOST`, `DB_PORT`, and `DB_NAME` variables it referenced. Kubernetes only expands dependent environment variables from earlier entries in the same list, so the URL would not expand correctly. Reordered the environment variables.
- The Liquibase Job placed command parameters before the `update` command and referenced a relative changelog path. Updated the args to use `update` first and an absolute changelog path under the mounted `/liquibase/changelog` directory.

## Review Notes
- The Flux Kustomizations use `wait: true` together with `healthChecks`. This is accepted by the API, but Flux documents that `healthChecks` are ignored when `wait: true` is enabled because all reconciled resources are checked.
- `spec.force: true` is valid for Flux Kustomizations, but Flux recommends using force carefully because recreating resources can cause downtime. The post's use case, rerunning Jobs with immutable field changes, is a documented use case.
- The pinned Flyway and Liquibase image versions are examples rather than current-version recommendations; teams should choose versions that match their tested migration toolchain.
