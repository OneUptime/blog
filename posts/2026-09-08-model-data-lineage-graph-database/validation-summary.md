# Validation Summary: How to Model Data Lineage in a Graph Database for Fast Traversal

## Status
validated

## Post Type
Technical guide with Cypher schema, ingestion, traversal, and cycle-detection examples.

## Technologies Covered
- Neo4j property graphs and constraints
- Cypher: MERGE, temporal properties, variable-length paths, aggregation, EXPLAIN, and PROFILE
- Data lineage, metadata identity, provenance, and temporal modeling
- OpenLineage naming, object model, and column lineage
- OpenMetadata Lineage API

## Sources Consulted
- Neo4j MERGE: https://neo4j.com/docs/cypher-manual/current/clauses/merge/
- Neo4j constraints: https://neo4j.com/docs/cypher-manual/current/schema/constraints/
- Neo4j constraint creation: https://neo4j.com/docs/cypher-manual/current/schema/constraints/create-constraints/
- Neo4j 5 release changelog (relationship uniqueness introduced in 5.7): https://github.com/neo4j/neo4j/wiki/Neo4j-5-changelog
- Neo4j property value types: https://neo4j.com/docs/cypher-manual/current/values-and-types/property-structural-constructed/
- Neo4j temporal functions: https://neo4j.com/docs/cypher-manual/current/functions/temporal/
- Neo4j variable-length paths: https://neo4j.com/docs/cypher-manual/current/patterns/reference/variable-length-paths/
- Neo4j repeated nodes and relationships: https://neo4j.com/docs/cypher-manual/current/patterns/repeatable-node-and-relationship-paths/
- Neo4j shortest paths: https://neo4j.com/docs/cypher-manual/current/patterns/shortest-paths/
- Neo4j query tuning: https://neo4j.com/docs/cypher-manual/current/planning-and-tuning/
- Neo4j query plans: https://neo4j.com/docs/cypher-manual/current/planning-and-tuning/execution-plans/
- OpenLineage naming conventions: https://openlineage.io/docs/spec/naming/
- OpenLineage object model: https://openlineage.io/docs/spec/object-model/
- OpenLineage column lineage: https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/
- OpenMetadata Lineage API (official search-indexed documentation): https://docs.open-metadata.org/v1.12.x/api-reference/lineage/index

## Issues Found
1. **Unstated Neo4j version requirement.** The relationship uniqueness constraint is unavailable before Neo4j 5.7. Added the minimum version without changing the valid constraint syntax.
2. **Physical locators described as immutable identities.** The example keys contain names and locations that can change. Clarified preserving assigned identities through rename/move mappings or using a catalog UUID, including deployment scope where needed. Also identified these as custom catalog keys rather than literal OpenLineage namespace/name pairs.
3. **Missing ingestion parameter and ordering assumptions.** MERGE rejects null identity values, and arbitrary nested maps cannot be relationship property values. Specified non-null keys, timestamp strings, and string evidence classes. The unconditional SET operations can regress timestamps and overwrite current state when events arrive late; documented the ordered-input assumption and the reconciliation required for late observations.
4. **Snapshot retirement could discard another producer's evidence.** Restricted retirement to the reporting producer and snapshot scope, and required the current edge to retain support from other evidence according to the merge policy.
5. **Depth bounds were insufficiently distinguished from work bounds.** Clarified that the traversal examples do not cap rows or runtime, and that deduplication, sorting, aggregation, and pagination do not guarantee bounded traversal cost. Added the need for a result cap and transaction timeout in interactive use.

## Review Notes
- Reviewed every Cypher block against official syntax and semantics. The constraint declarations, independently bound MERGE endpoints, datetime calls, path predicates, list comprehension, minimum-hop aggregation, and cycle query are valid under the documented assumptions. No CLI commands or configuration files are present.
- Outgoing dependencies correctly traverse upstream; incoming dependencies correctly traverse downstream. Hop counts measure relationships, so an asset-to-job-to-asset chain takes two hops.
- The upstream example produces a row per qualifying path. The downstream example produces one row per consumer with the minimum qualifying path length within eight hops. Cycles can return the starting asset, and the cycle query may report the same cycle from multiple starting nodes.
- Default matching avoids relationship reuse within a path but permits repeated nodes. The legacy variable-length syntax remains supported, although it is not GQL-conformant; quantified path patterns are an alternative.
- Direct value derivation versus indirect filter/join/sort influence agrees with OpenLineage column-lineage semantics. Relationship type names in this guide are application-defined conventions.
- Current topology versus immutable observations, historical validity intervals, optional execution-level nodes, precomputation, and evidence ranking are design choices. The post appropriately treats evidence ranking as policy rather than a universal ordering.
- Constraints enforce uniqueness of supplied values, not the existence of every key. All ingestion paths should enforce required identities; conflicting keys or concurrent transaction failures require appropriate application error handling and retries.
- Neo4j and OpenLineage documentation links resolved. The OpenMetadata latest URL could not be retrieved successfully (HTTP 308 redirect handling failure); the official indexed versioned page confirms the intended API resource and its lineage, depth, pipeline, and column-mapping capabilities. The original plausible URL was retained; live reachability is unconfirmed.
- This was a documentation-based technical review. No Neo4j server was provisioned, and queries, concurrent retries, and performance fixtures were not executed. No runtime or latency validation is claimed.
