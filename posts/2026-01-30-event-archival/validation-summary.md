# Validation Summary: How to Build Event Archival

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Event archival and retention policies
- TypeScript
- PostgreSQL
- Mermaid diagrams
- Object storage / S3-style cold storage
- Apache Parquet, JSON, Avro
- gzip, Zstandard, Snappy compression
- Node.js cron scheduling

## Sources Consulted
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- PostgreSQL UUID functions: https://www.postgresql.org/docs/current/functions-uuid.html
- PostgreSQL CREATE TABLE documentation: https://www.postgresql.org/docs/current/sql-createtable.html
- Apache Parquet compression documentation: https://parquet.apache.org/docs/file-format/data-pages/compression/
- Mermaid ER diagram syntax: https://mermaid.ai/open-source/syntax/entityRelationshipDiagram.html
- cron package documentation: https://github.com/kelektiv/node-cron

## Issues Found
- The archive worker built the same storage path for every batch in a partition, while the SQL schema enforced uniqueness on `(event_type, partition_key)`. That would either overwrite archive objects or reject later batches for the same day/week/month. Updated the path to include a per-batch suffix and changed the SQL uniqueness constraint to `storage_location`.
- The archive index used `batch.events[0]` and the last array element for min/max timestamps without ensuring event order. Sorted events by timestamp before writing and indexing so the metadata is correct.
- The worker deleted events from hot storage immediately after writing the archive, while the best practices section says to verify the archive before deletion. Added an archive verification step before index update and hot deletion.
- The Mermaid ER diagram used `INDEX_FIELD_VALUES`, while the SQL table was named `archive_field_values`. Renamed the diagram entity to `ARCHIVE_FIELD_VALUES` for consistency.

## Review Notes
The code remains illustrative and assumes project-specific implementations for `EventStore`, `ArchiveWriter`, `ArchiveIndex`, `ObjectStorage`, and Parquet parsing. The compression-ratio ranges are reasonable directional examples, but real ratios depend heavily on schema, cardinality, encoding, and data distribution.
