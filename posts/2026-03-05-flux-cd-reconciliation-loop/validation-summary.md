# Validation Summary: How Flux CD Reconciliation Loop Works Step by Step

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Kubernetes controllers and reconciliation
- Flux source-controller
- Flux kustomize-controller
- Flux helm-controller
- Flux notification-controller
- Kubernetes server-side apply
- Kustomize
- GitOps

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification-controller documentation: https://fluxcd.io/flux/components/notification/
- Flux CLI documentation for `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux 2.8 release notes for current HelmRelease SSA and health-check behavior: https://fluxcd.io/blog/2026/02/flux-v2.8.0/

## Issues Found
- The post said every Flux resource has `spec.interval`. Changed this to refer to Flux resources that reconcile external or cluster state, such as `GitRepository`, `Kustomization`, and `HelmRelease`, because notification resources like `Alert` do not use `spec.interval` the same way.
- The post described `spec.interval` as the minimum time between reconciliation starts. Changed this to match Flux documentation: after a successful reconciliation, the controller requeues the object after the configured interval, with possible jitter and event-driven reconciliations outside the interval.
- The source-controller section described Git operations as `git clone` or `git pull` and said the artifact revision is always the latest commit SHA. Changed this to describe resolving the configured Git reference and reporting a revision such as `main@sha1:<commit>`, which also covers tags, commits, and semantic version ranges.
- The artifact storage wording said "local storage." Changed it to "controller's artifact storage" and noted that GitRepository artifacts are gzip-compressed tar archives.
- The dependent controller section was made less absolute by saying controllers can detect Source artifact changes through watches, while also reconciling on their own interval.
- The manifest build section said Flux collects YAML files when no `kustomization.yaml` exists. Changed this to say Flux generates a `kustomization.yaml` for plain YAML files, matching the Kustomization API behavior.
- The server-side apply section overclaimed that Flux only manages fields it has set and leaves all other fields untouched. Changed this to describe server-side apply dry-run drift detection and note that Flux field-management behavior depends on SSA policies such as `Override` and `Merge`.
- The apply section claimed failures on one resource do not prevent others from being applied. Changed this to the safer documented behavior that resources are applied individually and reconciliation reports failure when an apply operation cannot complete.
- The health-check section implied health checks always run after apply. Changed this to say health checks run when `spec.wait` is enabled or `spec.healthChecks` is configured.
- The custom resource health-check wording implied custom resources only need a `Ready: True` condition. Changed this to include built-in kstatus rules and configured CEL health check expressions.
- The health-check YAML example combined `wait: true` with `healthChecks`, but Flux ignores `healthChecks` when `wait` is enabled. Removed the conflicting `healthChecks` block.
- The status example included a successful `Healthy` condition. Current Flux Kustomization documentation centers successful reconciliation on the `Ready` condition, with health failures reflected in failure conditions. Removed the successful `Healthy` example.
- The forced reconciliation section said a `kubectl annotate` command is equivalent to `flux reconcile kustomization`. Changed this to clarify that annotation queues reconciliation without waiting for completion, while the Flux CLI command triggers reconciliation and waits.

## Review Notes
The local `flux` CLI was not installed in the review environment, so CLI command behavior was verified against the official Flux CLI documentation instead of local `--help` output.
