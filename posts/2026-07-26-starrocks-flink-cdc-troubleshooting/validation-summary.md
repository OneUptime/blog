# Validation Summary: Flink CDC to StarRocks Keeps Failing: A Connector and Stream Load Troubleshooting Checklist

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Apache Flink 1.16 through 1.20
- Apache Flink CDC 3.0
- StarRocks Connector for Apache Flink 1.2.4 through 1.2.15
- StarRocks FE, BE, and CN nodes
- StarRocks Primary Key tables
- StarRocks Stream Load and Stream Load transaction interface
- Flink checkpointing and exactly-once sink semantics
- StarRocks Merge Commit
- CDC schema evolution and Fast Schema Evolution
- SQL, Bash, and Flink SQL connector configuration

## Sources Consulted
- [StarRocks Connector for Apache Flink](https://docs.starrocks.io/docs/integrations/streaming/flink/) - connector compatibility matrix, artifact naming, endpoint formats, privileges, sink options, flush policies, exactly-once recovery, Merge Commit, and CDC 3.0 integration.
- [Releases of StarRocks Connector for Flink](https://docs.starrocks.io/releasenotes/flink_connector/) - connector 1.2.8, 1.2.9, 1.2.12, 1.2.14, and 1.2.15 feature and version checks.
- [Apache Flink CDC 3.0 StarRocks Pipeline Connector](https://nightlies.apache.org/flink/flink-cdc-docs-release-3.0/docs/connectors/pipeline-connectors/starrocks/) - Pipeline Connector options, Primary Key requirement, at-least-once delivery guarantee, and supported schema changes.
- [StarRocks Stream Load](https://docs.starrocks.io/docs/loading/StreamLoad/) - Stream Load behavior, data-quality handling, and Merge Commit's StarRocks 3.4.0 version boundary.
- [StarRocks STREAM LOAD reference](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/STREAM_LOAD/) - Stream Load and Merge Commit request properties, `max_filter_ratio`, and conditional updates.
- [StarRocks Stream Load transaction interface](https://docs.starrocks.io/docs/loading/Stream_Load_transaction_interface/) - two-phase transaction states, StarRocks 2.4 support boundary, and `prepared_timeout` behavior.
- [StarRocks Troubleshooting Data Loading](https://docs.starrocks.io/docs/loading/loading_introduction/troubleshooting_loading/) - unified load observability, Load Profiles, error fields, and transaction identifiers.
- [StarRocks `information_schema.loads`](https://docs.starrocks.io/docs/sql-reference/information_schema/loads/) - current load-view columns, `PROFILE_ID`, `RUNTIME_DETAILS`, `TRACKING_SQL`, and `REJECTED_RECORD_PATH`.
- [StarRocks 3.4.5 `information_schema.loads` source](https://github.com/StarRocks/starrocks/blob/3.4.5/docs/en/sql-reference/information_schema/loads.md) - older `DATABASE_NAME` and `TRACKING_URL` schema used to verify the version-specific incompatibility.
- [StarRocks HTTP Interface](https://docs.starrocks.io/docs/administration/http_interface/) - FE `/api/health` endpoint and Stream Load HTTP APIs.
- [StarRocks CREATE TABLE](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/CREATE_TABLE/) - Primary Key DDL, bucket syntax and version behavior, and Fast Schema Evolution restrictions.
- [StarRocks realtime synchronization from MySQL](https://docs.starrocks.io/docs/loading/Flink_cdc_load/) - CDC flow, Primary Key target behavior, and Flink/StarRocks endpoint configuration.
- [Apache Flink 1.20 Stateful Stream Processing](https://nightlies.apache.org/flink/flink-docs-release-1.20/docs/concepts/stateful-stream-processing/) - checkpoint recovery semantics and checkpointing requirements.

## Issues Found
1. **The post mixed two connectors' delivery guarantees.** The ordinary StarRocks Flink sink supports `sink.semantic = exactly-once`, but the Flink CDC StarRocks Pipeline Connector does not support exactly-once; it uses at-least-once delivery with a Primary Key table for idempotent writes. Added a distinction near the version matrix and scoped the exactly-once section to Flink SQL, Table API, and DataStream jobs using the ordinary sink connector.
2. **The Pipeline Connector's Primary Key requirement was understated.** The post said a CDC destination is "usually" a Primary Key table. For the Flink CDC Pipeline Connector, both a source primary key and a StarRocks Primary Key destination are required. Corrected the wording while retaining the more general recommendation for direct Flink CDC jobs.
3. **The StarRocks DDL was not compatible with every StarRocks version discussed.** The post says connector 1.2.15 supports StarRocks 2.1+, but automatic bucket-count selection is available only from StarRocks 2.5.7. Added `BUCKETS 8` so the Primary Key table example remains valid on earlier supported releases.
4. **The load-history query combined incompatible `information_schema.loads` schemas.** It used the current `DB_NAME` field with the older `TRACKING_URL` field, so it would fail on both the current and older documented schemas. Replaced `tracking_url` with current fields `PROFILE_ID`, `RUNTIME_DETAILS`, `TRACKING_SQL`, and `REJECTED_RECORD_PATH`, scoped the shown query to current StarRocks 4.1, and added guidance for the `DATABASE_NAME`/`TRACKING_URL` schema and version-specific facilities on older releases.
5. **`sink.label-prefix` was presented as a hard exactly-once requirement.** StarRocks recommends it for connector 1.2.8+, but exactly-once is not conditional on the option being present. Changed the checklist from "Require" to "Check" and described the unique prefix as recommended.
6. **Prepared-transaction expiry and label-history expiry were conflated.** An expired prepared transaction can cause its data to be lost, while expired label history can prevent the connector from determining whether a transaction committed. Split the explanation to describe the two failure modes accurately.
7. **The at-least-once row-count flush boundary lacked its V1 restriction.** `sink.buffer-flush.max-rows` applies only when `sink.version` is `V1`. Added that restriction to the throughput section.
8. **The Merge Commit server-version requirement was missing.** Connector support begins in 1.2.14, but StarRocks supports Merge Commit from 3.4.0. Added the StarRocks 3.4.0+ requirement and scoped the shown `sink.semantic` configuration to the ordinary sink connector.

## Review Notes
- Connector 1.2.15 is the current documented release as of the validation date. Its official matrix lists Flink 1.16 through 1.20, StarRocks 2.1+, Java 8, and Scala 2.11/2.12.
- The endpoint examples are correct: `jdbc-url` uses the FE query port (normally 9030), while `load-url` uses the FE HTTP port (normally 8030). Flink workers also need network access to the BE/CN HTTP endpoints selected for loading.
- `sink.socket.timeout-ms` is supported from connector 1.2.10, and `sink.sanitize-error-log` is supported from 1.2.12. The post discusses the current connector but operators using older artifacts must account for these option boundaries.
- Flink CDC 3.0 Pipeline Connector documentation limits schema synchronization to adding and dropping columns. Later Flink CDC releases support more schema-change event types, so operators should consult the documentation for their exact CDC and pipeline-connector versions before enabling source DDL automation.
- Fast Schema Evolution must be enabled at table creation for shared-nothing tables and cannot later be enabled through `ALTER TABLE`; shared-data clusters have additional version-specific defaults. The post correctly advises checking how the existing destination table was created.
- Merge Commit is documented as a beta Stream Load optimization and guarantees at-least-once only. The post correctly warns against combining it with exactly-once and against using it with sink parallelism one.
