# Validation Summary: Why Geode Continuous Queries Fail with Serialization Mismatches

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Apache Geode continuous queries (CQ)
- Apache Geode Object Query Language (OQL)
- Apache Geode Portable Data eXchange (PDX) serialization
- Apache Geode `gfsh`
- Java client and server APIs
- Apache Geode integrated security and method invocation authorization

## Sources Consulted
- [Implementing Continuous Querying](https://geode.apache.org/docs/guide/latest/developing/continuous_querying/implementing_continuous_querying.html)
- [How Continuous Querying Works](https://geode.apache.org/docs/guide/latest/developing/continuous_querying/how_continuous_querying_works.html)
- [Managing Continuous Querying](https://geode.apache.org/docs/guide/latest/developing/continuous_querying/continuous_querying_whats_next.html)
- [Requirements for Using Custom Classes in Data Caching](https://geode.apache.org/docs/guide/latest/basic_config/data_entries_custom_classes/using_custom_classes.html)
- [Querying with OQL: WHERE Clause](https://geode.apache.org/docs/guide/latest/developing/query_select/the_where_clause.html)
- [Programming Your Application to Use PdxInstances](https://geode.apache.org/docs/guide/latest/developing/data_serialization/program_application_for_pdx.html)
- [Geode PDX Serialization Features](https://geode.apache.org/docs/guide/latest/developing/data_serialization/PDX_Serialization_Features.html)
- [Persisting PDX Metadata to Disk](https://geode.apache.org/docs/guide/latest/developing/data_serialization/persist_pdx_metadata_to_disk.html)
- [`configure pdx` command](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/configure.html)
- [`deploy` command](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/deploy.html)
- [Deploying Application JARs to Apache Geode Members](https://geode.apache.org/docs/guide/latest/configuring/cluster_config/deploying_application_jars.html)
- [Implementing Authorization](https://geode.apache.org/docs/guide/latest/security/implementing_authorization.html)
- [`CqQuery` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/query/CqQuery.html)
- [`CqEvent` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/query/CqEvent.html)
- [`Operation` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/Operation.html)
- [`PdxInstance` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/pdx/PdxInstance.html)
- [`FieldType` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/pdx/FieldType.html)

## Issues Found
No technical issues found.

## Review Notes
- The post correctly limits CQs to their supported single-region `SELECT *` form and correctly excludes projections, bind parameters, ordering, grouping, aggregates, cross-region joins, and nested-collection drill-downs.
- The Java examples use current Geode APIs. `CqQuery.stop()` is required before executing an already-running CQ again, and `executeWithInitialResults()` may require a larger pool read timeout for a large or complex result set.
- The `gfsh` commands and options shown (`deploy --jars`, `list deployed`, `start server --classpath`, and `configure pdx --read-serialized=true`) match the official command reference.
- The PDX guidance correctly distinguishes field addition/removal from changing an existing field's physical type, and correctly calls for persistent PDX metadata with persistent regions or gateway senders.
- The permissions stated for CQ creation and execution match Geode's authorization table. Method calls in query expressions remain subject to the configured method invocation authorizer.
- The post targets the current Geode documentation rather than pinning a release. Readers maintaining an older deployment should consult the matching archived guide because available APIs, security defaults, and command behavior can vary by release.
