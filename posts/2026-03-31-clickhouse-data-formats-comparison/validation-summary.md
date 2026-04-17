# Validation Summary: ClickHouse Data Formats Feature Comparison

## Status
validated

## Post Type
Reference / Comparison guide

## Technologies Covered
- ClickHouse (server, clickhouse-client, clickhouse-local)
- CSV / CSVWithNames
- TSV
- JSONEachRow / JSONCompact
- Parquet
- Apache Arrow
- ClickHouse Native format
- RowBinary
- ORC
- Avro / AvroConfluent
- Kafka, Spark, dbt, pandas (integration contexts)

## Sources Consulted
- ClickHouse Formats documentation: https://clickhouse.com/docs/en/interfaces/formats
- ClickHouse Avro format documentation: https://clickhouse.com/docs/en/interfaces/formats/Avro
- ClickHouse Native protocol documentation: https://clickhouse.com/docs/native-protocol/client
- ClickHouse blog "An Introduction to Data Formats in ClickHouse": https://clickhouse.com/blog/data-formats-clickhouse-csv-tsv-parquet-native
- ClickHouse blog "ClickHouse Input format matchup": https://clickhouse.com/blog/clickhouse-input-format-matchup-which-is-fastest-most-efficient

## Issues Found
- Avro row in the formats overview table incorrectly stated `Yes (registry)` for schema and `Kafka schema registry` for best-for. The standard ClickHouse `Avro` format expects self-describing messages with an embedded schema; only the separate `AvroConfluent` format integrates with the Confluent Schema Registry. Updated the row to `Yes (embedded)` and clarified the best-for as `Kafka, schema registry (AvroConfluent)` so readers know which format to choose for registry workflows.

## Review Notes
- The "70+ formats" claim is accurate based on the official format reference, which lists well over seventy input/output variants.
- The CSV/JSONEachRow/Parquet/Native CLI examples use correct `clickhouse-client` invocation patterns, valid format names, and valid `INTO OUTFILE ... FORMAT ...` and `file(...)` table function syntax.
- The statement that Native is the format used by the ClickHouse client by default is correct in the wire-protocol sense (clickhouse-client uses the native TCP protocol on port 9000 and Native data format internally). Note that the displayed output format in interactive mode is `PrettyCompact` and in batch mode is `TabSeparated`; this is a separate concern from the wire format and the post's framing remains accurate.
- Parquet and ORC do have built-in compression (Snappy/Zstd/Gzip etc.), and ClickHouse passes through these codecs, so the table entries are correct.
