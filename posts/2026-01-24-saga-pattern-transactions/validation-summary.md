# Validation Summary: How to Handle Saga Pattern for Transactions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Saga pattern
- Microservices
- Distributed transactions
- Event-driven architecture
- Choreography-based sagas
- Orchestration-based sagas
- Go
- segmentio/kafka-go
- PostgreSQL
- Mermaid diagrams

## Sources Consulted
- Garcia-Molina and Salem, "Sagas": https://www.cs.cornell.edu/andru/cs711/2002fa/reading/sagas.pdf
- Microservices.io Saga pattern: https://microservices.io/patterns/data/saga.html
- Microservices.io Transactional Outbox pattern: https://microservices.io/patterns/data/transactional-outbox.html
- AWS Prescriptive Guidance, Saga patterns: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga.html
- Go `time` package documentation: https://pkg.go.dev/time
- Go `fmt` package documentation: https://pkg.go.dev/fmt
- segmentio/kafka-go package documentation: https://pkg.go.dev/github.com/segmentio/kafka-go
- PostgreSQL JSON types documentation: https://www.postgresql.org/docs/current/datatype-json.html
- PostgreSQL arrays documentation: https://www.postgresql.org/docs/current/arrays.html
- PostgreSQL partial indexes documentation: https://www.postgresql.org/docs/current/indexes-partial.html
- Mermaid syntax reference: https://mermaid.js.org/intro/syntax-reference.html

## Issues Found
- The introduction stated that traditional ACID transactions do not span service boundaries and that sagas "solve" the problem. Changed this to say ACID transactions usually do not span service boundaries in microservice systems and that sagas address the problem, which better reflects the pattern's eventual-consistency tradeoff.
- The saga definition said compensating transactions "undo" earlier changes. Changed this to "semantically reverse" the changes, because compensating actions may not be exact physical rollbacks after other services or users observe intermediate state.
- The order service example logged a failed direct Kafka publish and claimed the event could be retried. Changed the example to return the publish error and added a note that production systems should use a transactional outbox to retry reliably after the order is persisted.
- The orchestrator compensation example marked the saga failed even if a compensating transaction failed. Changed it to keep the saga in `COMPENSATING` and return an error when any compensation fails, so recovery can retry the incomplete compensation.
- The best-practices list said compensating transactions "must always succeed." Changed this to say they should be idempotent and retryable until completed, which is more operationally accurate.

## Review Notes
The Go snippets are illustrative and depend on application-specific interfaces and helper types that are not included in the post. The demonstrated standard-library calls, kafka-go `Writer.WriteMessages` usage, PostgreSQL schema features, and Mermaid diagram forms are consistent with the consulted documentation.
