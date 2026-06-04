# Validation Summary: How to Deploy Milvus Vector Database on Kubernetes for AI Similarity Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Milvus
- Kubernetes
- Helm
- PyMilvus
- Sentence Transformers
- Prometheus Operator
- Grafana
- MinIO
- etcd
- Woodpecker message queue
- Milvus Backup

## Sources Consulted
- Milvus Helm installation documentation: https://milvus.io/docs/install_cluster-helm.md
- Milvus Helm chart values: https://raw.githubusercontent.com/zilliztech/milvus-helm/master/charts/milvus/values.yaml
- Milvus Helm chart templates and naming helpers: https://github.com/zilliztech/milvus-helm/tree/master/charts/milvus/templates
- PyMilvus `Collection.create_index()` API reference: https://milvus.io/api-reference/pymilvus/v3.0.x/ORM/Collection/create_index.md
- PyMilvus `utility.wait_for_index_building_complete()` API reference: https://milvus.io/api-reference/pymilvus/v2.6.x/ORM/utility/wait_for_index_building_complete.md
- Milvus HNSW index documentation: https://milvus.io/docs/hnsw.md
- Milvus SCANN index documentation: https://milvus.io/docs/scann.md
- Milvus monitoring and metrics dashboard documentation: https://milvus.io/docs/v2.3.x/metrics_dashboard.md
- Milvus Backup documentation: https://milvus.io/docs/milvus_backup_overview.md
- Milvus Backup CLI workflow documentation: https://milvus.io/docs/single-instance-backup-and-restore.md
- Hugging Face model card for `sentence-transformers/all-mpnet-base-v2`: https://huggingface.co/sentence-transformers/all-mpnet-base-v2

## Issues Found
- The Helm repository used the archived `milvus-io.github.io/milvus-helm` repo and `milvus/milvus` chart. Updated examples to the current `zilliztech` repo and `zilliztech/milvus` chart.
- The deployment examples used Pulsar as the default message queue and separate index nodes. Updated the examples to current chart defaults using Streaming Node, Woodpecker, MixCoord, and disabled legacy Index Node.
- The PyMilvus connection host used `milvus-proxy.milvus.svc.cluster.local`, but the chart service for a release named `milvus` is `milvus`. Updated the host to `milvus.milvus.svc.cluster.local`.
- The post listed ANNOY as a Milvus index type. Current PyMilvus index types do not include ANNOY. Replaced ANNOY references with SCANN and DiskANN where appropriate.
- The index progress code called `utility.index_building_progress()` while describing a blocking wait. Replaced it with `utility.wait_for_index_building_complete()`.
- The document search example used `all-MiniLM-L6-v2`, which produces 384-dimensional embeddings, against a 768-dimensional collection schema. Updated the model to `sentence-transformers/all-mpnet-base-v2`, which produces 768-dimensional embeddings.
- The scaling commands and HPA targeted StatefulSets, but the Milvus chart creates Deployments for query, data, and streaming nodes. Updated the commands and HPA target kind to `Deployment`.
- The monitoring section used non-current or inaccurate metric names. Replaced them with documented Milvus metric names and updated the PromQL examples.
- The backup section mirrored only the MinIO bucket, which is not a complete Milvus collection backup and restore workflow. Replaced it with the official Milvus Backup CLI workflow, which backs up metadata, segments, and data.

## Review Notes
- The post now follows the current Helm chart direction for Milvus 2.6-era deployments. Milvus documentation is actively evolving around 3.0 beta examples, so future reviews should re-check whether the recommended chart flags or component defaults have changed.
