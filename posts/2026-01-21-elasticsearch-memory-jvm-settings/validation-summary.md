# Validation Summary: How to Configure Elasticsearch Memory and JVM Settings

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Elasticsearch
- JVM heap settings
- Garbage collection and GC logging
- Linux system limits, systemd, swap, and memory locking
- Elasticsearch circuit breakers
- Elasticsearch indexing buffer, thread pools, and index refresh settings
- Elasticsearch REST and cat APIs

## Sources Consulted
- Elastic JVM settings documentation: https://www.elastic.co/docs/reference/elasticsearch/jvm-settings
- Elastic disable swapping and memory lock documentation: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/setup-configuration-memory
- Elastic circuit breaker settings documentation: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/circuit-breaker-settings
- Elastic indexing buffer settings documentation: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/indexing-buffer-settings
- Elastic thread pool settings documentation: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/thread-pool-settings
- Elastic field data cache settings documentation: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/field-data-cache-settings
- Elastic general index settings documentation: https://www.elastic.co/docs/reference/elasticsearch/index-settings/index-modules
- Elasticsearch default JVM options source: https://github.com/elastic/elasticsearch/blob/main/distribution/src/config/jvm.options

## Issues Found
- The post described a fixed 31GB heap maximum. Updated this to the current compressed ordinary object pointer guidance: keep heap below the compressed OOPs threshold, with 26GB safe on most systems and up to 30GB possible on some systems.
- The post described Lucene file system cache as off-heap direct memory. Updated the memory breakdown to distinguish native/direct/off-heap memory from operating system filesystem cache.
- The post presented `ES_JAVA_OPTS` as a general heap configuration method. Updated it to clarify that production should prefer `.options` files and that `ES_JAVA_OPTS` is mainly for testing/development because it overrides JVM options.
- The GC section recommended overriding G1GC tuning parameters. Updated it to recommend Elasticsearch defaults for normal use and corrected the custom GC logging example to disable the default logging configuration first.
- The parent circuit breaker default was listed as 70% of heap. Updated it to 95% when real-memory accounting is enabled, matching current Elasticsearch defaults.
- The indexing buffer min/max settings were described as per-shard values. Updated them to node-level indexing buffer bounds.
- Thread pool examples used flat settings and implied workload-based manual sizing as a default tuning step. Updated the examples to nested `elasticsearch.yml` syntax and added a note that thread pools are automatically sized from allocated processors.
- The write-heavy workload section said to reduce the refresh interval while setting `30s`. Updated this to say increase the refresh interval to reduce refresh overhead.
- The field data cache tuning example set the cache to the same value as the default field data circuit breaker. Updated it to a lower value and noted it should stay below the breaker limit.
- The production JVM options example included deprecated/unsafe GC tuning and `UseBiasedLocking`. Removed those recommendations and updated the GC logging and heap comments.

## Review Notes
The post is technically relevant and salvageable. Some examples remain workload-dependent, especially thread pool sizing and cache sizing, so future revisions could add stronger caveats around benchmarking and using Elasticsearch defaults before applying manual tuning.
