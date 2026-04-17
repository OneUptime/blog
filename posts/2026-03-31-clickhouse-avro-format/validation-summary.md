# Validation Summary: How to Use Avro Format in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (Avro and AvroConfluent input/output formats)
- Apache Avro (binary serialization, schema evolution)
- Apache Kafka (Kafka table engine in ClickHouse)
- Confluent Schema Registry

## Sources Consulted
- [ClickHouse Avro format documentation](https://clickhouse.com/docs/interfaces/formats/Avro)
- [ClickHouse AvroConfluent format documentation](https://clickhouse.com/docs/interfaces/formats/AvroConfluent)
- [ClickHouse Kafka table engine documentation](https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka)
- [ClickHouse table functions reference](https://clickhouse.com/docs/en/sql-reference/table-functions)
- [ClickHouse format settings reference](https://clickhouse.com/docs/en/operations/settings/formats)

## Issues Found

1. **Incorrect DateTime → Avro type mapping.** The original table claimed `DateTime` maps to `long (logicalType: timestamp-millis)`. Per the official Avro format docs, `long (timestamp-millis)` corresponds to `DateTime64(3)` and `long (timestamp-micros)` to `DateTime64(6)`. Updated the row in the type-mapping table to reflect both DateTime64 precisions.

2. **Non-existent `kafka()` table function in producer example.** The "Writing Avro for Kafka Producers" section used `INSERT INTO FUNCTION kafka(...)`, but ClickHouse has no `kafka()` table function — only the Kafka *engine*. Replaced the example with the canonical pattern: create a Kafka engine table for the producer topic and `INSERT` into it.

3. **Misuse of `input_format_avro_allow_missing_fields`.** The schema-evolution section described this setting as handling "extra fields not present in your table." In reality, the setting fills in defaults when the *Avro file* is missing fields that exist in the *ClickHouse table* (the opposite direction). Reworded the explanation to match the documented behavior.

4. **Fabricated functions `avroToClickHouseType` and `formatAvroSchemaOneLine`.** The "Generating an Avro Schema from ClickHouse" section invoked two functions that do not exist in ClickHouse. Rewrote the section to describe how the Avro writer schema is derived automatically from the source query, and showed how to inspect it by writing a sample file and reading the embedded schema with `avro-tools`.

## Review Notes
- The `Avro` and `AvroConfluent` format names, the `format_avro_schema_registry_url` setting, the `input_format_avro_allow_missing_fields` setting, and the Kafka engine `SETTINGS` (`kafka_broker_list`, `kafka_topic_list`, `kafka_group_name`, `kafka_format`) all match the official documentation.
- The remaining type mappings in the table (integers, floats, String, UUID, Date, Array, Map, Nullable) align with the documented Avro ↔ ClickHouse mapping.
- For Avro `boolean` ↔ ClickHouse, the docs note that Avro `boolean` is also accepted into integer columns on insert; the post's `Boolean ↔ boolean` row remains accurate for ClickHouse's `Bool` type and was left unchanged.
- The performance tips and conclusion are general guidance and remain accurate.
