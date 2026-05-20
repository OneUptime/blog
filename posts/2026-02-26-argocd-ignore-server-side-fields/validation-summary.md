# Validation Summary: How to Ignore Server-Side Fields in ArgoCD Comparison

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Server-Side Apply
- JSON Pointer
- JQ path expressions

## Sources Consulted
- Argo CD Diffing Customization documentation: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/diffing/
- Argo CD Diff Strategies documentation: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/diff-strategies/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/release-2.3/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes `kubectl get` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- RFC 6901 JSON Pointer: https://www.rfc-editor.org/rfc/rfc6901

## Issues Found
- The post said Argo CD server-side diff is available in Argo CD 2.5+. Argo CD documents Server-Side Diff as beta since v2.10.0, while the older v2.5 feature was Structured-Merge Diff. Updated the version references to 2.10+.
- The global server-side diff example used the `argocd-cm` ConfigMap. Argo CD documents `controller.diff.server.side` in `argocd-cmd-params-cm`. Updated the ConfigMap name and added the required `argocd-application-controller` restart note.
- The server-side diff explanation implied mutation webhooks are automatically included. Argo CD documents mutation webhook participation as disabled by default and controlled with `IncludeMutationWebhook=true`. Updated the explanation.
- The `kubectl get ... -o json` managed fields example omitted `--show-managed-fields`. Current `kubectl get` hides `managedFields` in JSON/YAML output unless this flag is set. Added the flag.
- The `argocd app diff --local` comment described the flag as showing more context. The official command reference defines it as comparing live app state to local manifests. Updated the comment.
- The source list described Kubernetes controllers as adding `metadata.managedFields` and `metadata.generation`. Adjusted the wording to distinguish API-server-managed metadata from controller-updated status.
- The AWS Load Balancer Controller JQ expression could fail when `.metadata.annotations` is null. Updated it to default annotations to `{}` before iterating.
- The post listed CRD status fields as common drift without acknowledging Argo CD's status diff behavior. Adjusted the wording to apply only when status diffing is not ignored.

## Review Notes
The remaining examples are valid patterns, but several ignore rules are intentionally broad and should be used cautiously in production because they can suppress meaningful drift.
