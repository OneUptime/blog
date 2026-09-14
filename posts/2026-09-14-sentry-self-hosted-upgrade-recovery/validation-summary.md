# Validation Summary: Recover Sentry Upgrades Failing in Kafka, Snuba, or ClickHouse

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Self-hosted Sentry
- Docker and Docker Compose
- Kafka
- Snuba
- ClickHouse
- Linux system administration

## Sources Consulted
- [Sentry Self-Hosted Releases & Upgrading](https://develop.sentry.dev/self-hosted/releases/)
- [Sentry Self-Hosted documentation and system resources](https://develop.sentry.dev/self-hosted/)
- [Sentry Kafka troubleshooting](https://develop.sentry.dev/self-hosted/troubleshooting/kafka/)
- [Sentry Snuba troubleshooting](https://develop.sentry.dev/self-hosted/troubleshooting/snuba/)
- [Sentry Self-Hosted Backup & Restore](https://develop.sentry.dev/self-hosted/backup/)
- [Sentry self-hosted Docker Compose configuration](https://github.com/getsentry/self-hosted/blob/master/docker-compose.yml)
- [Sentry self-hosted installer](https://github.com/getsentry/self-hosted/blob/master/install.sh)
- [Docker Compose `logs` reference](https://docs.docker.com/reference/cli/docker/compose/logs/)
- [Docker Compose `config` reference](https://docs.docker.com/reference/cli/docker/compose/config/)
- [Docker Compose `up` reference](https://docs.docker.com/reference/cli/docker/compose/up/)
- [Apache Kafka consumer group tool documentation](https://kafka.apache.org/documentation/#basic_ops_consumer_group)

## Issues Found
- The resource guidance incorrectly stated that Sentry's documented baseline requires 16 GB RAM plus 16 GB swap. The current official guidance recommends 4 CPU cores, 16 GB RAM, and 20 GB free disk and does not specify an additional 16 GB swap requirement. Removed the unsupported swap claim and clarified that these figures are the recommended baseline.

## Review Notes
- The hard-stop sequence is explicitly presented as a historical example; readers should continue to consult current release documentation and release notes because required stops and releases to avoid change over time.
- Kafka service names, consumer groups, and topic assignments are release-specific, as the post correctly notes.
