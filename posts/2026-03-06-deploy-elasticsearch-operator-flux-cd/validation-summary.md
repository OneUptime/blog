# Validation Summary: How to Deploy Elasticsearch Operator with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization
- Flux HelmRelease
- Kubernetes
- Elastic Cloud on Kubernetes (ECK)
- Elasticsearch
- Kibana
- Index Lifecycle Management (ILM)
- Snapshot Lifecycle Management (SLM)
- AWS S3 snapshot repositories

## Sources Consulted
- Elastic ECK Helm chart installation docs: https://www.elastic.co/guide/en/cloud-on-k8s/2.12/k8s-install-helm.html
- Elastic ECK operator configuration docs: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/configure-eck
- Elastic ECK configuration flags: https://www.elastic.co/docs/reference/cloud-on-k8s/eck-configuration-flags
- Elastic ECK volume claim template docs: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/volume-claim-templates
- Elastic ECK virtual memory docs: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/virtual-memory
- Elasticsearch node roles docs: https://www.elastic.co/docs/deploy-manage/distributed-architecture/clusters-nodes-shards/node-roles
- Elasticsearch 8.13.0 release notes: https://www.elastic.co/guide/en/elasticsearch/reference/8.18/release-notes-8.13.0.html
- Elasticsearch S3 repository docs: https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore/s3-repository
- Flux HelmRelease API docs: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI HelmRelease docs: https://v2-6.docs.fluxcd.io/flux/cmd/flux_create_helmrelease/
- Upstream ECK 2.12 Helm chart values and Chart.yaml: https://github.com/elastic/cloud-on-k8s/tree/2.12/deploy/eck-operator

## Issues Found
- The original Flux layout applied the ECK operator HelmRelease and ECK custom resources in the same Kustomization. This can fail because the Elasticsearch and Kibana CRDs are installed by the HelmRelease after the first Kustomization applies. I split the examples into operator and stack paths and added a second Flux Kustomization with `dependsOn`.
- Elasticsearch and Kibana were pinned to `8.13.0`, which has documented known issues including crashes under high memory pressure from the bundled JDK. I updated the examples to `8.13.4`, the final 8.13 patch release.
- The Elasticsearch node sets set `node.store.allow_mmap: false` while also using a privileged init container to set `vm.max_map_count`. Elastic recommends increasing `vm.max_map_count` for production and leaving mmap enabled, so I removed `node.store.allow_mmap: false`.
- The data node role list included both generic `data` and tier-specific data roles. I removed the generic `data` role so the listed hot, warm, and content tier roles reflect the intended tiered setup.
- The coordinating node used `node.roles: ["remote_cluster_client"]`, which creates a remote-eligible node rather than a coordinating-only node. I changed it to `node.roles: []`.
- The ILM example was a ConfigMap containing a script, so applying it would not create the ILM policy. I changed it to a Kubernetes Job that reads the ECK-managed elastic user password from the generated Secret and executes the API call.
- The ILM rollover example used `max_size`; I changed it to `max_primary_shard_size`, which is the safer current rollover condition for shard sizing.
- The snapshot setup example was also a ConfigMap containing a script, so applying it would not register the snapshot repository or SLM policy. I changed it to a Kubernetes Job and added a credential prerequisite note for S3.
- The troubleshooting command used `${ELASTIC_PASSWORD}` without defining it in the user's shell. I added a command that reads the password from the ECK-generated Secret before running the allocation explain request.

## Review Notes
- The ECK 2.12 Helm chart values used in the post (`installCRDs`, `managedNamespaces`, `webhook.enabled`, and `telemetry.disabled`) match the upstream chart values.
- `kubectl`, `helm`, and `ruby` were not installed locally, so CLI help validation was not available. YAML snippets were parsed with PyYAML.
- The ILM and snapshot setup Jobs are suitable for initial setup examples, but production GitOps workflows often use a more deliberate one-shot job naming or external automation strategy to avoid immutable Job-template update behavior.
