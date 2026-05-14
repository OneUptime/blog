# Validation Summary: How to Map ArgoCD Resource Hooks to Flux Pre/Post Jobs

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Argo CD resource hooks
- Flux CD Kustomizations
- Kubernetes Jobs
- Kustomize
- GitOps deployment ordering

## Sources Consulted
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux running pre and post-deployment jobs documentation: https://fluxcd.io/flux/use-cases/running-jobs/
- Flux suspend kustomization CLI documentation: https://fluxcd.io/flux/cmd/flux_suspend_kustomization/
- Flux resume kustomization CLI documentation: https://fluxcd.io/flux/cmd/flux_resume_kustomization/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes automatic cleanup for finished Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/

## Issues Found
- The application Kustomization in the Flux pre-deployment example did not wait for application resources to become healthy. This made the later PostSync-equivalent smoke-test Kustomization less accurate, because Flux `dependsOn` waits on the dependency Kustomization's Ready condition. Added `wait: true` and `timeout: 5m` to the application Kustomization so dependent post-deployment Jobs run after the application rollout is healthy.
- The Flux-managed migration Job used `ttlSecondsAfterFinished`, and the best practices recommended TTL cleanup for Jobs. Kubernetes TTL deletes finished Jobs, while Flux periodically reconciles desired resources from Git and corrects drift. For one-shot Jobs that remain in Flux source, this can cause a completed migration Job to be recreated and run again. Removed TTL from the Flux Job example and changed the guidance to avoid TTL unless duplicate execution is safe or the Job is removed, suspended, or updated after completion.
- The text said Flux "achieves" Argo CD sync windows by suspending Kustomizations. Flux suspend is a valid operational pattern, but it is not a native sync-window equivalent. Reworded this as a common Flux approach.

## Review Notes
- The Argo CD hook annotations, hook delete policy, and PreSync/PostSync explanations match the official Argo CD resource hooks documentation.
- The Flux `dependsOn`, `healthChecks`, `wait`, `timeout`, `suspend`, and `resume` usage is valid for current Flux Kustomization APIs.
- The Kubernetes Job examples use current `batch/v1` APIs and valid Job fields. For production Flux Job workflows, Flux also documents `spec.force: true` as an option when immutable Job fields such as the pod template need to change and the same Job name is retained.
