# Validation Summary: How to Deploy Elasticsearch Operator (ECK) with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRepository and HelmRelease resources
- Flux Kustomization resources
- Elastic Cloud on Kubernetes (ECK)
- Elasticsearch
- Kibana
- Kubernetes StatefulSets, Services, Secrets, and PersistentVolumeClaims

## Sources Consulted
- Elastic ECK overview and supported versions: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s
- Elastic ECK GitHub releases: https://github.com/elastic/cloud-on-k8s/releases
- Elastic ECK Helm chart installation: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/install-using-helm-chart
- Elastic ECK operator metrics endpoint: https://www.elastic.co/docs/deploy-manage/monitor/orchestrators/k8s-enabling-metrics-endpoint
- Elastic ECK managed Elasticsearch settings: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/settings-managed-by-eck
- Elastic ECK volume claim templates: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/volume-claim-templates
- Elastic ECK Elasticsearch deployment and access guide: https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-deploy-elasticsearch.html
- Elastic ECK TLS certificate management: https://www.elastic.co/docs/deploy-manage/security/eck-tls
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux image update automation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/

## Issues Found
- The ECK Helm chart version was pinned to `2.13.0`, which is outdated for a 2026 tutorial. Updated it to `3.4.0` and adjusted the Kubernetes prerequisite to the current supported range for ECK 3.4.0.
- The operator metrics value used `metrics.port`, but the ECK Helm chart expects `config.metrics.port`. Updated the HelmRelease values accordingly.
- The Elasticsearch nodeSet configuration explicitly set `xpack.security.enabled`, `xpack.security.http.ssl.enabled`, and `xpack.security.transport.ssl.enabled`. These settings are managed by ECK and Elastic documents them as not recommended for user-provided configuration, so they were removed.
- The verification command checked for a Deployment named `elastic-operator`, but the ECK Helm installation manages the operator as a StatefulSet. Updated the command to `kubectl get statefulset elastic-operator -n elastic-system`.
- The prerequisite stated at least 4 GiB memory per Elasticsearch node while the example configured dedicated master nodes with 2 GiB. Updated the prerequisite to distinguish data-node and master-node memory in the example.

## Review Notes
The remaining manifests use current Flux API versions and valid ECK custom resource API versions. The example keeps Elasticsearch and Kibana at `8.13.4`; this is still within the current ECK-supported Elastic Stack major version range, but teams should test Elastic Stack upgrades separately before moving to 9.x.
