# Validation Summary: How to View Flux CD Logs with flux logs Command

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes
- kubectl logs
- GitOps controller logging

## Sources Consulted
- Flux CLI reference for `flux logs`: https://fluxcd.io/flux/cmd/flux_logs/
- Flux monitoring logs documentation: https://fluxcd.io/flux/monitoring/logs/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post described `flux logs` with no flags as showing logs from all Flux CD controllers. The official CLI reference shows that `--all-namespaces` is used for logs across all Flux custom resources, while the inherited `--namespace` default is `flux-system`. Updated the basic usage text and added the `flux logs --all-namespaces` example for cluster-wide Flux custom resource logs.
- The post said `--level=info` shows "info-level and above." The official CLI documents `--level` as one of `debug`, `info`, or `error`, not as a threshold-style selector. Updated the wording to "Show info-level logs."
- The combined-filter example said "all logs for GitRepository resources" without using `--all-namespaces`. Added `--all-namespaces` so the command matches the description.
- The export section described `flux logs --since=1h 2>&1 | tee flux-debug.log` as saving logs in a parseable format. `tee` only writes the formatted output to a file while printing it. Updated the wording accordingly.

## Review Notes
The Flux CLI documentation marks `flux logs` as preview and under development, so examples should be periodically rechecked against the current Flux CLI reference.
