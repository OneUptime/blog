# Validation Summary: How to Reduce Qdrant RAM Usage with On-Disk Vectors, Payloads, and Quantization

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Qdrant 1.18 and 1.19
- Qdrant REST API and Web UI memory monitoring
- Python `qdrant-client` 1.19.0
- Dense vector and HNSW memory tiers
- Memory-mapped storage and the operating-system page cache
- Scalar, binary, TurboQuant, and product quantization
- Payload storage and payload field indexes
- Qdrant optimizers, sharding, and replication

## Sources Consulted

- [Qdrant memory tiers](https://qdrant.tech/documentation/ops-configuration/memory-tiers/)
- [Qdrant collection memory usage monitoring](https://qdrant.tech/documentation/ops-monitoring/memory-usage/)
- [Qdrant storage](https://qdrant.tech/documentation/manage-data/storage/)
- [Qdrant collections](https://qdrant.tech/documentation/manage-data/collections/)
- [Qdrant Create Collection API](https://api.qdrant.tech/api-reference/collections/create-collection)
- [Qdrant Update Collection API](https://api.qdrant.tech/api-reference/collections/update-collection)
- [Qdrant Python client 1.19.0 model definitions](https://github.com/qdrant/qdrant-client/blob/v1.19.0/qdrant_client/http/models/models.py)
- [Qdrant quantization](https://qdrant.tech/documentation/manage-data/quantization/)
- [Qdrant payload indexing](https://qdrant.tech/documentation/manage-data/indexing/)
- [Qdrant optimizer](https://qdrant.tech/documentation/ops-optimization/optimizer/)
- [Qdrant capacity planning](https://qdrant.tech/documentation/capacity-planning/)
- [Qdrant distributed deployment and replication](https://qdrant.tech/documentation/scaling/distributed_deployment/)
- [Qdrant database optimization FAQ](https://qdrant.tech/documentation/faq/database-optimization/)
- [Qdrant ANN recall measurement](https://qdrant.tech/documentation/tutorials-search-engineering/ann-recall/)
- [Qdrant v1.18.0 release](https://github.com/qdrant/qdrant/releases/tag/v1.18.0)
- [Qdrant v1.19.0 release](https://github.com/qdrant/qdrant/releases/tag/v1.19.0)
- [Linux `/proc` process-memory documentation](https://docs.kernel.org/filesystems/proc.html)
- Local `curl --help all` output for `--silent`, `--show-error`, and `--header`

## Issues Found

- The memory-report description could be read as treating `Disk` and `Cached` as disjoint quantities. Changed it to define `Disk` as total file size, `Cached` as resident pages from memory-mapped files, and `Expected Cache` as the amount Qdrant would ideally keep cached. Added that `Disk` and `Cached` overlap so readers do not sum them as separate storage allocations.
- The post said container RSS includes page cache. That is not generally true for cgroup/container RSS metrics, which may account for anonymous RSS and file cache separately. Changed the statement to the precise claim that process RSS reported by tools such as `top` and `htop` includes resident file-backed memory-mapped pages.
- The replication paragraph implied memory placement could be changed for one replica and said moving that replica to `cold` would not reduce cache requirements. Memory-tier settings are collection-wide, and `cold` removes proactive cache warming while leaving replicated disk usage unchanged. Replaced the paragraph with those semantics and noted that pages accessed by a serving replica can still enter the OS page cache.
- The capacity-planning documentation URL redirected from an older path. Updated it to Qdrant's current canonical URL.

## Review Notes

- Collection memory monitoring is available starting with Qdrant 1.18.0; the unified `pinned`, `cached`, and `cold` memory-tier interface starts with Qdrant 1.19.0.
- The Python example was instantiated and serialized with `qdrant-client` 1.19.0. Its serialized request matches the REST example, including vector, HNSW, quantization, and payload memory fields.
- The legacy fields remain relevant only to pre-1.19 servers and are deprecated in 1.19. The post correctly warns readers not to mix the two schemas.
- A cold HNSW graph is supported, but Qdrant's current documentation advises avoiding it when latency matters because graph traversal can incur substantial disk I/O. The post appropriately requires workload-specific latency and IOPS validation.
