# Validation Summary: How to Model Batch and Streaming Lineage in One Metadata Graph

## Status
validated

## Post Type
Technical architecture guide with JSON metadata examples and illustrative graph relationships.

## Technologies Covered
- OpenLineage object model, event lifecycle, dataset naming, and facets
- Apache Flink 2.x native lineage and checkpoint tracking
- Apache Kafka topics, partitions, offsets, and consumer progress
- Apache Iceberg tables, snapshots, and streaming commits
- Schema Registry subjects, versions, and field lineage
- Metadata graphs, batch pipelines, streaming pipelines, and catalog identity reconciliation
- Delta Lake, Hive, and object storage as contextual examples

## Sources Consulted
- OpenLineage Job Type Job Facet: https://openlineage.io/docs/spec/facets/job-facets/job-type/
- Published Job Type JSON schema: https://openlineage.io/spec/facets/2-0-4/JobTypeJobFacet.json
- OpenLineage object model: https://openlineage.io/docs/spec/object-model/
- OpenLineage naming conventions: https://openlineage.io/docs/spec/naming/
- OpenLineage facets and extensibility: https://openlineage.io/docs/spec/facets/
- OpenLineage Catalog Dataset Facet: https://openlineage.io/docs/spec/facets/dataset-facets/catalog/
- OpenLineage Symlinks Dataset Facet: https://openlineage.io/docs/spec/facets/dataset-facets/symlinks/
- OpenLineage Column Level Lineage Dataset Facet: https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/
- Apache Flink native lineage: https://nightlies.apache.org/flink/flink-docs-stable/docs/internals/data_lineage/
- OpenLineage Flink 2.x integration: https://openlineage.io/docs/integrations/flink/flink2/
- OpenLineage Flink configuration: https://openlineage.io/docs/integrations/flink/configuration/
- Apache Iceberg Flink writes and commit metrics: https://iceberg.apache.org/docs/latest/flink-writes/
- Apache Kafka design and delivery semantics: https://kafka.apache.org/41/design/design/
- Confluent Schema Registry serialization and subject naming: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/index.html

## Issues Found
1. **Dataset identifier examples could be mistaken for standard OpenLineage naming.** The combined Kafka URI used a cluster alias, while the documented Kafka namespace uses a bootstrap server host and port, with the topic supplied separately as the name. The Iceberg URI scheme was also an internal convention. Clarified that the examples are internal graph identifiers and stated the documented Kafka namespace/name convention. Retained the examples and the recommendation to normalize identities across integrations.
2. **Column lineage collection limitations were omitted.** The field-mapping example followed a discussion of Flink native lineage without explaining that the Flink 2.x interfaces do not currently provide column lineage. Added a sentence stating that this mapping needs additional instrumentation or authoritative transformation metadata. The conceptual field graph remains valid.

## Review Notes
- Reviewed the post as a technical guide; its JSON and implementation details require technical validation.
- Both JSON examples were parsed. The Job Type facet fields were checked against the published 2-0-4 schema and official documentation, including STREAMING, FLINK, JOB, PERIODIC, COMPLETE_SNAPSHOT, and a 300-second duration. This was a syntax and field review, not full recursive JSON Schema validation.
- The first JSON example is a job fragment, not a complete transport-ready RunEvent. The second is explicitly an internal observation, not a standard OpenLineage facet. The graph blocks are illustrations, not executable queries. No terminal commands or deployable configuration files are present.
- Stable jobs and datasets, separate execution observations, versioned custom facets, catalog context, and alternative dataset identifiers are consistent with the referenced model. Graph edge labels, deduplication keys, event ordering, freshness policies, and the canary are application design recommendations rather than mandated backend behavior.
- The current OpenLineage pages consulted identify version 1.53.0; the Flink stable lineage page identifies version 2.3.0. Connector support and event tracking are version-dependent. The integration documentation explicitly identifies Kafka support and describes checkpoint-driven RUNNING events; setting an emission pattern does not configure polling or guarantee connector coverage.
- Iceberg documentation confirms that a successful Flink checkpoint can still be followed by a failed Iceberg commit. The post correctly keeps checkpoint evidence separate from sink commit evidence.
- Schema subjects and versions require the actual serialization and subject-naming strategy; a topic need not retain a single schema. Offset ranges and snapshots are useful bounded evidence but do not by themselves establish exact per-record transformation provenance.
- All nine official documentation links in the post resolved to the intended resources. The schema URL was retrieved directly after the browser tool could not open it. The example producer URL is an intentional placeholder, and the Kafka, Iceberg, and S3 identifiers are illustrative resources rather than public web links.
- No live Kafka/Flink/Iceberg pipeline or end-to-end canary was executed. Validation covers documentation accuracy, example syntax, and architectural consistency.
