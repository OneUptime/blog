# Validation Summary: How to Debug Sync Wave Ordering Issues in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Sync waves and sync hooks
- Helm hooks
- kubectl and Argo CD CLI
- Lua custom health checks

## Sources Consulted
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/release-2.1/user-guide/commands/argocd_app_sync/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Diff Customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Kubernetes Annotations documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/

## Issues Found
- The post used `argocd app resources my-app --output json`, but the current official command reference only documents `tree` and `tree=detailed` as valid output formats for `argocd app resources`. Changed the JSON inspection example to use `argocd app get my-app --output json` and read `.status.resources[]`.
- The post described unquoted numeric annotation values as something Argo CD silently ignores. Kubernetes annotation keys and values must be strings, so an integer annotation value is invalid. Updated the explanation and comment to state that Kubernetes rejects non-string annotation values.
- The wave ordering explanation omitted sync phase precedence and name ordering. Updated the explanation to match Argo CD's documented ordering: phase, wave, kind, then name.
- The stuck wave explanation said Argo CD simply waits for all resources in a wave to become healthy before moving to the next wave. Updated it to reflect Argo CD's documented behavior of applying the first wave with an out-of-sync or unhealthy resource and repeating until all phases and waves are synced and healthy.
- The "skip the health check" option showed `ignoreDifferences`, which only affects diff comparison and does not skip or override health checks. Removed that misleading example and kept the custom health check approach.
- The "Resources Deploying Out of Expected Order" heading was missing Markdown heading syntax. Fixed it to render as a section heading.
- The self-healing claim was too broad and not supported by the sync wave documentation. Replaced it with the documented selective sync caveat that hooks do not run during selective sync operations.

## Review Notes
The remaining CLI and Kubernetes commands are syntactically plausible for the described debugging workflow. The exact fields visible in Argo CD UI and JSON output can vary by Argo CD version and resource state, so future updates may want to mention the tested Argo CD version explicitly.
