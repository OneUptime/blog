# Validation Summary: How to Get Started with Apache Pulsar

## Status
validated

## Post Type
Tutorial / Getting-started guide

## Technologies Covered
- Apache Pulsar
- Apache BookKeeper
- Docker
- Pulsar CLI (`pulsar-client`, `pulsar-admin`)
- Pulsar Python client
- Pulsar subscriptions, partitioned topics, dead letter queues, retention, TTL, and schemas
- Prometheus-format metrics

## Sources Consulted
- Apache Pulsar Python client API docs 3.3.x: https://pulsar.apache.org/api/python/3.3.x/pulsar.Client.html
- Apache Pulsar Producer API docs 3.3.x: https://pulsar.apache.org/api/python/3.3.x/pulsar.Producer.html
- Apache Pulsar Message API docs 3.3.x: https://pulsar.apache.org/api/python/3.3.x/pulsar.Message.html
- Apache Pulsar ConsumerDeadLetterPolicy API docs 3.3.x: https://pulsar.apache.org/api/python/3.3.x/pulsar.ConsumerDeadLetterPolicy.html
- Apache Pulsar Python client docs: https://pulsar.apache.org/docs/client-libraries/python/
- Apache Pulsar consumer and subscription docs: https://pulsar.apache.org/docs/client-libraries/consumers/
- Apache Pulsar retention and TTL docs: https://pulsar.apache.org/docs/next/cookbooks-retention-expiry/
- Apache Pulsar admin CLI reference: https://pulsar.apache.org/docs/next/reference-pulsar-admin/
- Apache Pulsar 3.3.0 Docker image CLI help for `pulsar-client consume`, `pulsar-client produce`, `pulsar-admin topics`, `pulsar-admin namespaces set-message-ttl`, and `pulsar-admin broker-stats`
- Local API check with `pulsar-client[avro]` 3.12.0 for current Python schema behavior

## Issues Found
- The post used `datetime.utcnow().isoformat()` in the producer example. This was changed to `datetime.now(timezone.utc).isoformat()` so timestamps are explicitly timezone-aware.
- The consumer timeout comment said `receive(timeout_millis=5000)` returns `None`. Pulsar's Python client raises `pulsar.Timeout`; the comment was corrected.
- The partitioned topic creation text referred to the admin API while showing a CLI command. It was corrected to "admin CLI."
- The Shared subscription explanation for partitioned topics implied static partition assignment. It was corrected to explain that Shared subscriptions load-balance messages across consumers and do not preserve overall ordering.
- The DLQ example wording implied "failed attempts" rather than redeliveries and omitted the optional initial DLQ subscription name. The comment and `ConsumerDeadLetterPolicy` configuration were corrected.
- The DLQ consumer attempted to print an `ORIGIN_TOPIC` property that is not a documented Python message property. It now prints `msg.topic_name()`.
- The monitoring section used `pulsar-admin namespaces stats public/default`, which is not a valid command in Pulsar 3.3.0. It was replaced with `pulsar-admin broker-stats topics`.
- The best-practices section did not mention the limitation that negative-ack redelivery counts may not provide strict retry guarantees. A note was added recommending retry topics when fixed retry limits are required.
- The install command used `pip install pulsar-client`, but the later `AvroSchema` examples require Avro support. It was changed to `pip install "pulsar-client[avro]"`.
- The schema example said constructing an `OrderEvent` with missing fields would fail at runtime. Current Python schema behavior allows omitted fields to encode successfully, so the misleading comment was replaced with guidance to validate required business fields before sending.

## Review Notes
- The Docker image version in the post is Apache Pulsar 3.3.0. Apache Pulsar has newer releases, but the version-pinned commands and concepts reviewed here are still valid for a getting-started tutorial.
- The core conceptual explanations for topics, tenants, namespaces, subscription types, retention, TTL, and partition keys are consistent with the official Pulsar documentation.
