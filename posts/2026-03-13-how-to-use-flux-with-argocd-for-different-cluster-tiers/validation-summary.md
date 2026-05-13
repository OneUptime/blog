# Validation Summary: How to Use Flux with ArgoCD for Different Cluster Tiers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux
- Argo CD
- Kubernetes
- Helm
- Kustomize
- GitOps
- Argo CD ApplicationSet
- Argo CD AppProject

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Argo CD chart documentation and values: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
- Argo CD AppProject specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD ApplicationSet specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD ApplicationSet generators documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/
- Argo CD sync options and namespace metadata documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD resource exclusion documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/#resource-exclusioninclusion

## Issues Found
- The HelmRelease example used `version: "6.x"` for the `argo-cd` chart, which is outdated relative to the current chart series. Changed it to `version: "9.x"`.
- The Argo CD Helm chart values used `server.ingress.hosts` and `server.ingress.tls`, which are not the chart-native keys in the current chart values. Changed them to `server.ingress.hostname` and `server.ingress.extraTls`.
- The diagrams referred to an `ArgoCD Agent` on workload clusters. Standard Argo CD does not require a per-cluster agent for normal push-based multi-cluster deployment. Changed the wording to `ArgoCD Target` / `ArgoCD Targets`.
- The resource exclusion section said Argo CD would ignore Flux-managed resources, but the example only excludes Flux custom resource kinds by API group. Changed the wording to say it ignores Flux custom resources.
- The namespace example comment implied that `argocd.argoproj.io/managed-by: argocd` universally allows deployment into a namespace. Clarified that it marks the namespace for an Argo CD instance named `argocd`.
- The strengths list described Argo CD as providing progressive delivery UIs. Argo CD integrates with progressive delivery workflows, but that wording is more accurately associated with Argo Rollouts. Removed that phrase.

## Review Notes
The examples assume destination clusters are already registered with Argo CD and that Argo CD has the necessary Kubernetes RBAC to deploy into the target namespaces. The post's separation model is technically sound, but teams should still enforce ownership boundaries through repository structure, AppProjects, RBAC, and review policy because labels alone do not prevent two controllers from reconciling the same object.
