# Validation Summary: Argo Rollouts Abort vs. Rollback: What Happens to Pods, Traffic, and Git?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Argo Rollouts
- Kubernetes
- Argo CD
- Git and GitOps
- Canary deployments
- Blue-green deployments
- Helm and Kustomize

## Sources Consulted

- [Argo Rollouts: Abort command](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_abort/)
- [Argo Rollouts: Undo command](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_undo/)
- [Argo Rollouts: Getting Started — Aborting a Rollout](https://argo-rollouts.readthedocs.io/en/stable/getting-started/)
- [Argo Rollouts FAQ: rollbacks, Git, Argo CD, and blue-green rollback](https://argo-rollouts.readthedocs.io/en/stable/FAQ/)
- [Argo Rollouts: Scaledown New ReplicaSet on Aborted Rollout](https://argo-rollouts.readthedocs.io/en/stable/features/scaledown-aborted-rs/)
- [Argo Rollouts: Rollback Windows](https://argo-rollouts.readthedocs.io/en/stable/features/rollback/)
- [Argo Rollouts: Canary strategy](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
- [Argo Rollouts: Blue-green strategy](https://argo-rollouts.readthedocs.io/en/stable/features/bluegreen/)
- [Argo Rollouts: Rollout specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/)
- [Argo Rollouts upstream source repository](https://github.com/argoproj/argo-rollouts) (current main checkout at commit `62aa6d9241cd04eace6a8b9ee191e730152df162`)
- [Argo CD: Automated Sync Policy](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)
- [Kubernetes: Images](https://kubernetes.io/docs/concepts/containers/images/)
- [Kubernetes: Labels and Selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#label-selectors)
- [Kubernetes: JSONPath Support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Git: git-revert documentation](https://git-scm.com/docs/git-revert.html)

## Issues Found

- The opening used “rollback” generically even though the post specifically defines a desired-state operation. Changed it to “declarative rollback” so it is not confused with Argo Rollouts documentation that also uses rollback for the controller's operational return to stable.
- The abort description said canary traffic returns to stable. Changed this to managed production traffic because canary or preview Services can still address the rejected ReplicaSet even after the production route returns to stable.
- The scaling description did not account for `abortScaleDownDelaySeconds: 0`, which disables scale-down and can retain an aborted canary or preview ReplicaSet indefinitely. Clarified the blue-green and traffic-routed canary behavior and distinguished basic canary scaling.
- The GitOps sequence implied that Argo CD always syncs a pushed revert automatically. Clarified that automatic application requires automated sync; otherwise an operator or external system must trigger the sync.
- The comparison table implied that aborted canary or preview pods are always stopped or eventually scaled down. Updated it to cover immediate scale-down, delayed scale-down, and indefinite retention according to strategy and configuration.
- The comparison table said every declarative rollback changes Git, conflicting with the documented non-GitOps path. Clarified that Git changes in a GitOps workflow and is otherwise not involved.
- The AnalysisRun check hard-coded the `payments` namespace while the other commands used the current namespace. Removed the namespace override so all commands consistently operate in the current namespace.

## Review Notes

- The commands and flags for `abort`, `get rollout --watch`, and `undo --to-revision` are current and valid.
- The `rollouts-pod-template-hash` label selector is valid for AnalysisRuns created by a Rollout; a bare label selector matches resources on which that label exists.
- The `Healthy` condition JSONPath is valid, and its status is serialized as `True` or `False`.
- No Argo Rollouts version is pinned. The reviewed fields and behavior are present in the current stable documentation; rollback windows are documented as available since Argo Rollouts v1.4.
