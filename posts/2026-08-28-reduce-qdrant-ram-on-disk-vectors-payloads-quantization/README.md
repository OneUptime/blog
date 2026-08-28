# How to Reduce Qdrant RAM Usage with On-Disk Vectors, Payloads, and Quantization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Qdrant, Memory, Vector Storage, Payload, Quantization, Performance

Description: Measure Qdrant's memory consumers, place cold structures in disk-backed tiers, compress search vectors, and validate recall and tail latency before scaling down RAM.

---

Qdrant memory use is more than the raw vector array. Dense and sparse indexes, quantized copies, payload, payload indexes, ID tracking, optimizers, allocator overhead, replicas, and the operating-system page cache all contribute.

Current Qdrant releases expose `pinned`, `cached`, and `cold` memory tiers for supported structures. Older releases use settings such as `on_disk`, `on_disk_payload`, and `always_ram`. Do not mix schemas from two Qdrant versions: inspect the running server and use its matching documentation and client.

## Measure Before Changing Placement

On Qdrant 1.18 and later, inspect the collection Memory tab in the Web UI or call:

```bash
curl --silent --show-error \
  -H 'api-key: YOUR_API_KEY' \
  http://localhost:6333/collections/documents/memory
```

The response reports:

- total file sizes as `Disk`;
- non-evictable heap `RAM`;
- memory-mapped pages currently in the OS page cache as `Cached`;
- the amount Qdrant would ideally keep cached for best performance as `Expected Cache`.

`Disk` and `Cached` are not disjoint: cached pages are resident pages from those on-disk files. Qdrant states that these estimates can undercount RAM by roughly 10–15% because allocator and third-party-library use is not fully attributed. Process RSS reported by tools such as `top` or `htop` also includes resident file-backed memory-mapped pages, so it can appear high after moving data to disk even when those pages are reclaimable under pressure.

Record peak RSS, page cache, query latency, throughput, recall, disk IOPS, and optimizer activity over a representative period.

## Understand the Current Memory Tiers

- `pinned` loads a supported structure into heap RAM and prevents eviction.
- `cached` stores it in a memory-mapped file and proactively warms pages at startup.
- `cold` stores it in a memory-mapped file without preloading; accesses can still warm pages later.

`cached` pages have no special protection from OS eviction compared with pages warmed from `cold`. Under pressure, either can require later disk reads.

Qdrant rejects `pinned` for dense vectors and payloads; those support disk-backed `cached` or `cold`. Other structures, including HNSW, quantized vectors, sparse indexes, and payload indexes, have their own supported tier set.

## Start with a Storage-Oriented Collection

This current-schema example keeps original vectors, HNSW, and payload cold while pinning a smaller scalar-quantized representation:

```python
from qdrant_client import QdrantClient, models

client = QdrantClient(url="http://localhost:6333", api_key="...")

client.create_collection(
    collection_name="documents-cold",
    vectors_config=models.VectorParams(
        size=768,
        distance=models.Distance.COSINE,
        memory=models.Memory.COLD,
    ),
    hnsw_config=models.HnswConfigDiff(
        memory=models.Memory.COLD,
    ),
    quantization_config=models.ScalarQuantization(
        scalar=models.ScalarQuantizationConfig(
            type=models.ScalarType.INT8,
            quantile=0.99,
            memory=models.Memory.PINNED,
        )
    ),
    payload=models.PayloadStorageParams(
        memory=models.Memory.COLD,
    ),
)
```

Client model names can change with the Qdrant API version. The equivalent REST shape is the stable reference for the running server:

```json
{
  "vectors": {
    "size": 768,
    "distance": "Cosine",
    "memory": "cold"
  },
  "hnsw_config": {
    "memory": "cold"
  },
  "quantization_config": {
    "scalar": {
      "type": "int8",
      "quantile": 0.99,
      "memory": "pinned"
    }
  },
  "payload": {
    "memory": "cold"
  }
}
```

Test the client call against a disposable collection before production. If the installed client does not expose the current models, upgrade it compatibly or use the documented REST API; do not guess field names.

## Move Existing Structures Gradually

Qdrant can update several storage settings on an existing collection, rebuilding affected segments in the background. The update schema and supported transitions depend on the deployed minor version, especially around the memory-tier interface introduced in Qdrant 1.19. Read the effective collection configuration, use the matching API reference, and test the exact request against a disposable collection first.

