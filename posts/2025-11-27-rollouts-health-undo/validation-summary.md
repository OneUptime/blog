# Validation Summary: How to Roll Out a Change, Watch Health Checks, and Undo a Bad Deploy

## Status
validated

## Post Type
Tutorial / Guide (operational playbook for Kubernetes deployments)

## Technologies Covered
- Kubernetes Deployments
- `kubectl` CLI (set image, apply, rollout status/pause/resume/undo/history, annotate, get, describe)
- Kubernetes RollingUpdate strategy (maxSurge, maxUnavailable)
- Readiness / liveness probes
- ReplicaSets and revision history

## Sources Consulted
- Kubernetes Deployments documentation — https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- `kubectl rollout` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Rolling update strategy / maxSurge & maxUnavailable — https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment
- Deployment revisionHistoryLimit — https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#clean-up-policy
- Recording change cause via `kubernetes.io/change-cause` annotation — https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#checking-rollout-history-of-a-deployment

## Issues Found
No technical issues found.

All commands, flags, and YAML field names were verified against current Kubernetes documentation:
- `RollingUpdate` with `maxSurge: 1` and `maxUnavailable: 0` is the canonical zero-downtime configuration; the explanation that old Pods stay running until replacements are Ready is accurate.
- `kubectl set image`, `kubectl apply -f`, and the `kubectl rollout status/pause/resume/undo/history` subcommands are all correct and non-deprecated.
- The `--watch`, `--to-revision`, and `--timeout` flags are valid for their respective commands.
- `kubectl rollout status` exit codes (0 on success, non-zero on failure/timeout) are correctly described, making the CI/CD usage valid.
- The `kubernetes.io/change-cause` annotation key is correct and appears in `rollout history` output.
- `revisionHistoryLimit` defaults to 10, as stated.

## Review Notes
- `--watch` on `kubectl rollout status` is the default behavior (it watches/blocks unless `--watch=false` is passed), so the flag is harmless but technically redundant. Not an error.
- `kubectl get endpoints` still works, though Kubernetes increasingly favors EndpointSlices (`kubectl get endpointslices`). The Endpoints API remains valid for the described smoke-check purpose; no change needed.
- For change-cause to be reliably recorded, the annotation should be applied at deploy time (or `--record` historically, now deprecated); the post's manual `kubectl annotate` approach is the current recommended pattern. Accurate as written.
