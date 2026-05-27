# Validation Summary: How to Use Foreign Keys and Interleaved Tables in Cloud Spanner for Efficient

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Spanner
- GoogleSQL DDL
- Foreign keys
- Interleaved tables
- Parent-child schema design

## Sources Consulted
- Google Cloud Spanner schema and data model: https://cloud.google.com/spanner/docs/schema-and-data-model
- Google Cloud Spanner foreign keys overview: https://cloud.google.com/spanner/docs/foreign-keys/overview
- Google Cloud Spanner create and manage foreign key relationships: https://cloud.google.com/spanner/docs/foreign-keys/how-to
- Google Cloud Spanner GoogleSQL data definition language reference: https://cloud.google.com/spanner/docs/reference/standard-sql/data-definition-language
- Google Cloud Spanner quotas and limits: https://cloud.google.com/spanner/quotas

## Issues Found
- The post described interleaved reads as requiring only a single node or always reading from a single location. Google documents interleaved rows as usually stored in the same split and says primary-key joins can be local, but split boundaries can still be added for size or hotspot reasons. Updated the wording to avoid guaranteeing a single-node or always single-split read.
- The opening said foreign keys and interleaved tables both enforce referential integrity. This is correct for enforced foreign keys and `INTERLEAVE IN PARENT`, but Spanner also supports `INTERLEAVE IN` without parent enforcement. Clarified the statement to refer specifically to enforced foreign keys and `INTERLEAVE IN PARENT`.
- The query comment described an `ORDER BY OrderDate DESC` query as a simple single-split range scan. The `CustomerId` predicate reads the relevant key range, but ordering by `OrderDate` is not covered by the shown primary key and can require sorting unless an appropriate index exists. Updated the comment.
- The post suggested combining foreign keys and interleaving without warning against using both for the same parent-child relationship. Google recommends choosing either interleaving or foreign keys for the same relationship because using both is redundant and can add storage and compute overhead. Added that caveat while preserving the cross-cutting foreign key example.
- The post cited a current split size of around 4GB. The official quotas page does not publish that as a current production limit, and the schema documentation describes split size behavior without a numeric value. Replaced the numeric claim with a source-aligned explanation of split size limits and hotspot splitting.

## Review Notes
The SQL examples use valid GoogleSQL-style Spanner DDL syntax, including table constraints, composite primary keys for interleaved child tables, `INTERLEAVE IN PARENT`, and `ON DELETE CASCADE`. The examples are conceptual snippets rather than a complete executable migration because the final cross-cutting example assumes the `Orders` parent table from the earlier schema exists.
