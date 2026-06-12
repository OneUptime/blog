# Validation Summary: How to Design Pulsar Topics and Namespaces

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Apache Pulsar tenants, namespaces, and topics
- Pulsar Admin CLI
- Pulsar Java client API
- Pulsar Java admin API
- Apache BookKeeper-backed persistent topics
- Non-persistent Pulsar topics
- Namespace policies including retention, TTL, backlog quota, replication, deduplication, schema compatibility, and dispatch rate
- Pulsar monitoring commands and topic statistics

## Sources Consulted
- Apache Pulsar admin CLI reference: https://pulsar.apache.org/docs/next/reference-pulsar-admin/
- Apache Pulsar namespace administration guide: https://pulsar.apache.org/docs/next/admin-api-namespaces/
- Apache Pulsar topic administration guide: https://pulsar.apache.org/docs/next/admin-api-topics/
- Apache Pulsar messaging concepts: https://pulsar.apache.org/docs/next/concepts-messaging/
- Apache Pulsar producer guide: https://pulsar.apache.org/docs/client-libraries/producers/
- Apache Pulsar retention and expiry guide: https://pulsar.apache.org/docs/next/cookbooks-retention-expiry/
- Apache Pulsar non-persistent messaging guide: https://pulsar.apache.org/docs/next/cookbooks-non-persistent/
- Apache Pulsar schema administration guide: https://pulsar.apache.org/docs/next/admin-api-schemas/
- Apache Pulsar Java admin API docs for tenants and namespaces: https://pulsar.apache.org/api/admin/

## Issues Found
- The Java tenant creation example said `createTenant` was idempotent. Official Java admin API docs state `createTenant` throws a conflict when the tenant already exists, so the comment was corrected to recommend `getTenantInfo`/`updateTenant` for idempotent provisioning.
- The custom `MessageRouter` used `Math.abs(key.hashCode()) % metadata.numPartitions()` and `System.nanoTime() % metadata.numPartitions()`, both of which can produce invalid negative partition indexes. The code now uses `Math.floorMod` for keyed routing and `ThreadLocalRandom.current().nextInt(...)` for keyless routing.
- The persistent topic example method name contained a typo (`produceToPeristent`). It was corrected to `produceToPersistent`.
- The TTL description said Pulsar automatically acknowledges unprocessed messages. Pulsar message TTL expires unacknowledged messages, so the text was corrected to avoid implying a normal consumer acknowledgment.
- The backlog quota command mixed `--limitTime -1` with a storage-size quota. Current Pulsar CLI docs specify storage quotas with `--type destination_storage` and time quotas with `--type message_age`, set separately when both are needed. The examples now use `--type destination_storage` for size-based quotas.
- The setup script backlog quota examples omitted the quota type. They now specify `--type destination_storage`.
- The monitoring section used `pulsar-admin namespaces stats`, which is not a documented current Pulsar Admin CLI subcommand. It was replaced with documented topic and partitioned-topic stats commands.

## Review Notes
The guide is broadly accurate for modern Pulsar concepts and APIs. The throughput and alert thresholds are reasonable illustrative examples rather than universal defaults; production values should be tuned per cluster, workload, storage hardware, and SLOs.
