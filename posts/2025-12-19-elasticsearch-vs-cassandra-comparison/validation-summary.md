# Validation Summary: How to Compare Elasticsearch vs Cassandra

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Elasticsearch
- Apache Cassandra
- Cassandra Query Language (CQL)
- Python Elasticsearch client
- Cassandra Python driver
- NoSQL data modeling
- Distributed database architecture

## Sources Consulted
- Elastic documentation: Elasticsearch SQL overview, https://www.elastic.co/docs/explore-analyze/query-filter/languages/sql
- Elastic documentation: Python client examples, https://www.elastic.co/docs/reference/elasticsearch/clients/python/examples
- Elastic documentation: Python client querying, https://www.elastic.co/docs/reference/elasticsearch/clients/python/querying
- Elastic documentation: Elasticsearch index fundamentals, https://www.elastic.co/docs/manage-data/data-store/index-basics
- Elastic API documentation: Cluster health API, https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-health
- Apache Cassandra documentation: Data definition and clustering order, https://cassandra.apache.org/doc/latest/cassandra/developing/cql/ddl.html
- Apache Cassandra documentation: Data manipulation and ALLOW FILTERING, https://cassandra.apache.org/doc/latest/cassandra/developing/cql/dml.html
- Apache Cassandra documentation: Counter columns, https://cassandra.apache.org/doc/latest/cassandra/developing/cql/counter-column.html
- Apache Cassandra documentation: Data types and counter limitations, https://cassandra.apache.org/doc/latest/cassandra/developing/cql/types.html
- Apache Cassandra documentation: Storage-attached indexing and ALLOW FILTERING note, https://cassandra.apache.org/doc/latest/cassandra/developing/cql/indexing/sai/sai-query.html
- Apache Cassandra documentation: nodetool status, https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/status.html
- DataStax Python driver documentation: Query parameters and prepared statements, https://docs.datastax.com/en/developer/python-driver/3.23/getting_started/index.html

## Issues Found
- The comparison table described Elasticsearch SQL as available "via plugin". Updated it to "SQL API" because current Elastic documentation presents Elasticsearch SQL as an official SQL feature/API rather than a separate plugin.
- The comparison table said Elasticsearch indexes "all fields". Updated it to "indexed fields" because Elasticsearch mappings can disable indexing for individual fields.
- Elasticsearch REST examples were marked as `json` even though they include HTTP methods and comments, which are not valid JSON. Changed those fences to `http`.
- The Cassandra query example used `some-uuid`, which is not a valid UUID literal. Replaced it with a valid UUID literal.
- The shopping cart CQL example used `quantity = quantity + 1` on an `INT` column. Cassandra only supports increment/decrement syntax for `counter` columns, so the example now sets `quantity = ?` after the application calculates the new value.
- The Python hybrid example used the deprecated/old-style Elasticsearch Python client `body=` argument for indexing and search. Updated indexing to `document=` and search to the current `query=` parameter style from the official client examples.
- The Python hybrid example queried Cassandra by `product_id` against a table pattern that was otherwise keyed by category. Updated the example to use an assumed `products_by_id` lookup table keyed by `product_id`, matching Cassandra's access-pattern-driven data modeling.
- The Python hybrid example converted a Cassandra row with `dict(result.one())` and tested the result set directly. Updated it to call `result.one()` first and return `row._asdict()` only when a row is present.

## Review Notes
The performance numbers are reasonable as illustrative ranges but are workload-, hardware-, schema-, replication-, and consistency-dependent. A future revision could make that caveat explicit, but no correction was required for validation.
