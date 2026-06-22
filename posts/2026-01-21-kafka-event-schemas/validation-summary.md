# Validation Summary: How to Design Event Schemas for Kafka

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache Kafka
- JSON Schema
- Java
- Python
- Event-driven architecture
- Domain event schema design

## Sources Consulted
- JSON Schema draft 2020-12 validation specification: https://json-schema.org/draft/2020-12/json-schema-validation
- JSON Schema draft-07 validation specification: https://json-schema.org/draft-07/json-schema-validation
- Apache Kafka InvalidTopicException Javadoc: https://kafka.apache.org/36/javadoc/org/apache/kafka/common/errors/InvalidTopicException.html
- Apache Kafka Streams configuration documentation: https://kafka.apache.org/21/streams/developer-guide/config-streams/
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- Python uuid documentation: https://docs.python.org/3/library/uuid.html
- Java UUID API documentation: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/UUID.html
- Java Instant API documentation: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/Instant.html
- Java Language Specification, packages and compilation units: https://docs.oracle.com/javase/specs/jls/se21/html/jls-7.html

## Issues Found
- The JSON Schema example used draft-07 while specifying `format: "uuid"`. Draft-07 does not define `uuid` as a standard format, while JSON Schema 2020-12 does. Updated the `$schema` URI to `https://json-schema.org/draft/2020-12/schema`.
- The Java example omitted imports for `BigDecimal`, `Instant`, `List`, and `UUID`. Added the imports required by the snippet.
- The Java example called `EventMetadata` setter methods that were not defined in the shown code. Added the relevant getters and setters so the example is internally consistent.
- The Java example declared multiple public top-level classes in one snippet. Changed helper classes to package-private top-level classes so the block can be treated as a single compilation unit.
- The Java example referenced `OrderItem` without defining it. Added a small `OrderItem` record to complete the example.
- The Python example used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with `datetime.now(UTC).isoformat().replace("+00:00", "Z")` to produce an aware UTC timestamp string.
- The Python example did not match the post's standard event envelope because order fields were placed beside `metadata` instead of under `data`. Added an `OrderData` dataclass and updated `OrderCreatedEvent` and the usage example to preserve the `metadata`/`data` shape.

## Review Notes
The JSON snippets were parsed successfully. The Python example was checked with `python3 -m py_compile` using Python 3.12.3. Local Java compilation could not be run because `javac` is not installed in this environment; the Java fixes were reviewed against the Java language and API documentation.
