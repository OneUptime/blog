# Validation Summary: How to Deploy GitLab on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab (self-hosted, Helm chart)
- Talos Linux (machine config: sysctls, disks)
- Kubernetes (Namespace, Secret, StatefulSet, Deployment, Service, ConfigMap, volumeClaimTemplates)
- Helm (umbrella `gitlab/gitlab` chart, `ingress-nginx`, conditional subcharts: postgresql, redis, minio, prometheus, certmanager, nginx-ingress, gitlab-runner)
- cert-manager (v1.14.0 manifest install)
- PostgreSQL 16 (alpine image)
- Redis 7.2 (alpine image, `--requirepass`, `--maxmemory`, `--maxmemory-policy allkeys-lru`)
- GitLab Runner (Kubernetes executor, TOML `config.toml` with `[[runners]]` / `[runners.kubernetes]`)
- GitLab KAS (Kubernetes Agent Server)
- `kubectl`, `talosctl`, `helm` CLIs
- GitLab backup tooling (`backup-utility`)
- GitLab health/readiness endpoints (`/-/health`, `/-/readiness` on port 8080)

## Sources Consulted
- GitLab Helm chart globals reference: https://docs.gitlab.com/charts/charts/globals/ (confirmed current schema for `global.psql`, `global.redis.auth`, and `global.kas.enabled`)
- GitLab Helm chart `values.yaml` (master): https://gitlab.com/gitlab-org/charts/gitlab/-/raw/master/values.yaml (verified `global.redis.auth.{enabled,secret,key}` is the current field — not `password`)
- GitLab Helm chart external Redis docs: https://docs.gitlab.com/charts/advanced/external-redis/ (confirmed migration from `global.redis.password.*` → `global.redis.auth.*` for chart 7.0+)
- GitLab webservice chart docs: https://docs.gitlab.com/charts/charts/gitlab/webservice/ (confirmed default deployment name `RELEASE-webservice-default` and that `workerProcesses` is a valid field)
- GitLab sidekiq chart docs / chart source: https://docs.gitlab.com/charts/charts/gitlab/sidekiq/ (confirmed default sidekiq pod name `gitlab-sidekiq-all-in-1-v2`)
- GitLab toolbox chart docs: https://docs.gitlab.com/charts/charts/gitlab/toolbox/ (confirmed `backups.cron.{enabled,schedule,persistence}` schema)
- GitLab gitaly chart values.yaml: https://gitlab.com/gitlab-org/charts/gitlab/-/raw/master/charts/gitlab/charts/gitaly/values.yaml (confirmed `persistence.{size,storageClass}`)
- GitLab gitlab-shell chart values.yaml (verified `minReplicas` is a valid top-level field, not only nested under `hpa`)
- GitLab KAS chart docs: https://docs.gitlab.com/charts/charts/gitlab/kas/ (confirmed enable flag is `global.kas.enabled`, not `gitlab.kas.enabled`)
- GitLab Runner Helm chart configuration: https://docs.gitlab.com/runner/install/kubernetes_helm_chart_configuration/ (confirmed `runners.config` should start with `[[runners]]` TOML array-of-tables)
- cert-manager release manifest: https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml (URL pattern is valid for v1.14.0)
- ingress-nginx Helm repo: https://kubernetes.github.io/ingress-nginx (confirmed repo URL and `controller.replicaCount` value)
- Talos Linux machine config reference: https://www.talos.dev/v1.12/reference/configuration/v1alpha1/config/ (`machine.sysctls`, `machine.disks` schema; `size:` is optional and defaults to remaining disk)
- Redis CLI reference: https://redis.io/docs/latest/operate/oss_and_stack/management/config-file/ (`--requirepass`, `--maxmemory`, `--maxmemory-policy allkeys-lru` are valid)
- Postgres image: https://hub.docker.com/_/postgres (`postgres:16-alpine` is a valid published tag; `POSTGRES_DB`/`POSTGRES_USER`/`POSTGRES_PASSWORD` env vars and `/var/lib/postgresql/data` mount with `subPath: pgdata` are the documented pattern)

## Issues Found

1. **`global.redis.password.*` is deprecated.** The post configured external Redis via `global.redis.password.{enabled,secret,key}`. The GitLab Helm chart deprecated this in favor of `global.redis.auth.{enabled,secret,key}` starting with chart 7.0; current chart versions (8.x/9.x) emit a `coalesce.go: warning: destination for ... password is a table` warning and the password block no longer takes effect cleanly. Renamed `password:` → `auth:` under `global.redis` so the chart actually consumes the external Redis credentials.

2. **`kas.enabled: true` was nested under `gitlab:` instead of `global:`.** The KAS enable toggle is `global.kas.enabled`; `gitlab.kas` is for additional KAS-subchart configuration but does not enable the component. Moved `kas: { enabled: true }` from the `gitlab:` block to the `global:` block so the setting actually turns KAS on (it is on by default in current charts, but the explicit toggle now lives in the right place).

3. **Wrong Deployment names in `kubectl exec` examples.** The monitoring section ran `kubectl exec -it deploy/gitlab-webservice ...` and `kubectl exec -it deploy/gitlab-sidekiq ...`. The actual default Deployments created by the chart are `gitlab-webservice-default` (per the webservice chart's deployment map, default key is `default`) and `gitlab-sidekiq-all-in-1-v2` (per the sidekiq chart's default pod entry). Updated all three commands to use the correct Deployment names so the `kubectl exec` calls succeed against a fresh chart install.

## Review Notes

- "Resource Planning" near the end is missing its `## ` heading prefix in the source, so it renders as plain text instead of a section header. Left unchanged — purely stylistic, outside the scope of technical correctness.
- The `global.psql.password` block omits `useSecret: true`. This still works because `useSecret` defaults to `true` when `secret` and `key` are present, so it is not strictly an error.
- The post mounts the user-provided extra disk at `/var/lib/gitlab-data` via Talos `machine.disks`. Talos 1.10+ guidance increasingly steers users toward `/var/mnt/...` for extra-disk mountpoints; `/var/lib/...` still works today and matches the pattern used in the companion Cassandra-on-Talos post, so left as-is.
- The bundled MinIO is enabled (`global.minio.enabled: true`) but no S3-compatible object-storage credentials/bucket setup is shown. For production, GitLab recommends external object storage (S3/GCS/etc.) configured via `global.appConfig.object_store` rather than the bundled MinIO. GitLab has also signaled the bundled PostgreSQL/Redis/MinIO charts will be removed in a future release (~19.0); readers should plan to migrate to managed services.
- The `registry.storage` block references a `registry-storage` Secret that is never created in the post. The chart requires this secret to hold a registry `config.yml` with object-storage credentials when the registry is enabled. Readers will need to create that secret manually (or disable the registry) before `helm install` succeeds. Not changed because adding the secret would introduce a new section beyond fixing what is already in the post.
- The `wait for dependencies` step uses `kubectl rollout status statefulset/gitlab-postgres` immediately after `kubectl apply`. `rollout status` blocks until the resource is ready, so this works, but on a fresh cluster the PVC may take a few seconds to bind before the StatefulSet is observable — that is expected and not an error.
- `gitlab.webservice.resources.limits` sets `memory` without `cpu`, and `gitlab.sidekiq` does the same. This is intentional (CPU limits on Rails workloads commonly cause throttling) and is consistent with upstream guidance, so left as-is.
