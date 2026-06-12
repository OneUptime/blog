# Validation Summary: How to Implement Debezium Transformations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Debezium (Single Message Transformations / SMTs)
- Apache Kafka Connect (built-in transforms: RegexRouter, MaskField, ReplaceField, TimestampConverter, InsertField; predicates: RecordIsTombstone, TopicNameMatches)
- Change Data Capture (CDC) event envelope (`before`, `after`, `source`, `op`, `ts_ms`)
- Groovy scripting via JSR-223 (used by the Debezium Filter SMT)
- Java (custom SMT implementation against the `Transformation<R>` interface)
- Maven (packaging custom transforms)

## Sources Consulted
- Debezium Message Filtering: https://debezium.io/documentation/reference/stable/transformations/filtering.html
- Debezium New Record State Extraction (ExtractNewRecordState): https://debezium.io/documentation/reference/stable/transformations/event-flattening.html
- Debezium ByLogicalTableRouter: https://debezium.io/documentation/reference/stable/transformations/topic-routing.html
- Kafka Connect InsertField SMT (Confluent docs): https://docs.confluent.io/kafka-connectors/transforms/current/insertfield.html
- Kafka Connect ReplaceField, MaskField, TimestampConverter, RegexRouter SMTs (Apache Kafka docs / Confluent transforms reference)
- Kafka Connect predicates (RecordIsTombstone, TopicNameMatches): Apache Kafka 2.6+ release notes / Kafka Connect documentation
- Debezium operation codes (`c`, `u`, `d`, `r`, `t`): Debezium connector event format reference

## Issues Found

1. **Filter SMT condition semantics inverted (multiple places).** The Debezium Filter SMT keeps records where the condition evaluates to `true` and discards where it evaluates to `false`. Several example conditions were inverted relative to the intent stated in their comments:
   - "Filter out DELETE operations" had `value.op == 'd'` (which actually keeps only deletes). Fixed to `value.op != 'd'` and added a clarifying comment about the keep-on-true semantics.
   - "Exclude audit_log table" had `value.source.table == 'audit_log'`. Fixed to `value.source.table != 'audit_log'`.
   - "Only capture orders with status = 'completed'" had `value.after == null || value.after.status != 'completed'`. Fixed to `value.after != null && value.after.status == 'completed'`.
   - In the chained transformation example, "Filter out test data" had `value.after != null && value.after.environment == 'test'`. Fixed to `value.after == null || value.after.environment != 'test'`.
   - In the performance/best-practices example, the filter described as dropping unwanted records was written as `value.source.table == 'temp_data'`, which would keep only temp_data. Fixed to `!= 'temp_data'`.

2. **`delete.handling.mode=rewrite` description was wrong.** The comment said it sets the value to null (tombstone). In fact, `rewrite` keeps the record and adds a `__deleted=true` flag while preserving primary-key fields (other fields are nulled). A null-value tombstone is what the separate `tombstone` mode / `drop.tombstones=false` controls. Fixed the comment to describe the actual behavior.

3. **InsertField `timestamp.field` description was misleading.** The comment said "Insert current timestamp as processing time." The Kafka Connect `InsertField` SMT inserts the Kafka record's existing metadata timestamp (which is set upstream by the producer or broker `CreateTime`); it does not call wall-clock now. Fixed the comment to clarify this.

## Review Notes

- The post uses Debezium's older property names `delete.handling.mode` and `drop.tombstones`. In Debezium 2.x these have been consolidated into `delete.tombstone.handling.mode`. The old names still work but are deprecated; future updates of this post could mention the newer property.
- The predicate `isInsert` is defined as `RecordIsTombstone` with `negate=true`. This matches all non-tombstone records (not strictly inserts — also updates and non-tombstone delete events). The name is slightly misleading but the predicate itself is valid. Left unchanged since it's only illustrative.
- The Debezium Filter SMT requires the Groovy JSR-223 engine (`groovy`, `groovy-jsr223`) to be added to the Kafka Connect classpath; it is not bundled. The post does not mention this prerequisite. Worth adding in a future revision.
- The custom transformation example skips records with a null value (treating them as tombstones), but does not handle the case where `record.value()` is a non-`Struct` type (e.g., schemaless JSON). For a production-grade transform, additional guards would be useful, but the example is clearly illustrative.
- The class names for built-in SMTs (`RegexRouter`, `MaskField$Value`, `ReplaceField$Value`, `TimestampConverter$Value`, `InsertField$Value`, `ByLogicalTableRouter`, `Filter`, `ExtractNewRecordState`) and predicates (`RecordIsTombstone`, `TopicNameMatches`) were all verified against current documentation and are correct.
