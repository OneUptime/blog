# OpenLineage vs DataHub vs OpenMetadata for Column-Level Lineage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Lineage, OpenLineage, DataHub, Data Catalog, Metadata

Description: Choose a lineage event standard, metadata catalog, or combined architecture by testing real column mappings and operating requirements.

---

OpenLineage, DataHub, and OpenMetadata are often placed in one feature checklist, but they are not three interchangeable products. OpenLineage is primarily a specification plus clients and integrations for emitting lineage metadata. DataHub and OpenMetadata are metadata platforms that store, query, visualize, and govern a broader catalog.

The first decision is therefore architectural:

```text
Do you need a portable lineage emission contract,
a metadata product for users,
or both?
```

For many teams, the answer is both: OpenLineage at runtime and a catalog as one of its consumers, supplemented by native catalog connectors.

## Compare their roles before their feature lists

| Dimension | OpenLineage | DataHub | OpenMetadata |
| --- | --- | --- | --- |
| Primary role | Open lineage event specification and integrations | Metadata platform and graph | Metadata platform and graph |
| Own metadata server and UI | No; use a compatible backend such as Marquez | Yes | Yes |
| Runtime model | Jobs, runs, datasets, events, and facets | Data flows, jobs, datasets, queries, and broader metadata entities | Pipelines, tasks, datasets, lineage edges, and broader metadata entities |
| Column-lineage form | Standard dataset facets with transformation semantics | Fine-grained dataset lineage and SDK mappings | Column mappings in lineage details, with optional function, SQL, and pipeline context |
| Collection style | Push events from instrumented jobs and engines | Native ingestion, APIs, SDKs, plugins, and OpenLineage endpoint | Native ingestion, APIs, SDKs, query-log workflows, and OpenLineage connector |
| Broader catalog workflows | Outside core scope | Search, ownership, governance, impact, and other catalog capabilities | Search, ownership, governance, quality, impact, and other catalog capabilities |

OpenLineage's own FAQ explicitly says it is not a metadata server. Do not choose it alone and then discover that you still need storage, search, access control, reconciliation, and a user interface.

## Understand the column models

### OpenLineage

The Column Level Lineage Dataset Facet maps each output field to input fields. Transformation entries distinguish:

- direct `IDENTITY`, `TRANSFORMATION`, and `AGGREGATION`
- indirect `JOIN`, `GROUP_BY`, `FILTER`, `SORT`, `WINDOW`, and `CONDITIONAL`

Each transformation can include a description and masking flag. This is the strongest reason to use OpenLineage as a producer contract when several consumers need consistent runtime semantics.

Current OpenLineage also defines a Lineage Dataset Facet for structural relationships on `DatasetEvent`, including field inputs when no natural run owns the relationship. That facet supersedes the older column facet for relationships it describes on the dataset event. A proof of concept should test the event forms and facet versions your chosen backend actually accepts.

The standard does not make every integration complete. The official integration documentation describes differing capabilities and source compatibility; its matrices are incomplete, so confirm column coverage in the specific integration guide. Custom Spark logical-plan nodes, dynamic SQL, procedures, and unsupported streaming connectors can still create gaps.

### DataHub

DataHub's lineage APIs support table and column lineage. The current Python SDK guide documents custom downstream-to-upstream column mappings, strict same-name mapping, fuzzy mapping, SQL inference, and upstream or downstream retrieval across hops.

A custom mapping is explicit:

```python
column_mapping = {
    "customer_key": ["customer_id"],
    "net_revenue": ["gross_amount", "discount_amount"],
}
```

Use fuzzy mapping only as a reviewed bootstrap. Similar names are not proof that one value derives from another.

DataHub also documents an OpenLineage HTTP endpoint. Its current configuration includes a switch for capturing column-level lineage. DataHub's own Spark and Airflow integrations may offer tighter platform-specific behavior, so compare the generic and native paths with the same fixture corpus.

### OpenMetadata

OpenMetadata's lineage API can create table-to-table and cross-entity edges. For a table edge, lineage details can include `columnsLineage`, a SQL query, and a pipeline reference. The published schema defines each column mapping with one or more fully qualified source columns, a destination column, and an optional transformation function.

OpenMetadata can derive lineage through supported connector workflows, query logs, view definitions, and dbt metadata, and it supports manual table and column lineage. Its OpenLineage connector consumes events from Kafka or AWS Kinesis and translates them into OpenMetadata lineage.

Connector capability varies by source and release. Confirm table, column, procedure, dashboard, and runtime support in the exact connector documentation and deployed version.

## Choose OpenLineage when interoperability is the main requirement

OpenLineage is a strong fit when:

- multiple runtimes need one emission contract
- several consumers need the same lineage events
- job and run lifecycle is as important as static topology
- you want producers decoupled from a catalog vendor
- transformation types must cross system boundaries

A typical architecture is:

```text
Airflow / Spark / dbt / Flink
          -> OpenLineage events
          -> Kafka or HTTP
          -> one or more lineage backends
```

You still need to select and operate a backend. You may also need native crawlers for warehouse schemas, BI assets, historical query logs, owners, and quality metadata not present in runtime events.

## Choose a catalog when people need to work with lineage

DataHub or OpenMetadata is the relevant category when users need:

- search and discovery
- graph traversal and impact analysis
- ownership, domains, glossary, and tags
- manual correction workflows
- connector scheduling and stale-asset handling
- APIs for reading and changing metadata
- joins between lineage, usage, quality, and incidents