For a large production collection, a blue-green migration is often easier to reason about: create a new collection with the intended placement, copy or re-ingest the points, reproduce payload indexes and other collection settings, run the workload comparison, and switch an alias only after it passes. This also gives you an immediate rollback target.

Whether updating in place or cloning, change one component at a time. Collection-update calls may wait for existing optimizers and can trigger expensive rebuilding. Ensure disk and CPU headroom and wait for green status before continuing.

For older servers, the corresponding legacy fields include vector `on_disk`, collection `on_disk_payload`, HNSW `on_disk`, quantization `always_ram`, and per-payload-index `on_disk`. The current memory-tier documentation maps each legacy value; use one interface consistently.

## Quantize the Search Representation

Scalar quantization converts float32 vector components to int8, giving roughly 4x compression for the quantized copy. Binary, TurboQuant, and product quantization provide different compression and recall tradeoffs. Quantization adds a representation; Qdrant retains the original vector for storage and optional rescoring.

The main choices are:

- quantization method compatible with the vector distribution and distance metric;
- quantile or method-specific parameters;
- memory tier for the quantized representation;
- query-time rescoring with original vectors;
- oversampling enough candidates before rescore.

Pinning a small quantized index while keeping originals cold can reduce non-evictable RAM and keep initial candidate selection fast. Rescoring against cold original vectors causes random disk reads and can sharply increase tail latency. Benchmark with the actual storage device and concurrency.

## Keep Only Useful Payload Indexes Pinned

Putting payload JSON on disk does not remove the memory cost of payload field indexes. Index only fields used for filtering, ordering, faceting, or strict-mode requirements. Each index consumes disk and memory and adds update work.

Current Qdrant defaults payload data to `cold` and payload indexes to `pinned`. For a large low-frequency index, use a supported disk-backed tier when its latency is acceptable. Never delete a payload index without measuring the filtered-query and strict-mode consequences.

## Account for Optimizer Headroom

Qdrant's background optimizer creates new segments, builds HNSW, and applies quantization while queries continue. During a merge or rebuild, old and new structures can coexist temporarily. Capacity planning must include this transient disk, RAM, CPU, and I/O use.

Do not size the container memory limit exactly to the steady-state dashboard estimate. An OOM kill during segment optimization can produce repeated restart loops and prevent the collection from converging.

Replicas multiply total storage and RAM/cache demand according to physical shard placement. Memory-tier settings are collection-wide and apply to every replica: moving vectors to `cold` does not reduce replicated disk usage, but it does remove proactive cache warming; pages read on each serving replica can still enter the OS page cache.

## Validate the Tradeoff

After each change:

1. wait until the collection is green and optimizers settle;
2. restart a canary once to measure cold-start behavior;
3. run representative filtered and unfiltered queries from cold and warm cache states;
4. compare ANN recall with `exact: true` ground truth;
5. measure p95/p99 latency, IOPS, queue depth, CPU, and RSS;
6. inspect `/collections/{name}/memory` again;
7. test ingestion while background optimization is active.

If the disk cannot serve cold random reads within the latency objective, add RAM, use faster local SSD/NVMe, keep the hot structure `cached`, or reduce the data per node. On-disk placement transfers pressure; it does not eliminate work.

## Official Documentation

- [Qdrant memory tiers, defaults, limitations, and legacy mapping](https://qdrant.tech/documentation/ops-configuration/memory-tiers/)
- [Qdrant collection memory monitoring](https://qdrant.tech/documentation/ops-monitoring/memory-usage/)
- [Qdrant quantization methods and tradeoffs](https://qdrant.tech/documentation/manage-data/quantization/)
- [Qdrant collection and vector configuration updates](https://qdrant.tech/documentation/manage-data/collections/)
- [Qdrant database optimization FAQ](https://qdrant.tech/documentation/faq/database-optimization/)
- [Qdrant capacity planning](https://qdrant.tech/documentation/capacity-planning/)

## Conclusion

Reduce Qdrant RAM by measuring the actual components, moving cold vectors, HNSW, payload, and selected indexes to supported disk-backed tiers, and keeping only the compact search representation hot. Quantization can shrink candidate-search memory, but rescoring cold originals costs I/O. Validate every move under optimizer load and real concurrency before lowering a memory limit or node size.
