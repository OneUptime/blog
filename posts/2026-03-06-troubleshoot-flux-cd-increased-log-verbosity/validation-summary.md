# Validation Summary: How to Troubleshoot Flux CD with Increased Log Verbosity

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes
- kubectl
- Kustomize JSON patches
- jq

## Sources Consulted
- Flux logs documentation: https://fluxcd.io/flux/monitoring/logs/
- Flux bootstrap CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux bootstrap GitHub CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux logs CLI documentation: https://fluxcd.io/flux/cmd/flux_logs/
- Flux events CLI documentation: https://fluxcd.io/flux/cmd/flux_events/
- Flux runtime logger source: https://raw.githubusercontent.com/fluxcd/pkg/main/runtime/logger/logger.go
- Kubernetes kubectl logs documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl rollout documentation: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes kubectl get documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get

## Issues Found
- The post described Flux controller logging as numeric verbosity levels. Flux controller flags use string levels such as `error`, `info`, `debug`, and, in the controller logger package, `trace`. Updated the explanation to use supported string log levels.
- The "flux CLI to set log level at runtime" section did not set runtime log levels and Flux CLI documentation does not provide a runtime log-level setter. Reworked the section to show the supported `flux logs` command for querying and filtering logs.
- The log filtering example searched for a `warn` JSON level. Flux's documented common levels are `debug`, `info`, and `error`, with `trace` supported by the logger package. Updated the example to filter errors only.
- The "numeric levels" section incorrectly referred to numeric verbosity arguments. Updated it to demonstrate `--log-level=trace` with `--log-encoding=json`.
- The events section claimed event detail could be increased, but the listed commands only inspect events. Updated the wording and examples to use the supported `flux events` command.
- The revert command removed a hard-coded Deployment argument index, which is brittle and can remove the wrong argument. Replaced it with `kubectl rollout undo` for direct patch rollback.
- The `jq` reconciliation-duration example assumed an exact message and a `duration` field that Flux documentation does not guarantee. Updated it to match reconciliation-finished messages and print the message.

## Review Notes
The Flux `flux logs` and `flux events` commands are documented as preview commands, so future Flux releases may adjust their behavior or flags. The direct `kubectl patch` examples are suitable for temporary troubleshooting, but GitOps-managed clusters should prefer committing the kustomization patch so Flux does not later overwrite manual changes.
