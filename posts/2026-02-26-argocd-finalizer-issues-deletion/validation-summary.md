# Validation Summary: How to Handle Finalizer Issues During ArgoCD Application Deletion

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD Applications and deletion finalizers
- Kubernetes finalizers and deletion lifecycle
- kubectl commands and JSON patching
- jq-based Kubernetes object filtering
- Helm hook annotations
- Kubernetes APIService and namespace termination troubleshooting

## Sources Consulted
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Kubernetes Finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes API concepts documentation: https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes API aggregation layer documentation: https://kubernetes.io/docs/concepts/api-extension/apiserver-aggregation/
- Helm Chart Hooks documentation: https://helm.sh/docs/topics/charts_hooks/

## Issues Found
- The post used `kubectl get all --field-selector metadata.deletionTimestamp!=''` to find terminating resources. Kubernetes field selector support varies by resource type, and all resource types only universally support `metadata.name` and `metadata.namespace`; `metadata.deletionTimestamp` is not a generally supported field selector. I changed those examples to retrieve JSON and filter `.metadata.deletionTimestamp` with `jq`.
- The bulk cleanup script used the same unsupported `metadata.deletionTimestamp` field selector. I changed it to iterate over namespaced resource types from `kubectl api-resources`, retrieve each type as JSON, and filter stuck resources with `jq` before patching finalizers.
- The post described `helm.sh/hook-delete-policy` as a Helm finalizer. Helm documents this as an annotation for hook resource cleanup policy, not a Kubernetes finalizer. I changed the section to describe Helm hook resources and clarify that stuck deletion is still caused by Kubernetes finalizers.

## Review Notes
The post is technically relevant and broadly accurate after the fixes. Manual finalizer removal remains risky because it skips controller cleanup; the post correctly frames it as a last resort. The local environment did not include `kubectl` or `argocd`, so CLI behavior was verified against official documentation rather than local help output.
