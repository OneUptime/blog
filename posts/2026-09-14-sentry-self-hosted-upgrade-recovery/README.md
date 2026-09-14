# Self-Hosted Sentry Upgrade Fails in Kafka, Snuba, or ClickHouse: A Recovery Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sentry, Kafka, ClickHouse, Troubleshooting, Self-Hosted

Description: Recover a failed self-hosted Sentry upgrade by preserving data, checking required upgrade stops, and tracing the failing component before making repairs.

---

A failed Sentry upgrade can leave the web application, event consumers, and storage services at different stages of migration. Restarting everything repeatedly makes that state harder to understand. Deleting a Kafka volume or resetting consumer offsets may make a container start while discarding the events you were trying to recover.

Start by preserving the failure evidence and identifying the first unsuccessful upgrade step. Then choose either a supported forward repair or a restore of a complete, compatible backup.

## 1. Record the source, target, and actual running state

From the self-hosted checkout, collect basic evidence before another installer run:

```bash
git describe --tags --always
git status --short
docker compose version
docker compose config --services
docker compose images
docker compose ps -a
docker compose logs --since 30m --timestamps --no-color > upgrade-services.log
```

Keep the previous release tag and the original installer output too. The checked-out tag describes configuration on disk; it does not prove every running container has that image. Review custom image overrides, bind mounts, and local Compose changes.

The examples assume the default Compose environment. If your deployment uses `.env.custom`, consistently include the environment files in Compose commands. Avoid publishing fully expanded configuration or raw logs without review, because they can contain credentials or event data.

## 2. Check the supported upgrade path

Sentry requires intermediate releases, called hard stops, for significant database changes. The current guide also lists releases to avoid and version-specific issues. Consult that list for the exact source and target instead of jumping directly to the newest tag. See [Self-Hosted Releases & Upgrading](https://develop.sentry.dev/self-hosted/releases/).

For example, the guide documents a historical path from `22.8.0` through `23.6.2` and `23.11.0` before `24.2.0`. This is an illustration of the process, not a current deployment recommendation. Build your own sequence from the live hard-stop list.

If an unsupported jump already ran migrations, checking out an older application tag is not a reliable rollback. Database schemas and stored data may have changed. Determine what completed before choosing the next step.

Also compare your configuration with the example files from the target release. New required settings and stale image overrides can produce failures that look like database corruption but are actually configuration drift.

## 3. Clear resource failures before repairing schemas

Check host memory, filesystem capacity, inodes, and container OOM status:

```bash
df -h
df -i
free -h
docker stats --no-stream

container_id=$(docker compose ps -q clickhouse)
if [ -n "$container_id" ]; then
  docker inspect --format '{{.State.OOMKilled}} {{.State.ExitCode}}' "$container_id"
fi
```

Run these Linux commands on the Sentry host. A ClickHouse migration cannot succeed reliably while its disk is full, and restarting an OOM-killed service without changing memory pressure just repeats the failure.

Sentry's documented baseline includes 4 CPU cores, 16 GB RAM plus 16 GB swap, and at least 20 GB of free disk; production sizing must also account for ingestion, retention, and temporary upgrade work. See [self-hosted requirements](https://develop.sentry.dev/self-hosted/).

## 4. Classify the first failing component

| Evidence | Next investigation |
| --- | --- |
| Kafka connection failures | Broker health, advertised addresses, resource pressure |
| `OFFSET_OUT_OF_RANGE` | Consumer group, retained range, and time spent behind |
| ClickHouse unknown table or column | Target migration completion and component version consistency |
| ClickHouse memory or disk errors | Host capacity and concurrent work |
| Snuba query failure while ingestion works | Query-side configuration and schema compatibility |
| Installer exits during a migration | That migration's original error and release notes |

Snuba has ingestion and query responsibilities, and subscription workers serve alert evaluation. A quiet subscription consumer does not necessarily indicate broken event ingestion. Sentry's [Snuba troubleshooting guide](https://develop.sentry.dev/self-hosted/troubleshooting/snuba/) explains these separate roles.

Use `docker compose config --services` to discover the service names in your release before collecting focused logs. Names and consumer groups change over time; a command copied from another release might inspect the wrong workload.

## 5. Preserve Kafka offsets until the loss tradeoff is understood

For the Kafka image documented by Sentry, inspect groups with:

```bash
docker compose exec kafka kafka-consumer-groups \
  --bootstrap-server kafka:9092 --describe --all-groups
```

Compare current offsets, end offsets, and the failing consumer's topic assignments. If the executable or listener differs in your release, use the equivalent command for its bundled broker image.

An out-of-range offset can mean the consumer fell behind data that retention already removed. Resetting to the latest offset skips retained backlog; resetting to the earliest available offset can replay retained messages but cannot recover expired ones. Both choices require a deliberate recovery plan. See [Sentry's Kafka troubleshooting documentation](https://develop.sentry.dev/self-hosted/troubleshooting/kafka/).

Do not delete broker data or reset every consumer group as a generic upgrade fix. When an offset change is necessary, stop the relevant consumers, record the existing offsets, inspect a dry run, and limit the change to the affected group and topic.

## 6. Resume through the supported installer

After fixing the identified cause, follow the target release's instructions. Sentry documents `./install.sh` as the upgrade path and `docker compose up --wait` after successful installation.

```bash
# Run from Bash, after selecting the reviewed target release.
set -o pipefail
./install.sh 2>&1 | tee upgrade-retry.log
```

Only when the installer succeeds:

```bash
docker compose up --wait
```

Do not manually edit migration-history tables to make the installer appear successful. If a migration needs a version-specific repair, use the corresponding release guidance and retain the evidence showing why it applies.

## 7. Prove recovery beyond the login page

Send a unique synthetic error to a test project. Confirm it appears, its details load, and a search returns it. Check a known pre-upgrade event and one configured alert. Observe that active ingestion consumers catch up and that the original storage errors stop recurring.

If forward repair is not viable, restore the matching application release, configuration, and consistent datastore backup together on an isolated instance first. Sentry's [backup documentation](https://develop.sentry.dev/self-hosted/backup/) distinguishes partial configuration exports from full historical-data recovery. A JSON export alone cannot restore missing event history.

Keep the upgrade incident open until new ingestion, historical queries, and alert delivery work. Healthy containers are useful evidence, but recovered application behavior is the actual completion criterion.

## References

- [Releases and required upgrade stops](https://develop.sentry.dev/self-hosted/releases/)
- [Kafka troubleshooting](https://develop.sentry.dev/self-hosted/troubleshooting/kafka/)
- [Snuba troubleshooting](https://develop.sentry.dev/self-hosted/troubleshooting/snuba/)
- [Backup and restore](https://develop.sentry.dev/self-hosted/backup/)