Do not decide between them from screenshots or connector counts. A listed connector can support schema ingestion but not column lineage for the exact object types you use.

Choose the platform whose tested ingestion and operating model fit your estate. The winning proof of concept should correctly resolve your hardest identifiers and transformations, not simply ingest the largest number of easy tables.

## Use a combined architecture when runtime and catalog evidence differ

A practical deployment often looks like this:

```text
runtime jobs -> OpenLineage -> catalog
warehouse query history ----> catalog native connector
BI metadata API -------------> catalog native connector
dbt manifest ----------------> catalog native connector
manual stewardship ----------> catalog workflow
```

Keep producer-scoped assertions so a runtime event does not erase manually curated lineage and a full native snapshot can retire only the edges it owns.

OpenLineage provides recent execution evidence. Native crawlers can recover assets that did not run during the event-retention window, expand platform-specific objects, and connect dashboards. The catalog becomes the reconciled graph, not a blind copy of the last input.

## Build a representative evaluation corpus

Before choosing, create 15 to 30 transformations from your real dialects and engines:

- identity rename
- arithmetic with two source fields
- aggregate and `COUNT(*)`
- join key not selected
- filter and conditional fields
- window partition and ordering
- nested struct or JSON field
- `SELECT *` with schema evolution
- view over another view
- multi-statement temporary tables
- stored procedure with dynamic SQL
- Spark DataFrame operations
- one Kafka or Flink stream if applicable
- warehouse table to BI measure

For each case, write expected table edges, column mappings, transformation roles, and unresolved boundaries. Run the same corpus through each proposed ingestion path.

Score at least:

```text
table edge precision and recall
column mapping precision and recall
indirect influence coverage
stable identity match across connectors
time from execution to searchable graph
idempotence and stale-edge cleanup
unresolved constructs reported honestly
```

Do not reward a system for inventing a column edge where the evidence is insufficient.

## Test identity more aggressively than the UI

Disconnected nodes can make lineage incomplete even when the graph view looks correct. Test whether these producers agree on identity:

- Spark JDBC dataset and warehouse crawler table
- object-store path and Iceberg catalog table
- dbt relation and warehouse relation
- BI gateway alias and physical database
- development and production objects with the same name
- quoted and unquoted fields

OpenLineage defines namespace and naming conventions. DataHub uses platform-scoped URNs. OpenMetadata uses fully qualified entity names and service identities. Whatever stack you choose, document one canonicalization policy and a reviewed alias mechanism.

## Compare operating costs and failure modes

Measure a realistic deployment rather than assuming open source means zero cost. Include:

- catalog databases, search infrastructure, queues, backups, and upgrades
- ingestion workers and source credentials
- event retention and replay
- high-fan-out graph query latency
- schema and connector compatibility testing
- access control and sensitive SQL handling
- on-call ownership and disaster recovery

Run failure drills:

1. Drop or delay lineage events.
2. Revoke a crawler permission so a source appears empty.
3. Rename a dataset.
4. Replay duplicate events out of order.
5. Upgrade a parser and compare the graph.
6. Remove a column and verify downstream impact.

The best choice is the one your team can detect, rebuild, and explain under those conditions.

## Use a decision rule

Choose **OpenLineage as the foundation** when portable runtime emission and multiple consumers are central. Pair it with a backend for storage and exploration.

Choose **DataHub** when its metadata model, ingestion paths, APIs, and lineage workflows win your corpus and your team is comfortable operating or buying its platform model.

Choose **OpenMetadata** when its schema-first catalog, connector workflows, lineage API, and integrated quality and governance experience win the same tests.

Choose **OpenLineage plus DataHub or OpenMetadata** when runtime interoperability and a full catalog are both requirements. This is not redundant if producer ownership and reconciliation are designed explicitly.

## Conclusion

OpenLineage is a lineage contract, while DataHub and OpenMetadata are metadata products. Evaluate them at the correct architectural layer. Test real column transformations, connector identity, stale-edge behavior, runtime latency, and operations. The right stack is the smallest one that accurately captures your difficult lineage and remains explainable when collection fails.

## Official Documentation

- [OpenLineage overview and scope](https://openlineage.io/docs/)
- [OpenLineage FAQ](https://openlineage.io/docs/faq/)
- [OpenLineage Column Level Lineage Dataset Facet](https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/)
- [OpenLineage Lineage Dataset Facet](https://openlineage.io/docs/spec/facets/dataset-facets/lineage/)
- [OpenLineage integration matrix](https://openlineage.io/docs/integrations/)
- [DataHub lineage feature guide](https://docs.datahub.com/docs/features/feature-guides/lineage)
- [DataHub lineage SDK guide](https://docs.datahub.com/docs/api/tutorials/lineage)
- [DataHub OpenLineage integration](https://github.com/datahub-project/datahub/blob/master/docs/lineage/openlineage.md)
- [OpenMetadata column-level lineage](https://docs.open-metadata.org/latest/how-to-guides/data-lineage/column)
- [OpenMetadata lineage API implementation](https://github.com/open-metadata/OpenMetadata/blob/main/openmetadata-service/src/main/java/org/openmetadata/service/resources/lineage/LineageResource.java)
- [OpenMetadata entity-lineage schema](https://github.com/open-metadata/OpenMetadata/blob/main/openmetadata-spec/src/main/resources/json/schema/type/entityLineage.json)
- [OpenMetadata OpenLineage connector](https://docs.open-metadata.org/latest/connectors/pipeline/openlineage)
