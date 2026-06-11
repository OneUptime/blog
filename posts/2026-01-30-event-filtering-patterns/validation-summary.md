# Validation Summary: How to Build Event Filtering Patterns

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Event-driven architecture
- Content-based filtering
- Topic-based filtering
- Header-based filtering
- Composite filter logic
- TypeScript
- Python
- Apache Kafka Streams
- AWS EventBridge event patterns

## Sources Consulted
- Apache Kafka Streams DSL API: https://kafka.apache.org/43/documentation/streams/developer-guide/dsl-api
- Apache Kafka `BranchedKStream` Javadoc: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/kstream/BranchedKStream.html
- Apache Kafka deprecated API list for `KStream.branch`: https://kafka.apache.org/39/javadoc/deprecated-list.html
- AWS EventBridge event pattern syntax: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern.html
- AWS EventBridge comparison operators: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern-operators.html
- Python `re` module documentation: https://docs.python.org/3/library/re.html
- Python `dataclasses` documentation: https://docs.python.org/3/library/dataclasses.html
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/intro.html
- MQTT Version 5.0 specification, topic wildcard rules: https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html

## Issues Found
- The TypeScript content-filter example used a custom interface named `Event` and a variable named `event`. In common TypeScript environments with DOM or Node ambient types, those names collide with existing globals. Renamed the interface to `DomainEvent` and the sample variable to `paymentEvent`.
- The Python topic-filter implementation stated that `#` matches zero or more segments and must be last, but the regex conversion did not enforce those rules and `orders.#` did not match `orders`. Updated the conversion logic to validate wildcard placement, escape literal topic segments with `re.escape`, and make `#` match zero or more trailing segments.
- The Python topic-filter docstring used regex backslashes in a way that produced invalid escape warnings. Escaped the backslashes in the explanatory text.
- The Kafka Streams example used the deprecated `KStream.branch(...)` API. Updated it to the current `split(...).branch(...).defaultBranch(...)` API and adjusted the branch routing code to use the returned named branch map.
- The indexed TypeScript example referenced an `Event` type that was not defined in that snippet and would also collide with ambient event types. Added a local `StoredEvent` interface and updated the store methods to use it.

## Review Notes
The Java Kafka Streams snippet still assumes an application-specific `PaymentEvent` domain class with `getAmount()` and `getStatus()` methods, which is appropriate for the example but would need to exist in a real project. The TypeScript snippets were checked with `tsc --strict`; Python snippets were parsed with Python 3.12 and the topic wildcard behavior was exercised directly.
