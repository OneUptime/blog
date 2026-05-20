# Validation Summary: How to View Application Details in ArgoCD UI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD / ArgoCD
- GitOps
- Kubernetes
- Helm
- Kustomize
- YAML

## Sources Consulted
- Argo CD command reference for `argocd app get`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD UI customization documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/ui-customization/
- Argo CD application deletion documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD applications in any namespace documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/app-any-namespace/

## Issues Found
- The direct UI URL was presented only as `/applications/argocd/<application-name>`. This is correct for applications in the default Argo CD control-plane namespace, but Argo CD can support applications in other namespaces. Added the namespace caveat and the generic `/applications/<application-namespace>/<application-name>` pattern.
- The CLI example said `argocd app get my-app --grpc-web` opens the UI and outputs a URL field. Official command documentation describes it as an application details command; `--grpc-web` only enables the gRPC-web protocol. Updated the text to say the command inspects application details and does not open the UI.
- The Parameters section said Helm/Kustomize views show rendered values, including all Helm values currently in effect. Argo CD exposes configured parameters and overrides rather than a guaranteed dump of every rendered value. Reworded this to configured build parameters and overrides.
- The Sync section described force sync as replacing resources instead of applying. Argo CD distinguishes `Replace=true`, which uses `kubectl replace` or `kubectl create`, from `Force=true` with `Replace=true`, which can delete and recreate resources. Updated the bullets to reflect this distinction.

## Review Notes
Most UI descriptions are version-sensitive because Argo CD's interface changes across releases. The post is accurate as a general UI walkthrough after the corrections, but future updates should re-check exact button labels and view controls against the Argo CD version being documented.
