# Validation Summary: Promote, Abort, Retry, or Restart? Argo Rollouts Operations Explained

## Status
validated

## Post Type
Operations guide and command reference

## Technologies Covered
- Argo Rollouts
- Argo Rollouts kubectl plugin
- Kubernetes Rollout custom resources
- Kubernetes ReplicaSets and Pods
- Canary deployments and traffic routing
- Blue-green deployments and Services
- AnalysisRuns and Experiments
- PodDisruptionBudgets
- GitOps operations

## Sources Consulted
- [Argo Rollouts v1.9.1 release](https://github.com/argoproj/argo-rollouts/releases/tag/v1.9.1)
- [Argo Rollouts kubectl plugin commands](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts/)
- [Get rollout command](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_get_rollout/)
- [Promote command](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_promote/)
- [Abort command](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_abort/)
- [Retry command](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_retry/)
- [Retry rollout command](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_retry_rollout/)
- [Restart command](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_restart/)
- [Restarting Rollout Pods](https://argo-rollouts.readthedocs.io/en/stable/features/restart/)
- [Rollout specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/)
- [Scaling down an aborted Rollout's new ReplicaSet](https://argo-rollouts.readthedocs.io/en/stable/features/scaledown-aborted-rs/)
- [Analysis and progressive delivery](https://argo-rollouts.readthedocs.io/en/stable/features/analysis/)

## Issues Found
- The abort explanation said a canary shifts both traffic and replicas away from the new revision. That was too broad for traffic-routed canaries because `abortScaleDownDelaySeconds` can delay scaling down the canary ReplicaSet or preserve it indefinitely when set to `0`, and `dynamicStableScale` also affects replica recovery. The text now distinguishes routed-traffic rollback from the replica rollback performed by a basic canary.
- The restart explanation could be read as saying Argo Rollouts adds a timestamp to the pod template without creating a revision. In fact, the command sets `.spec.restartAt`, which is outside `.spec.template`; the controller then evicts old pods and lets their existing ReplicaSets replace them. The text now states this directly and correctly explains why no new ReplicaSet or Rollout revision is created.

## Review Notes
The commands and flags were verified against the stable official documentation and the current Argo Rollouts v1.9.1 release. `promote --full`, `retry rollout`, and `restart --in 10m` are current and correctly formed. Restart behavior, including ReplicaSet iteration, `maxUnavailable`, lack of `maxSurge`, PodDisruptionBudget-aware eviction, single-replica downtime, and cancellation on a pod-template change, matches the official documentation. The post does not pin an Argo Rollouts version, so its stable documentation links will track future releases and should be rechecked if command semantics change.
