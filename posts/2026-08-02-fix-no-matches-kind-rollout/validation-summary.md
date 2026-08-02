# Validation Summary: Fixing “No Matches for Kind Rollout” After Installing Argo Rollouts

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Argo Rollouts
- Kubernetes CustomResourceDefinitions and API discovery
- kubectl and the Argo Rollouts kubectl plugin
- Kubernetes RBAC
- Argo CD sync waves and sync options
- GitOps installation ordering
- Kustomize
- Helm CRD lifecycle management

## Sources Consulted

- [Argo Rollouts installation](https://argo-rollouts.readthedocs.io/en/stable/installation/)
- [Argo Rollouts getting started](https://argo-rollouts.readthedocs.io/en/stable/getting-started/)
- [Argo Rollout specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/)
- [Argo Rollouts v1.9.1 standard installation manifest](https://github.com/argoproj/argo-rollouts/releases/download/v1.9.1/install.yaml)
- [Argo Rollouts v1.9.1 namespace-scoped installation manifest](https://github.com/argoproj/argo-rollouts/releases/download/v1.9.1/namespace-install.yaml)
- [Argo Rollouts CRD manifests](https://github.com/argoproj/argo-rollouts/tree/stable/manifests/crds)
- [Kubernetes: Extend the Kubernetes API with CustomResourceDefinitions](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/)
- [Kubernetes: Custom resources](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)
- [Kubernetes: kubectl api-resources](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/)
- [Kubernetes: kubectl apply](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)
- [Kubernetes: kubectl auth can-i](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [Kubernetes: Server-Side Apply](https://kubernetes.io/docs/reference/using-api/server-side-apply/)
- [Argo CD sync options](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/)
- [Argo CD sync phases and waves](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/)
- [Helm: Custom Resource Definitions](https://helm.sh/docs/chart_best_practices/custom_resource_definitions/)
- Local `kubectl v1.34.1` command help for `api-resources`, `apply`, `auth can-i`, `config view`, `logs`, and `wait`

## Issues Found

- The sample output for `kubectl api-resources` omitted the default `SHORTNAMES` and `NAMESPACED` columns. Updated it to match the current command output and the official Rollout CRD: short name `ro`, API version `argoproj.io/v1alpha1`, namespaced `true`, and kind `Rollout`.
- The CRD-health explanation implied that schema or admission failures would appear in cluster events and directly explain incomplete discovery. Such failures are reported by the CRD apply operation and can prevent the definition from being accepted. Updated the text to distinguish apply-time errors from the conditions and deletion timestamp on an existing CRD.
- The CRD-migration paragraph described a `kubectl get` command as both inventory and backup, and it omitted the cluster-scoped `ClusterAnalysisTemplate` resource. Clarified that backup requires the platform's supported backup procedure and added a separate inventory command for `clusteranalysistemplates`.

## Review Notes

- The moving `latest` release URL resolved to Argo Rollouts v1.9.1 on 2026-08-02. The post correctly recommends pinning an approved release for repeatable production and GitOps installations.
- The v1.9.1 standard manifest contains five CRDs, including `rollouts.argoproj.io`; the namespace-scoped manifest contains no CRDs, matching the post's installation guidance.
- The Rollout example uses the currently served `argoproj.io/v1alpha1` API and valid canary fields. The installation, discovery, wait, RBAC, dry-run, controller verification, Argo CD, and Helm commands are current and technically correct after the documented fixes.
