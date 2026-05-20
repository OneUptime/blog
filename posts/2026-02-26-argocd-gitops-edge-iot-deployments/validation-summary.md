# Validation Summary: How to Implement GitOps for Edge and IoT Deployments with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSets
- GitOps
- Kubernetes
- K3s
- Kustomize
- Docker Buildx
- Edge and IoT deployments

## Sources Consulted
- Argo CD Getting Started: https://argo-cd.readthedocs.io/en/latest/getting_started/
- Argo CD Installation: https://argo-cd.readthedocs.io/en/latest/operator-manual/installation/
- Argo CD Declarative Setup for cluster Secrets: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD ApplicationSet Cluster Generator: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet Templates: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Template/
- Argo CD argocd cluster add command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD argocd-cm reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- K3s storage documentation: https://docs.k3s.io/add-ons/storage

## Issues Found
- The Argo CD install command used client-side `kubectl apply`; current Argo CD quick-start documentation requires `--server-side --force-conflicts` because some CRDs exceed the client-side apply annotation limit. Updated the HA install command accordingly.
- The ApplicationSet examples used older template variable syntax. Updated the examples to enable `goTemplate: true` and use current Go template expressions, including `index` for labels containing hyphens.
- The `argocd-cm` example included `server.connection.timeout`, which is not a documented `argocd-cm` setting. Replaced it with the documented `timeout.reconciliation.jitter` setting and corrected the comments to describe Git polling and refresh distribution rather than cluster connection timeout behavior.
- The Deployment manifest had a selector but no matching `spec.template.metadata.labels`, which Kubernetes rejects for `apps/v1` Deployments. Added matching pod template labels.

## Review Notes
The lightweight Kubernetes memory figures are approximate and can vary by version, enabled add-ons, workload, and operating environment. The staged rollout examples are illustrative snippets rather than complete ApplicationSet manifests.
