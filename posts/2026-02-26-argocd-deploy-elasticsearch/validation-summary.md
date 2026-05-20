# Validation Summary: How to Deploy Elasticsearch with ArgoCD

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Deployments, Services, Jobs, CronJobs, PVCs, and resource requests/limits
- Elasticsearch 8.12
- Elastic Cloud on Kubernetes (ECK) 2.11
- Kibana on ECK
- Elasticsearch Index Lifecycle Management (ILM)
- Elasticsearch snapshot repositories
- Prometheus elasticsearch_exporter

## Sources Consulted
- Argo CD sync phases and waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD sync options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- ECK installation and Helm chart guidance: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/install
- ECK current download/version page: https://www.elastic.co/downloads/elastic-cloud-kubernetes/
- ECK settings managed by the operator: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/settings-managed-by-eck
- ECK HTTP TLS configuration: https://www.elastic.co/docs/deploy-manage/security/k8s-https-settings
- ECK managed credentials: https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-users-and-roles.html
- Elasticsearch node roles: https://www.elastic.co/guide/en/elasticsearch/reference/current/node-roles-overview.html
- Elasticsearch ILM allocate action: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-allocate
- Elasticsearch ILM rollover action: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-rollover
- Elasticsearch S3 snapshot repository: https://www.elastic.co/guide/en/elasticsearch/reference/current/repository-s3.html
- ECK secure settings: https://www.elastic.co/docs/deploy-manage/security/k8s-secure-settings
- prometheus-community elasticsearch_exporter configuration: https://github.com/prometheus-community/elasticsearch_exporter

## Issues Found
- Removed Kubernetes environment variables named `discovery.type` and `xpack.security.enabled` from the single-node Deployment because the same settings were already provided through `elasticsearch.yml`; this avoids relying on Kubernetes environment variable name behavior for dotted setting names.
- Corrected the misleading Guaranteed QoS guidance. Kubernetes Guaranteed QoS requires CPU and memory requests and limits to be equal for every container in the Pod, not just memory requests and limits.
- Removed direct ECK configuration of `xpack.security.enabled`, `xpack.security.transport.ssl.enabled`, and `xpack.security.http.ssl.enabled` because ECK manages those Elasticsearch settings. HTTP TLS remains configured through the ECK `spec.http.tls.selfSignedCertificate.disabled` field.
- Added CPU limits matching CPU requests in the ECK Elasticsearch and Kibana examples where the post discussed Guaranteed QoS-style sizing.
- Added authentication to the ECK-backed curl examples and elasticsearch_exporter configuration by reading the ECK-generated `production-es-elastic-user` secret. ECK secures Elasticsearch by default, so unauthenticated requests would fail.
- Added creation of the initial `logs-000001` write index for the `logs` rollover alias. An ILM policy and index template alone are not enough for alias-based rollover.
- Changed the snapshot CronJob image to `alpine:3.19` and installed `curl` and `jq` before running the script, because the previous `curlimages/curl` example used `jq` without providing it.
- Adjusted the monitoring wording from "ECK provides built-in monitoring" to "ECK supports Elastic Stack monitoring integrations" to more accurately describe ECK's behavior.

## Review Notes
- The ECK and Elasticsearch versions in the article are valid examples but are not current as of 2026-05-20. Future updates should consider refreshing the version numbers together after checking the ECK support matrix.
- The snapshot example assumes S3 credentials are available to Elasticsearch through the runtime environment or ECK secure settings. Production deployments should configure IAM roles or secure settings explicitly.
