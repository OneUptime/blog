# Validation Summary: How to Debug Unexpected Diff Results in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Helm
- Kustomize
- jq

## Sources Consulted
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app delete-resource` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_delete-resource/
- Argo CD Diff Customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD Diff Strategies documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/diff-strategies/
- Argo CD v1.7 to v1.8 upgrade notes for application-controller StatefulSet change: https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/1.7-1.8/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Helm `helm template` documentation: https://helm.sh/docs/v3/helm/helm_template/

## Issues Found
- The post described `argocd app get my-app -o json | jq ...` as JSON diff output. Changed the comment to say it lists OutOfSync resources, because `argocd app get` reports application/resource status, not a JSON-formatted diff.
- The Mermaid flowchart recommended server-side diff for both default values and webhook injection. Clarified that server-side diff applies to defaults in this branch; webhook-injected fields still usually need `ignoreDifferences` or explicit mutation webhook inclusion.
- The format/type mismatch examples used quoted vs unquoted Kubernetes quantity values as if that alone caused diffs. Replaced that with a documented quantity canonicalization example for CRDs reusing Kubernetes types.
- The status-field explanation implied CRD status subresource configuration was the deciding factor. Updated it to reference Argo CD's `resource.compareoptions.ignoreResourceStatusField` behavior.
- The post used `argocd app resources my-app --tree`, but the documented flag is `--output tree`. Corrected the command.
- The post described `argocd app resources` as returning diff details. Corrected the comment to say it lists managed resources.
- The controller log commands targeted `deployment/argocd-application-controller`. Modern Argo CD installs this component as `statefulset/argocd-application-controller`, so both log commands were corrected.
- The sync command used `--resource apps/Deployment/my-app`, but Argo CD documents the resource selector format as `GROUP:KIND:NAME`. Corrected it to `apps:Deployment:my-app`.
- The delete-resource command omitted the `apps` API group for a Deployment. Added `--group apps`.

## Review Notes
The post is technically relevant and now matches current Argo CD and Kubernetes CLI documentation. The term "ArgoCD" is used throughout; the project branding is "Argo CD", but this is a naming/style issue rather than a technical correctness problem.
