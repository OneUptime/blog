# Validation Summary: How to Configure Elasticsearch Hot-Warm-Cold Architecture on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch data tiers and node roles
- Elasticsearch Index Lifecycle Management
- Elasticsearch data streams and index templates
- Elasticsearch searchable snapshots and S3 snapshot repositories
- Kubernetes StatefulSets, Services, affinity, and PersistentVolumeClaims
- Google Kubernetes Engine node pools
- Amazon EKS node groups with eksctl

## Sources Consulted
- Elastic Docs: Node roles - https://www.elastic.co/docs/deploy-manage/distributed-architecture/clusters-nodes-shards/node-roles
- Elastic Docs: Configure data tiers for self-managed and ECK deployments - https://www.elastic.co/docs/manage-data/lifecycle/data-tiers/manage-data-tiers-self-managed-eck
- Elastic Docs: Data tiers - https://www.elastic.co/guide/en/elasticsearch/reference/current/data-tiers.html
- Elastic Docs: ILM rollover action - https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-rollover.html
- Elastic Docs: ILM allocate action - https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-allocate.html
- Elastic Docs: Searchable snapshot ILM action - https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-searchable-snapshot.html
- Elastic Docs: Set up lifecycle policy - https://www.elastic.co/guide/en/elasticsearch/reference/current/set-up-lifecycle-policy.html
- Elastic Docs: Data streams - https://www.elastic.co/guide/en/elasticsearch/reference/current/data-streams.html
- Elastic Docs: S3 repository settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/s3-repository-settings
- Elastic Docs: Translog settings - https://www.elastic.co/docs/reference/elasticsearch/index-settings/translog
- Elastic API Docs: cat shards API - https://www.elastic.co/docs/api/doc/elasticsearch/v9/operation/operation-cat-shards
- Elastic Docs: Install Elasticsearch with Docker - https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html
- Kubernetes API Reference: StatefulSet - https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Google Cloud SDK Reference: gcloud container node-pools create - https://cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- eksctl User Guide: Nodegroups - https://docs.aws.amazon.com/eks/latest/eksctl/nodegroups.html
- Amazon EKS User Guide: Create a managed node group - https://docs.aws.amazon.com/eks/latest/userguide/create-managed-node-group.html

## Issues Found
- The EKS cold node group used `st1` as the node volume type. That flag configures the worker node boot volume, and throughput-optimized HDD EBS volumes are not appropriate as boot volumes. Changed the example to `gp3` and added a note that Elasticsearch data volumes come from the StatefulSet PVC StorageClasses.
- The StatefulSet examples referenced Kubernetes Services by `serviceName` and used `http://elasticsearch:9200`, but did not define those Services. Added the required headless transport Services and an HTTP Service.
- The warm and cold StatefulSets did not set `cluster.name` or `node.name`, so they would not join the `logging-cluster` cluster as written. Added both settings.
- The examples used Elasticsearch `8.11.0`, which is outdated for a 2026 validation. Updated the image references to the current documented Docker image line, `9.4.0`.
- The plain HTTP `curl` examples conflicted with Elasticsearch security defaults. Added `xpack.security.enabled: "false"` for the tutorial manifests and a production caveat recommending TLS and authentication.
- The ILM policy used `max_size` for rollover. Replaced it with `max_primary_shard_size`, which is the documented shard-focused rollover condition used by current Elastic examples.
- The ILM policy used custom `allocate.require.data_tier` rules even though modern data tiers are represented by `data_*` node roles and ILM tier migration. Replaced the warm allocation action with explicit `migrate` and let the cold searchable snapshot action mount to the cold tier.
- The data stream index template set `index.lifecycle.rollover_alias`, which Elastic documents as unnecessary for data streams, and used `index.routing.allocation.require.data_tier` instead of the built-in tier preference setting. Removed the rollover alias and changed allocation to `index.routing.allocation.include._tier_preference: data_hot`.
- The S3 credential Secret used non-Elasticsearch key names. Changed them to the secure keystore setting names `s3.client.default.access_key` and `s3.client.default.secret_key`.
- The cat shards example requested `disk.indices`, which is not a valid cat shards column. Changed it to `store`.
- The Watcher condition used a Java Stream expression that is less portable in Painless examples. Replaced it with a straightforward Painless loop.
- The performance tuning example attempted to update `index.codec` on an open index. `index.codec` is static, so the example now closes the index before updating the codec and reopens it before changing the dynamic refresh interval.
- The query routing comment said `_local` prefers hot and warm tiers. `_local` prefers locally allocated shards, not storage tiers. Updated the comment.

## Review Notes
The article still uses hand-written StatefulSets rather than Elastic Cloud on Kubernetes, which is valid for illustrating the mechanics but leaves production concerns such as certificates, keystore initialization, Pod disruption budgets, readiness probes, storage classes, and dedicated master nodes outside the tutorial scope.
