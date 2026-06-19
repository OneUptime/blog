# Validation Summary: How to Fix 'Message Lost' in Async Communication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- segmentio/kafka-go
- Apache Kafka
- PostgreSQL
- Prometheus alerting rules
- Outbox pattern
- Idempotent consumers
- Dead letter queues

## Sources Consulted
- segmentio/kafka-go package documentation: https://pkg.go.dev/github.com/segmentio/kafka-go
- segmentio/kafka-go repository documentation: https://github.com/segmentio/kafka-go
- Go database/sql package documentation: https://pkg.go.dev/database/sql
- PostgreSQL SELECT documentation, including FOR UPDATE SKIP LOCKED: https://www.postgresql.org/docs/current/sql-select.html
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Apache Kafka documentation: https://kafka.apache.org/documentation/

## Issues Found
- The outbox polling example used `SELECT ... FOR UPDATE SKIP LOCKED` outside an explicit transaction, so row locks would be released at the end of the statement and concurrent relays could select the same messages. Changed the method to `ClaimPendingMessages`, wrapping the claim in a transaction and atomically marking selected rows as `PROCESSING`.
- The outbox retry path incremented the retry count without making failed claimed messages eligible for retry. Updated `IncrementRetry` to set the status back to `PENDING`.
- The outbox row iteration did not check `rows.Err()`. Added the check before committing the claim transaction.
- The idempotent consumer snippet referenced `kafka.Reader` and `kafka.Message` without importing `github.com/segmentio/kafka-go`. Added the missing import.
- The idempotent consumer claimed to ensure each message is processed exactly once. That wording was too strong for the shown pattern, which handles redelivery safely but does not provide global exactly-once execution. Changed the comment to say it safely handles redelivery of the same message.
- The idempotent consumer committed the Kafka offset even if recording the idempotency marker failed. Changed it to skip the commit when `MarkProcessed` fails so the message can be retried.
- The dead letter queue snippet referenced `kafka.Reader` and `kafka.Writer` without importing `github.com/segmentio/kafka-go`. Added the missing import.
- The retryable consumer constructor accepted no handler even though `Consume` calls `c.handler.Handle`. Added a `handler MessageHandler` parameter and assigned it to the struct.
- The dead letter queue path committed the Kafka offset even when publishing to the DLQ failed, which could lose the failed message. Changed it to continue without committing if `sendToDLQ` fails.
- The retry delay comment said "Exponential backoff" but the code used a linear delay. Changed the comment to "Back off before retrying."

## Review Notes
- The examples are illustrative and still omit application-specific pieces such as `Order`, `generateID`, concrete database drivers, and handler implementations.
- For production outbox relays, add recovery for messages left in `PROCESSING` if a relay crashes after claiming but before publishing or marking the message sent.
- If message handling writes to a database, record the idempotency marker in the same transaction as the business side effect to avoid duplicate side effects after a crash.
