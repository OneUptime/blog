# Validation Summary: How to Use Kafka in Go with segmentio/kafka-go

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Go
- Apache Kafka
- `segmentio/kafka-go`
- Docker Compose
- Bitnami Kafka container image
- JSON serialization
- Avro serialization with `github.com/linkedin/goavro/v2`
- Kafka consumer groups, commits, retries, dead letter queues, and outbox patterns

## Sources Consulted
- kafka-go package documentation: https://pkg.go.dev/github.com/segmentio/kafka-go
- kafka-go GitHub README and examples: https://github.com/segmentio/kafka-go
- Apache Kafka documentation: https://kafka.apache.org/documentation/
- Confluent Kafka delivery semantics documentation: https://docs.confluent.io/kafka/design/delivery-semantics.html
- Docker Compose documentation: https://docs.docker.com/compose/
- Bitnami Kafka container documentation: https://github.com/bitnami/containers/blob/main/bitnami/kafka/README.md
- goavro v2 package documentation: https://pkg.go.dev/github.com/linkedin/goavro/v2
- Apache Avro specification, logical types: https://avro.apache.org/docs/1.11.0/spec.html

## Issues Found
- The Docker Compose command used the legacy `docker-compose` binary. Updated it to `docker compose up -d`, which matches current Docker Compose documentation.
- The optimized producer example used `fmt.Sprintf` without importing `fmt`. Added the missing import.
- The optimized producer described `AllowAutoTopicCreation` as enabling idempotent writes and exactly-once semantics. Corrected the comment because that kafka-go field only controls automatic topic creation.
- The custom balancer returned a partition index rather than one of the partition numbers passed to `Balance`. Updated it to return `partitions[index]`, matching kafka-go's Balancer contract.
- The manual offset management example configured a fixed partition but used `CommitMessages`, which is consumer-group offset management in kafka-go. Switched the example to use `GroupID` with synchronous manual commits.
- The simple partition reader implied it would continue from committed offsets. Clarified that partition readers need external offset storage or a consumer group for committed offsets.
- The consumer group example configured periodic commit flushing while presenting manual commits. Set `CommitInterval` to `0` and changed handler failures to skip commits so failed messages can be retried.
- The concurrent partition processing example committed messages immediately after dispatching them to worker goroutines. Moved commits into the per-partition processor after simulated processing completes.
- The Avro example did not import `time`, shadowed the `encoding/binary` package with a local variable named `binary`, and placed the `timestamp-millis` logical type on the field instead of the `long` schema. Added the import, renamed the local variable, and corrected the Avro schema.
- The transactional producer section claimed atomic multi-topic writes with kafka-go's high-level Writer. Reworked it as an atomic single-topic batch write example and noted that kafka-go's high-level Writer does not expose the full Kafka transaction API needed for atomic multi-topic writes or atomic offset commits with output records.
- The deduplication consumer marked messages as processed before the handler succeeded and still committed after handler errors. Changed it to check for duplicates first, mark messages only after successful processing, and skip commits on processing failures.
- The conclusion described the pattern as exactly-once via idempotent producers. Reworded it to idempotent processing with explicit commits, deduplication, and the outbox pattern.

## Review Notes
The Go toolchain is not installed in the review environment, so I could not run `go build` on the snippets locally. Static review was performed against the official kafka-go and goavro package documentation. The outbox example is still intentionally simplified; a production publisher should usually claim rows and mark them in a database transaction, tolerate duplicate publishes, and use durable idempotency keys on the consumer side.
