# Validation Summary: How to Configure Elasticsearch for Performance

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Elasticsearch
- JVM and garbage collection settings
- Elasticsearch index settings and mappings
- Index Lifecycle Management (ILM)
- Elasticsearch Query DSL
- Python Elasticsearch client
- Linux system tuning
- curl
- Mermaid diagrams

## Sources Consulted
- Elasticsearch JVM settings: https://www.elastic.co/docs/reference/elasticsearch/jvm-settings
- Elasticsearch memory and swapping configuration: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/setup-configuration-memory
- Elasticsearch thread pool settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/thread-pool-settings
- Elasticsearch indexing speed guidance: https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/indexing-speed
- Elasticsearch refresh API and refresh interval behavior: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-refresh
- Elasticsearch shard sizing guidance: https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/size-shards
- Elasticsearch ILM actions: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions
- Elasticsearch ILM allocate action: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-allocate
- Elasticsearch ILM migrate action and data tiers: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-migrate
- Elasticsearch data tier allocation settings: https://www.elastic.co/docs/reference/elasticsearch/index-settings/data-tier-allocation
- Elasticsearch Python client querying guide: https://www.elastic.co/docs/reference/elasticsearch/clients/python/querying
- Elasticsearch Python client API reference: https://elasticsearch-py.readthedocs.io/en/latest/api/elasticsearch.html
- Elasticsearch Python client examples: https://www.elastic.co/docs/reference/elasticsearch/clients/python/examples
- Elasticsearch bulk API reference: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk
- Related OneUptime blog links were checked and resolved successfully:
  - https://oneuptime.com/blog/post/2026-01-24-database-indexing-strategy/view
  - https://oneuptime.com/blog/post/2026-01-24-service-mesh-overhead/view

## Issues Found
- The post said default Elasticsearch settings are designed for development, not production. Updated this to reflect current Elasticsearch behavior: modern defaults are safer and include automatic heap sizing, but production workloads still require sizing and workload-specific tuning.
- The JVM example recommended a fixed 31GB heap and manual G1 tuning. Updated it to prefer Elasticsearch automatic heap sizing and, when overriding, keep heap below the compressed ordinary object pointer threshold. Removed manual G1 tuning flags from the example.
- The JVM example enabled transparent huge pages with `-XX:+UseTransparentHugePages`. Removed this from JVM settings and corrected the Linux tuning snippet to disable transparent huge pages with `echo "never"`.
- The `cluster.initial_master_nodes` setting was shown as a normal persistent discovery setting. Added a note that it should only be used for initial cluster bootstrapping and removed after the cluster forms.
- The thread pool example hard-coded search, write, and analyze pool sizes. Replaced this with `node.processors` guidance because Elasticsearch sizes thread pools automatically and manual overrides should follow load testing or CPU detection issues.
- The index settings and ILM examples used JSON code fences with comments. Changed those fences to `jsonc` so the examples are syntactically represented as commented JSON snippets.
- The refresh interval comment said the default 1s refresh is universally too aggressive. Updated it to match current behavior: Elasticsearch periodically refreshes every second only for indices that have recently been searched.
- The ILM example used `allocate.require.data` for warm/cold movement, which only works with custom node attributes and is not the modern data-tier role mechanism. Removed the custom allocation filters and left automatic ILM migration/data tiering behavior intact.
- The Python search examples used `body=` and did not pass the same routing key used during indexing. Updated them to use current Python client named parameters and pass `routing=service`.
- The bulk indexing comment implied routing always improves query performance. Updated the comment to clarify that routing helps when related searches use the same routing key.
- The Python index settings updates used `body=`. Updated them to use the current `settings=` parameter.
- The system tuning snippet recommended setting transparent huge pages to `always`. Corrected it to `never`.
- The monitoring table suggested reducing merge threads when merge time is high. Changed the action to review indexing rate, shard size, and merge pressure.
- The best-practices heap summary used "max 31GB." Updated it to recommend default auto-sizing or no more than 50% of RAM while staying below the compressed ordinary object pointer threshold.

## Review Notes
- The examples remain workload-dependent. Settings such as circuit breaker limits, index buffer size, merge policy, refresh interval, shard count, and `node.processors` should be validated with production-like load tests before use.
- The Linux tuning commands are illustrative and require adaptation for the target distribution, storage device names, systemd limits, and persistence across reboots.
- The `async` translog durability example is a valid performance tradeoff, but it can lose acknowledged writes if a node fails before the next sync.
