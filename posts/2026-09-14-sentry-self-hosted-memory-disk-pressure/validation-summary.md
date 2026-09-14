# Validation Summary: How to Reduce Memory and Disk Pressure in Self-Hosted Sentry Without Dropping Critical Events

## Status
validated

## Post Type
Technical operations guide

## Technologies Covered
- Self-hosted Sentry
- Docker Engine and Docker Compose
- Apache Kafka
- ClickHouse
- PostgreSQL
- Sentry JavaScript SDK sampling

## Sources Consulted
- [Sentry self-hosted requirements](https://develop.sentry.dev/self-hosted/)
- [Sentry self-hosted configuration](https://develop.sentry.dev/self-hosted/configuration/)
- [Sentry self-hosted example configuration](https://github.com/getsentry/self-hosted/blob/master/sentry/sentry.conf.example.py)
- [Sentry Kafka troubleshooting](https://develop.sentry.dev/self-hosted/troubleshooting/kafka/)
- [Sentry JavaScript SDK sampling](https://docs.sentry.io/platforms/javascript/configuration/sampling/)
- [Docker JSON file logging driver](https://docs.docker.com/engine/logging/drivers/json-file/)
- [Docker Compose service configuration](https://docs.docker.com/reference/compose-file/services/#logging)
- [Docker object pruning](https://docs.docker.com/engine/manage-resources/pruning/)
- [Apache Kafka consumer group operations](https://kafka.apache.org/documentation/#basic_ops_consumer_group)

## Issues Found
- The post described 4 CPU cores, 16 GB RAM, 16 GB swap, and 20 GB disk as Sentry's minimum. Current official documentation lists 2 CPU cores and 4 GB RAM as the installation minimum, and 4 CPU cores, 16 GB RAM, and 20 GB free disk as the recommended baseline. The unsupported swap requirement was removed and the minimum/recommended distinction was corrected.

## Review Notes
- The Kafka executable name can differ between bundled images and Sentry releases; the post already includes an appropriate caveat.
- The `sampleRate` example uses the JavaScript SDK option name and correctly distinguishes error-event sampling from trace sampling.
- Retention changes are release-sensitive operational changes; the post appropriately directs readers to their installation's documented procedure.
