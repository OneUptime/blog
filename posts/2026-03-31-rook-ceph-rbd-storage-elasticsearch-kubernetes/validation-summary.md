# Validation Summary: How to Set Up Ceph RBD Storage for Elasticsearch on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RBD block storage)
- Kubernetes StorageClasses and PersistentVolumeClaims
- Elasticsearch 8.12.0
- Elastic Cloud on Kubernetes (ECK) operator
- Ceph OSD pool management
- Elasticsearch Index Lifecycle Management (ILM)

## Sources Consulted
- Elasticsearch 8.12 cluster-level settings documentation: https://www.elastic.co/guide/en/elasticsearch/reference/8.12/cluster-update-settings.html
- Elasticsearch 8.12 index.store.preload documentation: https://www.elastic.co/guide/en/elasticsearch/reference/8.12/preload-data-to-file-system-cache.html
- Elasticsearch 8.12 disk-based shard allocation settings: https://www.elastic.co/guide/en/elasticsearch/reference/8.12/modules-cluster.html#disk-based-shard-allocation
- Elasticsearch ILM policy documentation: https://www.elastic.co/guide/en/elasticsearch/reference/8.12/ilm-put-lifecycle.html
- ECK Elasticsearch resource specification: https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-elasticsearch-specification.html
- Rook-Ceph RBD StorageClass documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/

## Issues Found
- **`indices.store.preload` used as a cluster-level setting**: The original post placed `"indices.store.preload": ["nvd", "dvd"]` inside a `_cluster/settings` API call. This is invalid — `index.store.preload` is a static, index-level setting that must be configured at index creation time or via an index template, not through the cluster settings API. Elasticsearch would reject this request with an error. Fixed by removing it from the cluster settings call and adding a separate example showing how to set `index.store.preload` via an index template.

## Review Notes
- The disk watermark values shown (85%, 90%, 95%) are the Elasticsearch defaults. Setting them explicitly is not wrong — it documents the expected thresholds — but readers should know these are already the defaults.
- The data node memory configuration uses requests: 4Gi with limits: 8Gi, resulting in a Burstable QoS class. For production Elasticsearch, Guaranteed QoS (requests == limits) is generally recommended to avoid OOM kills under memory pressure. The JVM heap at 4GB is correctly sized at 50% of the memory limit.
- The ILM policy example assumes a rollover-compatible index setup (e.g., data streams or rollover aliases), which is not explicitly configured in the post. Readers will need to set up an index template that references the ILM policy and uses a data stream or rollover alias for the policy to function.
