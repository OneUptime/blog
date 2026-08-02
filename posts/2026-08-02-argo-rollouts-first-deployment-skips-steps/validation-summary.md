# Validation Summary: Why Argo Rollouts Skips Canary or Blue-Green Steps on the First Deployment

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Argo Rollouts
- Kubernetes custom resources and ReplicaSets
- Canary deployments
- Blue-green deployments
- AnalysisRuns and progressive delivery
- Argo Rollouts kubectl plugin
- `kubectl patch`
- YAML

## Sources Consulted

- [Argo Rollouts v1.9.1 release](https://github.com/argoproj/argo-rollouts/releases/tag/v1.9.1)
- [Argo Rollouts: Getting Started](https://argo-rollouts.readthedocs.io/en/stable/getting-started/)
- [Argo Rollouts: Rollout Specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/)
- [Argo Rollouts FAQ](https://argo-rollouts.readthedocs.io/en/stable/FAQ/)
- [Argo Rollouts: Canary Strategy](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
- [Argo Rollouts: Blue-Green Strategy](https://argo-rollouts.readthedocs.io/en/stable/features/bluegreen/)
- [Argo Rollouts: Analysis and Progressive Delivery](https://argo-rollouts.readthedocs.io/en/stable/features/analysis/)
- [Argo Rollouts: Rollback Windows](https://argo-rollouts.readthedocs.io/en/stable/features/rollback/)
- [Argo Rollouts CLI: Set Image](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_set_image/)
- [Argo Rollouts CLI: Get Rollout](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_get_rollout/)
- [Kubernetes: `kubectl patch`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/)

## Issues Found

- The manifest and `set image` command used `registry.example.com` placeholder images. Those images are not publicly pullable, so a normal cluster could not make the baseline healthy or exercise the described second-revision path. Replaced them with `argoproj/rollouts-demo:blue` and `argoproj/rollouts-demo:yellow`, the public images used by the official Argo Rollouts examples, and updated the adjacent prose accordingly.

## Review Notes

- The post was reviewed against Argo Rollouts v1.9.1, the current release on the validation date. The `argoproj.io/v1alpha1` Rollout API remains current.
- The Rollout manifest passes `kubectl-argo-rollouts lint` with v1.9.1. The `set image` and `get rollout --watch` forms match the v1.9.1 CLI help and generated command references.
- The YAML JSON merge patch was applied locally with `kubectl` v1.34.1 and correctly adds `.spec.template.metadata.annotations.rollout-test`, which changes the pod template and therefore creates a new ReplicaSet.
- Initial-deployment skipping, pause status, analysis timing, abort behavior, stable-manifest fast-tracking, and `rollbackWindow` behavior agree with the v1.9.1 documentation and controller tests.
