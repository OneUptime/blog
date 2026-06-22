# Validation Summary: How to Join Streams and Tables in Kafka Streams

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Apache Kafka
- Kafka Streams DSL
- Java
- KStream, KTable, and GlobalKTable joins
- Join windows and repartitioning

## Sources Consulted
- Apache Kafka Streams DSL Developer Guide: https://kafka.apache.org/40/streams/developer-guide/dsl-api/
- Apache Kafka Streams KStream Javadoc: https://kafka.apache.org/40/javadoc/org/apache/kafka/streams/kstream/KStream.html
- Apache Kafka Streams KTable Javadoc: https://kafka.apache.org/40/javadoc/org/apache/kafka/streams/kstream/KTable.html
- Apache Kafka Streams JoinWindows Javadoc: https://kafka.apache.org/40/javadoc/org/apache/kafka/streams/kstream/JoinWindows.html
- Oracle Java Records documentation: https://docs.oracle.com/en/java/javase/17/language/records.html

## Issues Found
- Java record accessor methods were used incorrectly in several snippets. The post declared `Transaction`, `Customer`, `ExchangeRate`, and `Order` as Java records, but examples called JavaBean-style getters such as `getCustomerId()`, `getName()`, `getCurrency()`, and `getRateToUSD()`. Updated those examples to use record accessors such as `customerId()`, `name()`, `currency()`, and `rateToUSD()`.
- The KStream-KTable left join example constructed `EnrichedTransaction` with `(transaction, customer)` and `(transaction, null)`, but the declared record constructor expects `(Transaction, String, String, String)`. Updated the joiner to pass customer fields or null field values.
- The GlobalKTable exchange-rate example used a `Transaction` currency lookup but the declared `Transaction` record did not contain a currency field. Added a `currency` component to the record declaration so the key mapper is coherent.
- The co-partitioning section stated that all non-global joins require co-partitioning. Kafka Streams documents KTable-KTable foreign-key joins as another exception. Updated the wording to limit the requirement to KStream-KStream, KStream-KTable, and primary-key KTable-KTable joins.
- The click/purchase join window used `.before(Duration.ofMinutes(30)).after(Duration.ZERO)` while the comment said clicks must precede purchases. For `clicks.join(purchases, ...)`, that window allowed purchases before clicks. Reversed the bounds to `.before(Duration.ZERO).after(Duration.ofMinutes(30))`.
- The best-practice snippet claimed `builder.build().describe()` verifies co-partitioning at runtime. Kafka Streams only partially verifies partition counts during assignment; `Topology.describe()` is useful for inspecting repartition nodes. Updated the comment accordingly.

## Review Notes
The post uses illustrative snippets with placeholder serdes, configuration helpers, and domain classes such as `orderSerde`, `getConfig()`, `UserProfile`, and `CompleteUser`. Those are acceptable for a blog tutorial, but a future improvement would be to state that the examples omit boilerplate serde and configuration definitions.
