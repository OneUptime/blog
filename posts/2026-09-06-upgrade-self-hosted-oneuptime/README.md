# How to Upgrade Self-Hosted OneUptime Without Losing Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OneUptime, Self-Hosting, Docker Compose, Helm, Backup

Description: Upgrade self-hosted OneUptime with pinned releases, verified backups, staged migrations, and separate rollback plans for binaries and data.

---

A safe OneUptime upgrade is a data migration, not merely a container-image refresh. PostgreSQL holds configuration and incident state, ClickHouse holds telemetry, and each major release can change services, permissions, or schemas. Preserve a recoverable pre-upgrade state and read every intervening release note.

This runbook uses OneUptime 12.0.33 as the current target example.

## Establish the supported upgrade path

OneUptime's upgrade guide says to move through major versions one at a time. A deployment on 10.x should go to 11.x and then 12.x. Minor and patch releases may be leapfrogged if their release notes permit it.

Before changing anything, record:

```bash
git rev-parse HEAD
docker compose --env-file config.env images
docker compose --env-file config.env ps
```

For Helm, capture equivalent release information:

```bash
helm -n oneuptime get metadata oneuptime
helm -n oneuptime get values oneuptime --all > oneuptime-values-before.yaml
kubectl -n oneuptime get pods,pvc
```

The captured values can contain secrets. Store them in the same protected recovery location as database backups and remove unprotected working copies.

## Prove the backup before maintenance

Take a PostgreSQL backup, a ClickHouse backup, and any object-storage backup used by your deployment. Keep them outside the host or cluster being upgraded. A file existing is not proof: restore into an isolated environment, query representative rows, and confirm the backup version is compatible with the restore tooling.

Define a maintenance window and stop or buffer writers if you need a consistent recovery point across PostgreSQL and ClickHouse. Record row counts, latest timestamps, monitor count, open incident count, and a few dashboard queries for post-upgrade comparison.

## Rehearse in staging

Restore production-like backups into an isolated staging instance, upgrade there first, and exercise:

- sign-in and project access
- monitor execution and probe heartbeats
- incident creation and notifications
- telemetry ingestion and historical queries
- workflows, runbooks, API automation, and status pages

This rehearsal measures migration time and exposes configuration changes before the production clock starts.

## Upgrade Docker Compose

The official Compose flow tracks the `release` branch and uses the repository update script:

```bash
git checkout release
git pull
npm run update
```

Review the fetched diff and release notes before running the update in production. If your operational policy pins tags or commits, select the reviewed release tag instead of accepting an unreviewed moving branch.

For the 11 to 12 transition, Runbook Agent and AI Agent become the OneUptime Runner. Compose renames the `ai-agent` service to `runner` and renames its environment variables. Set `ONEUPTIME_RUNNER_KEY` to a long random value before startup; the generated placeholder is not safe. Ensure the retired `ai-agent` container is removed with `--remove-orphans`.

External runbook-agent containers should move to `oneuptime/runner:release` and `ONEUPTIME_RUNNER_*` variables. Existing identifiers and keys can be retained as documented, but old variable names are ignored by the new image.

## Upgrade Helm

Update the repository, inspect the target chart, render it, then upgrade with the same reviewed values:

```bash
helm repo update oneuptime
helm template oneuptime oneuptime/oneuptime \
  --namespace oneuptime \
  --version TARGET_CHART_VERSION \
  --values values-production.yaml > /tmp/oneuptime-rendered.yaml

helm upgrade oneuptime oneuptime/oneuptime \
  --namespace oneuptime \
  --version TARGET_CHART_VERSION \
  --values values-production.yaml \
  --wait --timeout 30m
```

In the v12 chart, rename an `aiAgent:` values block to `runner:`. The schema rejects the old key, so finding this during `helm template` is much safer than finding it in the maintenance window.

## Validate before reopening traffic

Check migrations and health, then compare against the baseline:

```bash
docker compose --env-file config.env ps
docker compose --env-file config.env logs --since=30m | grep -iE 'error|migration|fatal'
```

For Kubernetes, use `kubectl get pods`, events, and the logs for restarted or migration-related workloads. Verify state in both databases, not just that the home page returns 200. Generate a controlled monitor failure and one small telemetry sample, then confirm notification and query paths.

## Treat rollback as a restore

Reverting container tags after a database migration may leave an older binary reading a newer schema. OneUptime explicitly notes that a rollback from v12 to v11 requires the pre-upgrade backup. Document the exact restore sequence and recovery time before starting.

Do not automatically restore over the failed instance while evidence is still being gathered. Preserve logs and database state, create a clean restore target, and make the traffic cutover a deliberate incident decision.

## Conclusion

The reliable upgrade pattern is inventory, tested backup, staging rehearsal, pinned change, application validation, and a data-aware rollback. Major-version notes are part of the procedure, especially the v12 Runner migration and its security-sensitive key.

## Official Documentation

- [OneUptime upgrade guide](https://oneuptime.com/docs/en/installation/upgrading)
- [OneUptime Docker Compose installation](https://oneuptime.com/docs/en/installation/docker-compose)
- [OneUptime Helm chart](https://helm-chart.oneuptime.com/)
- [Helm upgrade command](https://helm.sh/docs/helm/helm_upgrade/)
