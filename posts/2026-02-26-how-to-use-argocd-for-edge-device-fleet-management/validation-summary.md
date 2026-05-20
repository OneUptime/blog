# Validation Summary: How to Use ArgoCD for Edge Device Fleet Management

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes
- K3s
- GitOps
- Helm
- Kustomize
- Prometheus and Grafana

## Sources Consulted
- Argo CD ApplicationSet Cluster Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD Cluster Bootstrapping documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/
- Argo CD ApplicationSet Progressive Syncs documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Progressive-Syncs/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD FAQ for reconciliation timeout: https://argo-cd.readthedocs.io/en/stable/faq/
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- OneUptime blog link, checked with HTTP HEAD: https://oneuptime.com/blog/post/2026-02-26-how-to-use-argocd-api-for-deployment-tracking/view

## Issues Found
- Removed `Retry=true` from `syncOptions`. Argo CD retry behavior is configured with `spec.syncPolicy.retry`, not as a sync option.
- Fixed the RollingSync example so it selects both canary and standard clusters. The original cluster generator selected only `edge-tier: canary`, so the standard rollout step would never receive generated Applications.
- Added `edge-tier` labels to the generated Applications. RollingSync groups Applications by labels on the generated Application resources, not directly by labels on the Argo CD cluster Secret.
- Replaced the manual approval comment in the RollingSync example. RollingSync waits for each Application group to become Healthy before proceeding; `maxUpdate: 100%` does not create a manual approval gate.
- Removed automated sync from the RollingSync example. Argo CD progressive syncs force autosync disabled for generated Applications and log warnings when automated sync is configured.
- Replaced non-existent metric `argocd_cluster_api_server_requests_total` with documented metric `argocd_cluster_connection_status`.
- Moved `timeout.reconciliation` from `argocd-cmd-params-cm` to `argocd-cm` and changed the value to a duration string. Argo CD documents reconciliation polling settings in `argocd-cm`.
- Clarified that `controller.sharding.algorithm` chooses the sharding algorithm when running multiple controller replicas; it does not enable sharding by itself.

## Review Notes
The guide remains version-general. Progressive Syncs and some sharding algorithms are documented as experimental or alpha in current Argo CD documentation, so production users should verify feature maturity against the Argo CD version they deploy.
