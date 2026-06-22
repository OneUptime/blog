# Validation Summary: How to Scale Elasticsearch Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Elasticsearch
- Elastic Cloud on Kubernetes (ECK)
- Kubernetes
- Index Lifecycle Management (ILM)
- Elasticsearch cluster and index APIs
- Shard allocation and data tiers

## Sources Consulted
- Elastic Docs: Node roles - https://www.elastic.co/docs/deploy-manage/distributed-architecture/clusters-nodes-shards/node-roles
- Elastic Docs: ECK nodes orchestration - https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/nodes-orchestration
- Elastic Docs: ECK volume claim templates - https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/volume-claim-templates
- Elastic Docs: Autoscaling in Elastic Cloud on Kubernetes - https://www.elastic.co/docs/deploy-manage/autoscaling/autoscaling-in-eck
- Elastic Docs: Composable index templates API - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-index-template
- Elastic Docs: Legacy index templates API - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-template
- Elastic Docs: Bootstrapping a cluster - https://www.elastic.co/docs/deploy-manage/distributed-architecture/discovery-cluster-formation/modules-discovery-bootstrap-cluster
- Elastic Docs: JVM settings - https://www.elastic.co/docs/reference/elasticsearch/jvm-settings
- Elastic Docs: Size your shards - https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/size-shards
- Elastic Docs: Cluster-level shard allocation and routing settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/cluster-level-shard-allocation-routing-settings
- Elastic Docs: Index recovery settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/index-recovery-settings
- Elastic Docs: Cluster allocation explain API - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-allocation-explain
- Elastic Docs: Cluster reroute API - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-reroute
- Kubernetes Docs: Horizontal Pod Autoscaling - https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- KEDA Docs: Scaling Deployments, StatefulSets and Custom Resources - https://keda.sh/docs/2.20/concepts/scaling-deployments/

## Issues Found
- The data node example used `node.roles: [data, data_content, data_hot]`. Elasticsearch docs warn not to combine the generic `data` role with specialized data tier roles because the generic role takes precedence. Changed it to `node.roles: [data_content, data_hot]`.
- The second ECK `volumeClaimTemplates` examples omitted `accessModes`. Added `accessModes: [ReadWriteOnce]` to match normal PersistentVolumeClaim structure and the earlier example in the post.
- The default-replica example used the deprecated legacy `/_template` API. Replaced it with the composable `/_index_template` API and the required `template.settings` structure.
- The dedicated master example showed `cluster.initial_master_nodes` without noting that it is only for brand-new cluster bootstrapping. Added the bootstrap-only caveat because Elasticsearch docs say to remove this setting after the cluster forms and never set it on nodes joining an existing cluster.
- The Kubernetes autoscaling section used HPA and KEDA directly against the Elasticsearch custom resource. Kubernetes HPA and KEDA require a scalable target with a `/scale` subresource, while ECK provides Elasticsearch autoscaling through `ElasticsearchAutoscaler`. Replaced those examples with an ECK `ElasticsearchAutoscaler` manifest and apply command.
- The memory-planning guidance treated 31 GB heap as a fixed maximum and included a generic heap-to-data ratio. Updated it to recommend Elasticsearch automatic heap sizing by default, and when manually overriding, to keep Xms and Xmx at no more than 50% of available RAM and below the compressed ordinary object pointer threshold.

## Review Notes
The remaining Elasticsearch API calls, shard allocation settings, reroute command shape, allocation explain request, data-tier roles, and shard sizing guidance align with current Elastic documentation. The ECK examples use Elasticsearch `8.12.0`; the APIs shown are still valid, but future readers should verify the ECK operator version supports the same Elasticsearch version and autoscaling API.
