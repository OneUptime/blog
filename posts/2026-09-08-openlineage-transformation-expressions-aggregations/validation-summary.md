# Validation Summary: How to Add Transformation Expressions and Aggregations to OpenLineage Metadata

## Status
validated

## Post Type
Technical guide with SQL expressions, JSON metadata examples, and Spark configuration properties.

## Technologies Covered
- OpenLineage column lineage, transformation records, and JSON Schema
- OpenLineage RunEvent, DatasetEvent, and SQL job facet
- Apache Spark OpenLineage integration
- SQL and PostgreSQL

## Sources Consulted
- OpenLineage column lineage: https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/
- Column lineage schema 1-2-0: https://openlineage.io/spec/facets/1-2-0/ColumnLineageDatasetFacet.json
- Event schema 2-0-2: https://openlineage.io/spec/2-0-2/OpenLineage.json
- Structural lineage facet: https://openlineage.io/docs/spec/facets/dataset-facets/lineage/
- Facets and extensibility: https://openlineage.io/docs/spec/facets/
- Object model: https://openlineage.io/docs/spec/object-model/
- Schema validation: https://openlineage.io/docs/spec/schemas/
- Dataset naming: https://openlineage.io/docs/spec/naming/
- Spark configuration: https://openlineage.io/docs/integrations/spark/configuration/spark_conf/
- Spark column lineage: https://openlineage.io/docs/integrations/spark/spark_column_lineage/
- SQL job facet: https://openlineage.io/docs/spec/facets/job-facets/sql/
- PostgreSQL schemas: https://www.postgresql.org/docs/current/ddl-schemas.html
- PostgreSQL select-list aliases: https://www.postgresql.org/docs/current/queries-select-lists.html
- PostgreSQL aggregates: https://www.postgresql.org/docs/current/functions-aggregate.html
- PostgreSQL conditionals: https://www.postgresql.org/docs/current/functions-conditional.html
- PostgreSQL windows: https://www.postgresql.org/docs/current/tutorial-window.html
- PostgreSQL hashing and text-to-byte conversion: https://www.postgresql.org/docs/current/functions-binarystring.html

## Issues Found
- Dataset identifiers did not match the SQL. The SQL uses analytics and raw as schemas, while the JSON treated them as separate databases with public schemas. Specified a warehouse database and changed names to warehouse.analytics.daily_sales and warehouse.raw.orders. Changed the namespace scheme to postgres:// to follow OpenLineage naming conventions.
- The event-envelope explanation omitted required schemaURL and incorrectly presented eventType and inputs as required JSON Schema properties. Listed the actual required fields and explained where outputs and the source input belong. Run-state lifecycle requirements remain distinct from JSON Schema required properties.
- The gross_margin SQL example used assignment-style syntax. Changed it to an expression followed by AS gross_margin, consistent with PostgreSQL select-list syntax.
- SHA256(LOWER(email)) passes text to PostgreSQL's bytea hash function. Added CONVERT_TO(..., 'UTF8') in both descriptions to make the expression valid for the database used in the example.
- COUNT(*) guidance suggested a per-input transformation description despite having no direct input field. Clarified that the source belongs in RunEvent inputs and that the query can be retained in the SQL job facet.
- Event schema validation alone does not resolve and validate arbitrary facet schemas from their _schemaURL values. Added explicit validation of each facet against its schema.

## Review Notes
- Reviewed against the official documentation served as OpenLineage 1.53.0 and PostgreSQL 18. Configuration defaults and structural-facet support should be checked when using older producers or consumers.
- Confirmed the documented direct and indirect subtype vocabulary, compact dataset dependencies, masking semantics, description configuration, and structural lineage placement. The core distinctions between value contributions and filter, join, grouping, conditional, and window influences are sound.
- Both JSON blocks were parsed and checked against the applicable official schema definitions. The output example was also checked inside a constructed RunEvent envelope with its source dataset. This is schema validation, not an end-to-end Spark emission test.
- SQL was reviewed against PostgreSQL documentation; no live database or Spark job was executed. Expression snippets require their surrounding SELECT and suitably typed source fields. The default ordered window frame includes peers with equal ordering values.
- The six official documentation links and the referenced facet schema resolve to the intended resources. The example warehouse and producer URLs are illustrative placeholders, not deployment endpoints.
- No terminal commands are present. No deprecated transformation fields are used. Leaving COUNT(*) without fabricated direct field edges is intentional; dataset-wide influences still apply.
