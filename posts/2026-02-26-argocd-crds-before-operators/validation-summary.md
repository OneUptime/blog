# Validation Summary: How to Handle CRDs That Must Be Installed Before Operators

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD sync phases and sync waves
- Argo CD app-of-apps pattern
- Argo CD sync options
- Kubernetes CustomResourceDefinitions
- Kubernetes operators and custom resources
- Helm CRD handling
- cert-manager
- kube-prometheus-stack / Prometheus Operator
- kubectl

## Sources Consulted
- Argo CD sync phases and waves: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD sync options, including `SkipDryRunOnMissingResource`, `ServerSideApply`, and `Replace`: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Helm integration and `skipCrds`: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
- Argo CD resource health and Application health-check caveat: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD cluster bootstrapping and app-of-apps pattern: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/
- Helm CRD best practices: https://helm.sh/docs/chart_best_practices/custom_resource_definitions/
- cert-manager v1.14 Helm installation and CRD considerations: https://cert-manager.io/v1.14-docs/installation/helm/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes Server-Side Apply reference: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- cert-manager v1.14.0 Git tag and `deploy/crds` path: https://github.com/cert-manager/cert-manager/tree/v1.14.0/deploy/crds
- prometheus-community helm-charts `kube-prometheus-stack-57.0.0` CRD path: https://github.com/prometheus-community/helm-charts/tree/kube-prometheus-stack-57.0.0/charts/kube-prometheus-stack/charts/crds/crds

## Issues Found
- The post implied ArgoCD would not retry failed waves generally. I narrowed this to the current sync operation because automated sync/retry behavior depends on sync policy configuration.
- The post said ArgoCD waits until Deployment pods are ready before proceeding to the next wave. Official Argo CD health docs define Deployment health in terms of observed generation and updated replica count, so I changed the wording and recommended a custom health check or readiness hook when a stricter gate is required.
- The app-of-apps examples omitted the Argo CD 1.8+ caveat that built-in `argoproj.io/Application` health was removed. I added a note that Application health must be restored in `argocd-cm` if sync waves should wait for child Applications to become healthy.
- The Helm CRD note was too broad for cert-manager. Helm does not update/delete CRDs from a chart `crds` directory, but cert-manager templates CRDs when `installCRDs: true`, so I qualified the statement and noted cert-manager's special behavior.
- The post claimed cert-manager CRDs are over 1 MB. For the referenced v1.14.0 CRDs, the individual files are below the 262144-byte annotation limit, so I generalized the statement to large CRDs rather than naming cert-manager.

## Review Notes
The snippets are illustrative and omit environment-specific prerequisites such as RBAC for the PreSync `crd-installer` ServiceAccount. The referenced cert-manager and kube-prometheus-stack repository paths and tags were verified as existing.
