# Validation Summary: How to Create and Query Views in Cloud Spanner

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Spanner
- Cloud Spanner GoogleSQL DDL and query syntax
- Cloud Spanner views
- Cloud Spanner fine-grained access control concepts
- Cloud Spanner secondary indexes
- Node.js
- `@google-cloud/spanner` Node.js client library

## Sources Consulted
- Google Cloud Spanner documentation: Create and manage views, https://docs.cloud.google.com/spanner/docs/create-manage-views
- Google Cloud Spanner documentation: Views overview, https://docs.cloud.google.com/spanner/docs/views
- Google Cloud Spanner documentation: GoogleSQL data definition language, https://docs.cloud.google.com/spanner/docs/reference/standard-sql/data-definition-language
- Google Cloud Spanner documentation: Timestamp functions in GoogleSQL, https://docs.cloud.google.com/spanner/docs/reference/standard-sql/timestamp_functions
- Google Cloud Spanner documentation: Information schema for GoogleSQL-dialect databases, https://docs.cloud.google.com/spanner/docs/information-schema
- Google Cloud Node.js client library documentation: Spanner Database class, https://cloud.google.com/nodejs/docs/reference/spanner/latest/spanner/database

## Issues Found
- The post said Cloud Spanner currently requires `SQL SECURITY INVOKER` for all views. Current Cloud Spanner documentation requires every view to specify either `SQL SECURITY INVOKER` or `SQL SECURITY DEFINER`. Updated the explanation and limitations list accordingly.
- The access-control bullet implied that read access to a view can hide underlying tables without qualifying the security model. In Spanner, that behavior requires a definer's rights view with fine-grained access control; invoker's rights views also require privileges on underlying schema objects. Updated the bullet to state that distinction.
- The sample table DDL had trailing commas in column lists and a comment that implied a foreign key was defined when the schema only included a `CustomerId` column. Removed the trailing commas and adjusted the comment to avoid claiming an undeclared foreign key constraint.

## Review Notes
The remaining SQL examples match documented Cloud Spanner GoogleSQL view, `TIMESTAMP_SUB`, `INFORMATION_SCHEMA.VIEWS`, and secondary-index syntax. The Node.js example follows the current `@google-cloud/spanner` `database.run(query)` and `row.toJSON()` usage pattern. The post uses invoker's rights views in examples; a future expansion could include a small `SQL SECURITY DEFINER` example with `GRANT SELECT ON VIEW` to demonstrate the access-control use case more concretely.
