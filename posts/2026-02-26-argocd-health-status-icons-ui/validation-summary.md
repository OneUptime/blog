# Validation Summary: How to Read Health Status Icons in ArgoCD UI

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Argo CD UI
- Argo CD CLI
- jq
- YAML labels

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD application API types in upstream source: https://github.com/argoproj/argo-cd/blob/master/pkg/apis/application/v1alpha1/types.go
- Argo CD UI status icon and color source: https://github.com/argoproj/argo-cd/blob/master/ui/src/app/applications/components/utils.tsx
- Argo CD UI color constants: https://github.com/argoproj/argo-cd/blob/master/ui/src/app/shared/components/colors.ts
- Kubernetes Deployment documentation for `progressDeadlineSeconds`: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The sync icon mapping described `OutOfSync` as circular arrows and `Unknown` as a question mark. Updated these to match the current Argo CD UI source: `OutOfSync` uses an up arrow in a circle, and `Unknown` uses a grey spinning circle.
- The health icon colors described `Progressing` as yellow and `Suspended` as blue. Updated these to blue and purple respectively, matching Argo CD UI color constants.
- The `Missing` health icon was described as a warning triangle. Updated it to a generic missing-resource icon to avoid naming an incorrect UI icon.
- The resource tree section claimed node border colors encode combined health and sync state. Updated it to describe the actual UI model more generally: resource tree nodes display health and sync icons, while application list color bars follow health status.
- The sync operation status table described a yellow clock as a normal pending sync icon. Updated the operation icon table to match the current application operation phase UI: blue spinning circle for non-terminal operation states, green check for success, and red X for failure or error.
- The operation state table omitted supported operation phases. Added `Error`, `Pending`, `Waiting`, and `Progressing` alongside the existing phases.
- The sync wave explanation said earlier waves must be healthy before later waves begin. Refined the wording to match Argo CD's documented algorithm: it applies the first wave with out-of-sync or unhealthy resources and repeats until all phases and waves are in sync and healthy.
- The practical scenario for progressing applications called the status "Yellow Spinning" and said it would turn red after `progressDeadlineSeconds`. Updated the heading to "Blue Spinning" and clarified that Kubernetes Deployments surface failed progress through `ProgressDeadlineExceeded`, which Argo CD can report as Degraded.

## Review Notes
The CLI examples use supported `argocd app get` and `argocd app list` output flags. The local environment did not have a usable `argocd` CLI available, so command validation was performed against the official Argo CD command reference.
