# Validation Summary: How to Run Apache Pulsar in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Pulsar 3.3.0
- Docker and Docker Compose
- Pulsar CLI tools (`pulsar-admin`, `pulsar-client`, `pulsar`)
- Pulsar Manager
- Apache BookKeeper
- ZooKeeper-backed Pulsar metadata stores
- Python Pulsar client

## Sources Consulted
- Apache Pulsar 3.0.x Docker standalone documentation: https://pulsar.apache.org/docs/3.0.x/getting-started-docker/
- Apache Pulsar 3.3.x architecture overview: https://pulsar.apache.org/docs/3.3.x/concepts-architecture-overview/
- Apache Pulsar 3.1.x bare metal deployment documentation for 3.x metadata-store flags: https://pulsar.apache.org/docs/3.1.x/deploy-bare-metal/
- Apache Pulsar admin API topic documentation: https://pulsar.apache.org/docs/4.2.x/admin-api-get-started/
- Apache Pulsar Manager documentation: https://pulsar.apache.org/docs/2.9.x/administration-pulsar-manager/
- Apache Pulsar Python client documentation: https://pulsar.apache.org/docs/client-libraries/python-use/
- Local verification against `apachepulsar/pulsar:3.3.0` CLI help output for `initialize-cluster-metadata`, `pulsar-admin namespaces set-retention`, `pulsar-admin topics create-partitioned-topic`, `pulsar-admin topics stats-internal`, `pulsar-admin topics peek-messages`, `pulsar-admin brokers healthcheck`, `pulsar-admin tenants create`, and `pulsar-client produce/consume`.

## Issues Found
- The standalone architecture text said ZooKeeper runs as one of the three standalone components. Pulsar 3.x standalone uses a local metadata store by default, so the text now distinguishes full-cluster ZooKeeper metadata from standalone's local metadata store.
- The quick verification flow produced before creating the subscription, then consumed with the default subscription position. Added `-p Earliest` so the consumer reads the already-produced test message.
- The Python producer/consumer flow also produced messages before creating the subscription, while the Python client's default initial position is `Latest`. Added `initial_position=pulsar.InitialPosition.Earliest` to match the example order.
- The Pulsar Manager example used the floating `latest` tag and omitted the CSRF token required by the official superuser creation command. Changed the image to the documented `v0.2.0` tag and added the CSRF token headers and cookie.
- The cluster metadata initialization used older `--zookeeper` and `--configuration-store` flags. Updated them to the 3.x `--metadata-store` and `--configuration-metadata-store` flags verified in the 3.3.0 image.
- The cluster Docker Compose snippet set broker and bookie configuration values as plain environment variables, which the Pulsar image does not automatically apply. Updated the snippet to use `PULSAR_PREFIX_` variables with `bin/apply-config-from-env.py`, matching Pulsar's Docker configuration mechanism.
- The BookKeeper service used legacy ZooKeeper-related environment keys instead of a metadata service URI. Updated it to configure `metadataServiceUri` and `advertisedAddress` through the Pulsar env-to-config helper.

## Review Notes
The post remains suitable for local development and integration testing. For future maintenance, consider updating from Pulsar `3.3.0` to a current supported release and replacing the single-node "cluster" Compose example with an explicit note that it is not production-grade.
