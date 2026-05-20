# Validation Summary: How to Handle ApplicationSet Dry-Run Mode in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- ApplicationSet
- Kubernetes
- kubectl
- GitOps
- GitHub Actions
- kubeconform
- yq
- jq

## Sources Consulted
- Argo CD ApplicationSet resource modification and preview docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Controlling-Resource-Modification/
- Argo CD `argocd appset create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_appset_create/
- Argo CD `argocd appset generate` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_appset_generate/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD ApplicationSet in any namespace docs: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/Appset-Any-Namespace/
- Argo CD skip reconcile docs: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/skip_reconcile/
- Argo CD annotations and labels reference: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Argo CD Progressive Syncs docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Progressive-Syncs/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- GitHub Actions workflow syntax: https://docs.github.com/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The post incorrectly claimed that ArgoCD has no built-in ApplicationSet dry-run support. Updated the introduction and problem statement, and replaced the template rendering example with the official `argocd appset create --dry-run` and `argocd appset generate` commands.
- The `create-only` section omitted the controller-level policy precedence caveat. Added the note that a global controller `--policy` can override per-ApplicationSet `applicationsSync` unless policy override is enabled.
- The kubectl client-side dry-run description said it validates YAML syntax only. Updated it to clarify that client-side dry-run renders locally and does not ask the API server to validate the CRD.
- The separate-namespace preview strategy omitted the ApplicationSet-in-any-namespace requirement. Added the required ArgoCD configuration caveat.
- The generated-Application listing command used a non-authoritative managed-by label. Replaced it with the ApplicationSet label `argocd.argoproj.io/application-set-name`.
- The template rendering section claimed to test Go template rendering locally but only extracted YAML fields. Replaced it with the official ArgoCD CLI render and dry-run commands.
- The ApplicationSet status `jq` example could fail if `.status.resources` is absent. Updated it to use the optional iterator.
- The annotation-based pause section implied there is an ApplicationSet pause annotation. Reworked it to use the documented `argocd.argoproj.io/skip-reconcile` annotation on generated Applications and noted that it is an alpha Application feature, not an ApplicationSet controller pause.
- The closing paragraph repeated the incorrect claim that ArgoCD lacks ApplicationSet dry-run. Updated it to describe the split between CLI previews, kubectl validation, and controller safeguards.

## Review Notes
- The CI workflow assumes `yq` and `kubeconform` are available on the runner. In a production workflow, add installation steps or use pinned setup actions.
- Progressive Syncs are documented as a beta ApplicationSet feature and must be explicitly enabled on the ApplicationSet controller.
