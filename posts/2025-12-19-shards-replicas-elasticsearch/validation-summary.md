# Validation Summary: How to Understand Shards and Replicas in Elasticsearch

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Elasticsearch (shards, replicas, allocation)
- Apache Lucene (underlying shard implementation)
- Elasticsearch REST API (index settings, `_cat`, `_cluster/health`, `_reindex`, `_aliases`)
- Index Lifecycle Management (ILM)
- Shard allocation awareness

## Sources Consulted
- Elasticsearch "Size your shards" guidance — https://www.elastic.co/guide/en/elasticsearch/reference/current/size-your-shards.html (confirms ~20 shards per GB of heap rule of thumb and shard sizing recommendations)
- Elasticsearch index modules / `index.number_of_shards` and `index.number_of_replicas` — https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules.html
- Routing / `_routing` and shard determination — https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-routing-field.html
- cat shards API — https://www.elastic.co/guide/en/elasticsearch/reference/current/cat-shards.html
- Cluster health API — https://www.elastic.co/guide/en/elasticsearch/reference/current/cluster-health.html
- ILM rollover / shrink / forcemerge actions — https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-actions.html
- Shard allocation awareness — https://www.elastic.co/guide/en/elasticsearch/reference/current/shard-allocation-awareness.html
- Reindex API and Aliases — https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-reindex.html

## Issues Found
No technical issues found.

The post's core technical claims were verified and are accurate:
- The routing formula `hash(document_id) % number_of_shards` is a valid simplification of Elasticsearch's routing (the actual default routing value is the document `_id`, and the full formula factors in `num_routing_shards`/`routing_factor`).
- Index creation with `number_of_shards: 3` and `number_of_replicas: 1` correctly yields 3 primaries + 3 replicas = 6 total shards.
- `_cat/shards` output format (columns, `p`/`r`, `STARTED`) is accurate.
- "20 shards per GB of heap" matches Elastic's official rule of thumb.
- `number_of_replicas: 2` surviving two node failures is correct (3 total copies).
- ILM rollover/shrink/forcemerge syntax and the `shrink` `number_of_shards` key are valid.
- `_cluster/health` field names and green/yellow/red meanings are correct.
- Reindex + alias swap pattern is correct.

## Review Notes
- In the ILM rollover action, `max_size` is still valid but has been superseded by `max_primary_shard_size` in newer Elasticsearch versions (7.13+), which Elastic now recommends for sizing rollover by shard rather than total index size. This is a forward-looking caveat, not an error; the code as written still works.
- The routing formula shown is intentionally simplified for teaching. The precise formula is `shard_num = (hash(_routing) % num_routing_shards) / routing_factor`; the simplified version is fine for an introductory guide.
