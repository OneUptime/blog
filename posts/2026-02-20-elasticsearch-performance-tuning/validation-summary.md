# Validation Summary: How to Tune Elasticsearch for Production Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Elasticsearch
- JVM heap and GC settings
- Elasticsearch index templates and mappings
- Elasticsearch Query DSL
- Elasticsearch Python client
- Linux production tuning

## Sources Consulted
- Elastic JVM settings documentation: https://www.elastic.co/docs/reference/elasticsearch/jvm-settings/
- Elastic important settings configuration documentation: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/important-settings-configuration
- Elastic shard sizing documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/size-your-shards.html
- Elastic cluster shard limit documentation: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/miscellaneous-cluster-settings
- Elastic index template API documentation: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/indices-put-template.html
- Elastic translog settings documentation: https://www.elastic.co/docs/reference/elasticsearch/index-settings/translog
- Elastic virtual memory documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/vm-max-map-count.html
- Elastic swapping documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/setup-configuration-memory.html
- Elastic file descriptor documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/file-descriptors.html
- Elastic query cache documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/query-cache.html/
- Elastic doc values documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/doc-values.html
- Elastic norms documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/norms
- Elastic flattened field documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/flattened.html/
- Elastic Python client documentation: https://www.elastic.co/guide/en/elasticsearch/client/python-api/current/index.html
- Elastic update index settings API documentation: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/indices-update-settings.html

## Issues Found
- The heap guidance used a fixed 31GB maximum. Updated it to follow current Elastic guidance: no more than 50% RAM and under the compressed ordinary object pointer threshold, with 26GB safe on most systems and up to about 30GB only after verification.
- The JVM options example suggested editing `/etc/elasticsearch/jvm.options`. Updated it to use a custom `.options` file under `/etc/elasticsearch/jvm.options.d/`, which is Elastic's recommended approach.
- The GC section recommended manually setting G1GC and related tuning options as general starting points. Updated it to state that Elasticsearch's default JVM and GC settings are recommended for most workloads, while preserving a correct GC logging customization example.
- The shard guidance used the older "20 shards per GB heap" rule and implied one shard per daily index. Updated it to current shard limits and data stream/ILM rollover guidance.
- The shard-count helper over-counted exact multiples of the target shard size and included a fixed heap-overhead estimate per shard. Updated it to use `math.ceil()` and report total primary shards without a misleading heap estimate.
- The translog comment said async durability risks losing the last 5 seconds of data. Updated it to match Elastic's documented behavior: acknowledged writes since the last automatic translog commit may be lost after a failure.
- The filter/query explanation said filters "can be cached" unconditionally. Updated it to say filters are eligible for query caching.
- The Python client examples used older `body=` style calls for APIs where Elastic's current Python examples use explicit parameters. Updated index template, search, and index settings calls to use `index_patterns=`, `template=`, `query=`, `sort=`, `size=`, and `settings=`.
- The Linux `vm.max_map_count` guidance used `262144`. Updated it to `1048576`, matching current Elastic documentation for Elasticsearch 8.16 and later/current releases.

## Review Notes
The examples are still illustrative and workload-dependent. In production, shard counts, refresh intervals, replica counts, bulk sizes, translog durability, and compression settings should be benchmarked against the actual ingestion and query workload before rollout.
