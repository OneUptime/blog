# How to Reduce Memory and Disk Pressure in Self-Hosted Sentry Without Dropping Critical Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sentry, Memory Management, Disk Space, Monitoring, Self-Hosted

Description: Diagnose Sentry resource pressure, preserve ingestion backlog, and reduce avoidable load through measured capacity and retention changes.

---

When self-hosted Sentry runs out of memory or disk, event consumers fall behind, databases reject work, and the monitoring system becomes least reliable during the incident it should explain. Emergency deletion may restore free space while permanently removing the evidence you need.

Preserving critical events starts with identifying the constrained resource and protecting the ingestion path. No configuration can guarantee zero loss on an already saturated host. The aim is to restore headroom before queues expire and make deliberate tradeoffs about noise and historical retention.

## Measure the pressure by component

Collect a baseline on the Linux host:

```bash
free -h
df -h
df -i
docker stats --no-stream
docker system df -v
docker compose ps -a
```

Memory exhaustion, inode exhaustion, and filesystem capacity are different problems. A large Docker image cache may be harmless when a different filesystem holding ClickHouse is full. Conversely, an OOM-killed database can cause growing Kafka backlog even when the broker itself has enough memory.

Inspect the affected container's state and timestamped logs. Correlate restarts with ingestion spikes, cleanup runs, backups, or expensive searches. Track disk latency and I/O wait as well as capacity; databases can fall behind before a disk is full.

Sentry currently documents an installation minimum of 2 CPU cores and 4 GB RAM. Its recommended baseline is 4 CPU cores, 16 GB RAM, and 20 GB free disk. These are installation baselines, not guarantees for your event rate and retention. See the [self-hosted requirements](https://develop.sentry.dev/self-hosted/).

## Distinguish durable data from reclaimable overhead

Build a storage breakdown before deleting anything:

| Storage | Typical action |
| --- | --- |
| Unused build cache and obsolete images | Review and prune with Docker's scoped tools |
| Container logs | Configure bounded rotation |
| Kafka retained messages | Review consumer lag and retention before changes |
| ClickHouse data | Investigate dataset growth and supported retention |
| PostgreSQL data | Use database-supported maintenance and backups |
| Attachments and artifacts | Review supported storage and lifecycle policy |

Do not run volume pruning as a generic disk-space repair. A volume that appears unused during an upgrade or outage may still hold the only copy of production data. Likewise, deleting files directly from Kafka or ClickHouse data directories bypasses their storage metadata.

Docker's [pruning documentation](https://docs.docker.com/engine/manage-resources/pruning/) distinguishes images, containers, build cache, and volumes. Review the target set and expected savings before selecting a cleanup command.

## Bound container log growth

Where container logs are the cause, configure rotation for the logging driver used by the deployment. For the `json-file` driver, a Compose service can use:

```yaml
services:
  web:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
```

This is an example service override, not a complete Sentry Compose file. Apply the policy to the services that need it and recreate containers through your normal deployment procedure. A configuration change does not retroactively rewrite old log files. Docker documents these settings in the [JSON file logging driver reference](https://docs.docker.com/engine/logging/drivers/json-file/).

Preserve relevant incident logs before rotation removes them. Avoid deleting or truncating Docker-managed files behind the daemon's back.

## Protect Kafka backlog while consumers recover

Kafka retention is a recovery window, not merely wasted disk. A consumer that has not processed a retained message may need it after a database outage. Reducing retention while consumers lag can discard the backlog before recovery finishes.

Inspect the current consumer state:

```bash
docker compose exec kafka kafka-consumer-groups \
  --bootstrap-server kafka:9092 --describe --all-groups
```

Use the bundled image's equivalent executable if your release differs. Check the slow consumer's logs and downstream database before adding replicas. More consumers do not necessarily help when all are waiting on an overloaded ClickHouse instance.

Sentry's [Kafka troubleshooting guide](https://develop.sentry.dev/self-hosted/troubleshooting/kafka/) describes out-of-range offsets and the data-loss implications of resets. Resetting to latest makes backlog disappear from a lag display by skipping it; that is not successful recovery.

## Reduce avoidable work before discarding errors

Start at producers with known noise: development events, repeated synthetic checks, and clearly classified expected failures. Keep filters narrow and measurable. Reduce ordinary trace volume separately from error-event capture, and review replay, profiling, attachments, and other high-volume features according to your actual usage.

Do not assume disabling an optional consumer safely disables the corresponding feature. If producers keep sending its events, backlog can accumulate. Use the feature's documented configuration and monitor the resulting ingestion behavior.

Preserve rare failures with `sampleRate: 1` where practical and adjust trace sampling independently. This protects the SDK's error selection policy, though server limits and overload can still cause loss. The [Sentry sampling guide](https://docs.sentry.io/platforms/javascript/configuration/sampling/) explains the separate controls.

## Change historical retention deliberately

Sentry's standard cleanup policy retains events for 90 days by default, controlled by `SENTRY_EVENT_RETENTION_DAYS`. A shorter window can reduce historical storage, but it deliberately removes older evidence. Confirm that the new window meets your investigation and recovery requirements. See [self-hosted event retention](https://develop.sentry.dev/self-hosted/configuration/#event-retention).

```bash
# Example entry in the deployment's .env.custom file:
SENTRY_EVENT_RETENTION_DAYS=30
```

Apply changes using the installation's documented configuration procedure. Do not expect an environment edit to reclaim space immediately: running services must receive the setting, cleanup must succeed, and datastore work needs time and free space.

If critical history must remain available, expand storage or move supported file storage to an appropriate external backend before shortening retention. Keep a tested backup of the history you intend to preserve.

## Verify recovery under representative load

Send a unique synthetic error and confirm it becomes searchable. Observe consumer lag decreasing, storage write errors disappearing, and free-space and memory headroom remaining stable through a normal traffic peak. Check that a known historical issue remains available within the chosen retention window.

Create capacity alerts before the hard limits, leaving enough time for your actual intervention process. Include ingestion delay and consumer failures in monitoring; a host can have free disk while a broken consumer silently stops new events from appearing.

Document the resource baseline and which change improved it. A stable recovery means both that the host has headroom and that important new events continue through the whole pipeline.

## References

- [Self-hosted requirements](https://develop.sentry.dev/self-hosted/)
- [Sentry configuration and retention](https://develop.sentry.dev/self-hosted/configuration/)
- [Kafka troubleshooting](https://develop.sentry.dev/self-hosted/troubleshooting/kafka/)
- [Docker logging rotation](https://docs.docker.com/engine/logging/drivers/json-file/)
