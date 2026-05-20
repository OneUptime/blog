# Validation Summary: How to Scale ArgoCD for Enterprise Multi-Tenancy

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- ApplicationSet
- Helm
- Redis
- Prometheus

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Dynamic Cluster Distribution documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/dynamic-cluster-distribution/
- Argo CD argocd-cmd-params-cm reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD argocd-cm reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/

## Issues Found
- Static controller sharding used a Deployment, but the documented static sharding path scales the `argocd-application-controller` StatefulSet and sets `ARGOCD_CONTROLLER_REPLICAS`. Changed the snippet to `kind: StatefulSet`.
- The post claimed ArgoCD always uses consistent hashing for shard assignment. Argo CD uses the configured sharding algorithm, with the default documented through `controller.sharding.algorithm`. Reworded the explanation.
- Dynamic cluster distribution was described as Argo CD 2.8+ and enabled through a non-documented `controller.dynamic.cluster.distribution.enabled` ConfigMap key. Official documentation marks it alpha since v2.9.0 and enables it with `ARGOCD_ENABLE_DYNAMIC_CLUSTER_DISTRIBUTION` on the application controller Deployment. Updated the version, caveat, and snippet.
- The dynamic cluster distribution section called the alpha feature the recommended enterprise approach. Reworded it to note its usefulness while preserving the production caveat.
- The repo server snippet described `ARGOCD_EXEC_TIMEOUT` as increasing parallelism. It controls manifest generation command timeout, so the comment was corrected.
- The repo server caching snippet used an undocumented `reposerver.helm.cache.max.entries` key and described a one-hour cache as longer than the default. Removed the invalid key and used the documented `reposerver.repo.cache.expiration` setting with the documented default-style duration.
- The API server scaling snippet omitted `ARGOCD_API_SERVER_REPLICAS`, which official HA guidance uses when running multiple API server replicas. Added the environment variable.
- Two Argo CD `Application` examples specified only `destination.namespace`. Added `destination.server: https://kubernetes.default.svc` so the destination cluster is explicit.
- The "Resource Tuning for Large Scale" label was missing Markdown heading syntax. Added the `##` heading marker.

## Review Notes
The resource sizing values are reasonable starting points but should still be load-tested for each installation. Dynamic cluster distribution remains alpha in current Argo CD documentation, so production users should check release notes before adopting it.
