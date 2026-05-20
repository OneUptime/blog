# Validation Summary: How to Handle Database Schema Version Tracking in Git

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD resource hooks
- GitOps
- Kubernetes Jobs, CronJobs, ConfigMaps, Secrets, and environment variables
- GitHub Actions service containers
- PostgreSQL 16 and `pg_dump`
- golang-migrate CLI
- Shell scripting with `awk`, `diff`, `sha256sum`, and `curl`

## Sources Consulted
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/cron-job-v1/
- Kubernetes Job API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/job-v1/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes ConfigMap API reference: https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/config-map-v1/
- GitHub Actions PostgreSQL service container documentation: https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers
- golang-migrate README and CLI source: https://github.com/golang-migrate/migrate
- PostgreSQL 16 `pg_dump` documentation: https://www.postgresql.org/docs/16/app-pgdump.html
- Local verification of the `postgres:16` container image tooling with Docker.

## Issues Found
- The GitHub Actions `pg_dump` step did not provide the PostgreSQL password. Added `PGPASSWORD: test` to the step environment so `pg_dump -U test` can authenticate against the service container.
- The schema-change check staged `schema.sql` and `VERSION` before the failure step, which would remove the useful unstaged diff shown by `git diff`. Removed the `git add`, checked both `schema.sql` and `VERSION`, and printed the diff for both files.
- The `VERSION` file and comparison snippets used the raw output of `migrate version`, which can include additional text such as dirty-state information. Updated the examples to store and compare the first field with `awk '{print $1}'`.
- The ConfigMap example stored `schema-hash` with a `sha256:` prefix, while the drift checker compares it to raw `sha256sum` output. Updated the example hash format to the raw checksum value.
- The drift detection CronJob used the official `postgres:16` image while also calling `curl`; local Docker verification showed that image includes `pg_dump`, `sha256sum`, and `diff`, but not `curl`. Updated the example to use a custom tools image that includes both PostgreSQL client utilities and `curl`.

## Review Notes
- The golang-migrate version shown in the install command is older than the latest release observed during review, but the CLI flags and migration file naming pattern used in the post remain valid.
- The drift detection approach depends on generating the expected and live schema with the same `pg_dump` version and options so the hashes are comparable.
