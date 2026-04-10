# Validation Summary: Redis Pub/Sub vs Kafka Topics: When to Use Which

## Status
validated

## Post Type
Comparison guide / Decision guide

## Technologies Covered
- Redis Pub/Sub
- Redis Streams
- Apache Kafka (topics, consumer groups, offsets)
- Python redis-py library
- Python confluent-kafka library

## Sources Consulted
- Redis Pub/Sub documentation — https://redis.io/docs/latest/develop/interact/pubsub/
- Redis Streams documentation — https://redis.io/docs/latest/develop/data-types/streams/
- Apache Kafka documentation — https://kafka.apache.org/documentation/
- confluent-kafka-python documentation — https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html

## Issues Found

1. **Redis Pub/Sub ordering incorrectly stated as "Not guaranteed (fan-out)"**
   - **What was wrong:** The comparison table claimed Redis Pub/Sub does not guarantee message ordering, annotated with "(fan-out)". Redis Pub/Sub actually guarantees message ordering per channel due to Redis's single-threaded command processing model. Fan-out describes the delivery pattern (one-to-many), not an ordering property.
   - **What was changed:** Changed "Not guaranteed (fan-out)" to "Per channel" in the comparison table.
   - **Why:** Redis documentation confirms messages are delivered to subscribers in the order they are published to a channel.

2. **Kafka "exactly once" claim in Decision Guide inconsistent with table and code**
   - **What was wrong:** The Decision Guide stated "Every message must be processed exactly once even if a consumer is offline" as a reason to use Kafka. However, the comparison table correctly states Kafka provides "At-least-once (configurable)" delivery, and the code example demonstrates at-least-once semantics (poll, process, commit). Exactly-once semantics in Kafka require additional configuration: idempotent producers, transactional API, and `read_committed` isolation level — none of which are shown or discussed.
   - **What was changed:** Changed "processed exactly once" to "processed at least once" in the Decision Guide.
   - **Why:** Aligns the recommendation with the delivery guarantee described in the table and demonstrated in the code example, avoiding misleading readers into thinking Kafka provides exactly-once out of the box.

## Review Notes
- The Python redis-py Pub/Sub code is correct and idiomatic.
- The confluent-kafka Producer/Consumer code is correct and uses current API conventions.
- The Redis Streams CLI commands (XADD, XGROUP CREATE, XREADGROUP, XACK) are syntactically correct.
- The Redis Pub/Sub PSUBSCRIBE pattern example uses correct glob-style matching.
- The post could mention in a future update that Kafka supports exactly-once semantics via its transactional API and Kafka Streams, but this is an enhancement, not a correction.
- The "Ops complexity: Zero" for Redis Pub/Sub is a slight simplification (you still need a Redis server), but is reasonable in relative comparison to Kafka's operational overhead.
