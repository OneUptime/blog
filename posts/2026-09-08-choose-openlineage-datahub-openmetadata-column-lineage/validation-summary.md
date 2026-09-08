# Validation Summary: OpenLineage vs DataHub vs OpenMetadata for Column-Level Lineage

## Status
validated

## Post Type
Technical comparison and architecture selection guide, with a Python column-mapping example and implementation details about lineage models, ingestion, identity, and reconciliation.

## Technologies Covered
- OpenLineage specification, clients, integrations, DatasetEvent, and lineage facets
- DataHub metadata catalog, Python SDK, lineage APIs, and OpenLineage endpoint
- OpenMetadata catalog, entity-lineage schema, ingestion workflows, and OpenLineage connector
- Python dictionary mappings
- Apache Spark, Airflow, Flink, Kafka, AWS Kinesis, and dbt
- SQL lineage, warehouse query logs, BI metadata, and dataset identity

## Sources Consulted
- OpenLineage overview: https://openlineage.io/docs/
- OpenLineage FAQ, including backend requirements and Marquez: https://openlineage.io/docs/faq/
- Column Level Lineage Dataset Facet and transformation semantics: https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/
- Lineage Dataset Facet and DatasetEvent precedence: https://openlineage.io/docs/spec/facets/dataset-facets/lineage/
- OpenLineage integration capability and compatibility matrices: https://openlineage.io/docs/integrations/
- OpenLineage repository README, checked for the old integration-matrix anchor: https://github.com/OpenLineage/OpenLineage
- OpenLineage naming conventions: https://openlineage.io/docs/spec/naming/
- DataHub lineage features, manual editing, and overwrite caveats: https://docs.datahub.com/docs/features/feature-guides/lineage
- DataHub Python SDK lineage guide: https://docs.datahub.com/docs/api/tutorials/lineage
- DataHub OpenLineage endpoint and configuration: https://github.com/datahub-project/datahub/blob/master/docs/lineage/openlineage.md
- OpenMetadata column lineage and manual editing: https://docs.open-metadata.org/latest/how-to-guides/data-lineage/column
- OpenMetadata lineage overview: https://docs.open-metadata.org/latest/how-to-guides/data-lineage
- OpenMetadata ingestion, views, dbt, query logs, and dashboards: https://docs.open-metadata.org/latest/connectors/ingestion/lineage
- OpenMetadata entity-lineage JSON schema: https://github.com/open-metadata/OpenMetadata/blob/main/openmetadata-spec/src/main/resources/json/schema/type/entityLineage.json
- OpenMetadata lineage REST resource and API annotations: https://github.com/open-metadata/OpenMetadata/blob/main/openmetadata-service/src/main/java/org/openmetadata/service/resources/lineage/LineageResource.java
- OpenMetadata OpenLineage connector, Kafka, and AWS Kinesis: https://docs.open-metadata.org/latest/connectors/pipeline/openlineage
- Python dictionary displays: https://docs.python.org/3/reference/expressions.html#dictionary-displays

## Issues Found
- The OpenLineage integration-matrix link targeted a section no longer present in the repository README. Replaced it with the official integrations page to which the repository now directs readers.
- The matrix description implied a table/column coverage comparison without acknowledging its limitations. Updated the sentence to reflect the capability and compatibility matrices, their explicitly incomplete documentation, and the need to check individual integration guides.
- The OpenMetadata lineage API documentation URL did not resolve successfully during review: browser retrieval failed and a direct HTTP request ended with a 308 redirect error. Replaced it with the verified official REST implementation and its API annotations, adjusting the link label accordingly. API behavior was checked against this source and the entity-lineage schema.
- The assertion that most failed lineage programs have disconnected nodes was an unsupported prevalence claim. Replaced it with the narrower technical observation that disconnected nodes can produce incomplete lineage despite a correct-looking visualization.

## Review Notes
- Reviewed on 2026-09-08. Retrieved documentation identified OpenLineage 1.53.0 and DataHub 1.7.0; OpenMetadata latest links redirected to v2.0.x. GitHub main/master references are moving targets and should be checked against deployed releases.
- Confirmed OpenLineage's role as a specification and integration ecosystem requiring a separate backend. Verified direct and indirect transformation subtypes, descriptions, masking, and the structural Lineage Dataset Facet on DatasetEvent. Its precedence over the column facet is scoped to relationships it describes; this does not imply universal consumer support.
- Confirmed DataHub's downstream-to-upstream dictionary format, strict and fuzzy matching, SQL inference, and upstream/downstream traversal. The Python example parsed and executed successfully and produced the expected dictionary. It illustrates a mapping value; it does not itself send lineage to a server. The SDK accepts such a dictionary through the column_lineage parameter.
- Confirmed the DataHub HTTP endpoint and DATAHUB_OPENLINEAGE_CAPTURE_COLUMN_LEVEL_LINEAGE configuration, as well as the documented preference for native Spark and Airflow integrations where tighter integration is needed.
- Confirmed OpenMetadata columnsLineage, fromColumns, toColumn, function, sqlQuery, and pipeline schema fields, cross-entity lineage APIs, manual editing, and Kafka/Kinesis event consumption.
- Producer ownership and reconciliation are architectural requirements in this post, not automatic guarantees of either catalog. DataHub documents potential manual/automated lineage overwrites and stale edges with incremental ingestion. OpenMetadata exposes lineage override behavior. A deployment must validate preservation and deletion semantics explicitly.
- Evaluation corpus size, scoring criteria, identity tests, cost considerations, and failure drills are engineering recommendations rather than measured product guarantees. No ranking or connector-completeness claim is established by this review.
- The post contains no runnable terminal commands or configuration snippets. Text fences are conceptual diagrams or evaluation criteria. No live catalog, runtime integration, or end-to-end ingestion was deployed; validation consists of official documentation/source checks and execution of the standalone Python mapping example.
