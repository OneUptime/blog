# Validation Summary: How to Design an Effective Schema with Interleaved Tables in Cloud Spanner

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Spanner
- GoogleSQL DDL
- Cloud Spanner interleaved tables
- Cloud Spanner schema design

## Sources Consulted
- Cloud Spanner schemas overview: https://docs.cloud.google.com/spanner/docs/schema-and-data-model
- Cloud Spanner GoogleSQL data definition language reference: https://docs.cloud.google.com/spanner/docs/reference/standard-sql/data-definition-language
- Cloud Spanner pre-splitting overview: https://docs.cloud.google.com/spanner/docs/pre-splitting-overview

## Issues Found
- The post overstated interleaving as a guarantee that parent and child rows always live on the same split or machine. Official Spanner documentation says interleaved rows are usually stored in the same split, but locality can be affected by split size limits and load-based splitting. Updated the wording to describe locality as conditional rather than absolute.
- The post said `ON DELETE` must be specified for interleaved tables. In GoogleSQL, the `ON DELETE` clause for `INTERLEAVE IN PARENT` is optional and defaults to `ON DELETE NO ACTION`. Updated the section to explain the default behavior.
- The post said interleaving cannot be added to an existing table. Current Spanner DDL supports `ALTER TABLE ... SET INTERLEAVE IN [PARENT]` when the table's primary key has the required parent-key prefix and validation succeeds. Updated the migration guidance and kept the new-table migration advice for cases where the primary key shape is incompatible.

## Review Notes
The SQL examples use valid GoogleSQL Spanner DDL for interleaved parent-child tables. The examples intentionally omit foreign key constraints, which is consistent with Spanner guidance that interleaving and foreign keys solve different parent-child modeling needs and generally should not both be used for the same relationship.
